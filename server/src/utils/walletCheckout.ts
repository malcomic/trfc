import { query } from '../config/db.js'
import { InsufficientFundsError, applyEntry, roundKes, withWallet } from './wallet.js'
import { sendTicketBatchEmail } from './ticketEmail.js'
import { recordCaptainCommissionsForCheckout } from './captainCommissions.js'
import { reportMetaPurchase, type MetaBrowserContext } from './metaConversions.js'

export class WalletCheckoutError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

const BATCH_ROWS_SQL = `
  SELECT t.id, t.user_id, t.payment_status, t.checkout_request_id,
         COALESCE(t.unit_price, ett.price, e.price)::float AS price,
         e.title AS event_title, (e.event_date >= CURRENT_DATE) AS upcoming
  FROM tickets t
  JOIN events e ON e.id = t.event_id
  LEFT JOIN event_ticket_types ett ON ett.id = t.ticket_type_id
  WHERE t.purchase_batch_id = $1
  FOR UPDATE OF t`

export interface WalletCheckoutResult {
  references: string[]
  total: number
  balance: number
}

/**
 * Pays one or more pending ticket batches from the member's wallet in a single transaction.
 * Either every batch is paid or none is.
 */
export async function payBatchesFromWallet(
  userId: string,
  batchIds: string[],
  context?: MetaBrowserContext
): Promise<WalletCheckoutResult> {
  const uniqueIds = [...new Set(batchIds.filter((id) => typeof id === 'string' && id))]
  if (uniqueIds.length === 0) throw new WalletCheckoutError('Choose at least one booking to pay for')
  if (uniqueIds.length > 20) throw new WalletCheckoutError('You can pay for at most 20 bookings at once')

  const result = await withWallet(userId, async (client, wallet) => {
    const batches: { id: string; total: number; count: number; title: string }[] = []
    for (const batchId of uniqueIds) {
      const rows = (await client.query(BATCH_ROWS_SQL, [batchId])).rows
      if (rows.length === 0) throw new WalletCheckoutError('Booking not found', 404)
      if (rows.some((r) => r.user_id !== userId)) throw new WalletCheckoutError('Booking not found', 404)
      if (rows.some((r) => r.payment_status !== 'pending')) {
        throw new WalletCheckoutError(`Tickets for ${rows[0].event_title} are no longer awaiting payment`, 409)
      }
      if (rows.some((r) => r.checkout_request_id)) {
        throw new WalletCheckoutError(
          `An M-Pesa payment was already started for ${rows[0].event_title}. Complete it or book again.`,
          409
        )
      }
      if (!rows[0].upcoming) throw new WalletCheckoutError(`${rows[0].event_title} has already taken place`, 409)
      batches.push({
        id: batchId,
        total: roundKes(rows.reduce((sum, r) => sum + Number(r.price || 0), 0)),
        count: rows.length,
        title: rows[0].event_title,
      })
    }

    const total = roundKes(batches.reduce((sum, b) => sum + b.total, 0))
    if (total > wallet.balance) throw new InsufficientFundsError(wallet.balance, total)

    const references: string[] = []
    let balance = wallet.balance
    for (const batch of batches) {
      let reference: string
      if (batch.total > 0) {
        const tx = await applyEntry(client, userId, {
          type: 'ticket_payment',
          amount: -batch.total,
          referenceType: 'ticket_batch',
          referenceId: batch.id,
          note: `${batch.count} ticket${batch.count === 1 ? '' : 's'} for ${batch.title}`,
        })
        reference = `WALLET-${tx.id}`
        balance = Number(tx.balance_after)
      } else {
        reference = `WALLET-FREE-${batch.id}`
      }
      await client.query(
        `UPDATE tickets SET payment_status = 'paid', payment_provider = 'wallet', checkout_request_id = $1
         WHERE purchase_batch_id = $2`,
        [reference, batch.id]
      )
      references.push(reference)
    }
    return { references, total, balance }
  })

  for (const reference of result.references) {
    await recordCaptainCommissionsForCheckout(reference)
    reportMetaPurchase(reference, context)
    sendTicketBatchEmail(reference).catch((error: Error) => {
      console.error(`Error sending ticket email for ${reference}: ${error.message}`)
    })
  }
  return result
}

/** Ticket bookings the member created but has not paid for yet, which the wallet can settle. */
export async function getPayableBatches(userId: string) {
  const result = await query(
    `SELECT t.purchase_batch_id, e.id AS event_id, e.title AS event_title, e.event_date, e.location,
            MIN(ett.name) AS ticket_type_name,
            COUNT(*)::int AS quantity,
            SUM(COALESCE(t.unit_price, ett.price, e.price))::float AS total,
            MIN(t.created_at) AS created_at
     FROM tickets t
     JOIN events e ON e.id = t.event_id
     LEFT JOIN event_ticket_types ett ON ett.id = t.ticket_type_id
     WHERE t.user_id = $1 AND t.payment_status = 'pending' AND t.checkout_request_id IS NULL
       AND t.purchase_batch_id IS NOT NULL AND e.event_date >= CURRENT_DATE
     GROUP BY t.purchase_batch_id, e.id
     ORDER BY e.event_date ASC`,
    [userId]
  )
  return result.rows
}
