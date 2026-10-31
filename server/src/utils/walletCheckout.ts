import { query } from '../config/db.js'
import { sendTicketBatchEmail } from './ticketEmail.js'
import { recordCaptainCommissionsForCheckout } from './captainCommissions.js'
import { reportMetaPurchase, saveMetaContext, type MetaBrowserContext } from './metaConversions.js'
import { commitHolds, createPendingMpesaTx, holdCredit, poolDb, releaseHolds, roundKes, withWallet } from './wallet.js'
import { startMpesaForTx } from './walletMpesa.js'

export class WalletCheckoutError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

const BATCH_ROWS_SQL = `
  SELECT t.id, t.user_id, t.payment_status, t.checkout_request_id,
         COALESCE(t.unit_price, ett.price, e.price)::float AS price,
         e.title AS event_title, (e.event_date >= CURRENT_DATE) AS upcoming, e.cancelled_at
  FROM tickets t
  JOIN events e ON e.id = t.event_id
  LEFT JOIN event_ticket_types ett ON ett.id = t.ticket_type_id
  WHERE t.purchase_batch_id = $1
  FOR UPDATE OF t`

export type CreditCheckoutResult =
  | { status: 'paid'; references: string[]; total: number; creditUsed: number }
  | {
      status: 'mpesa'
      checkoutRequestId: string
      customerMessage?: string
      total: number
      creditUsed: number
      mpesaAmount: number
    }

interface Batch {
  id: string
  total: number
  count: number
  title: string
}

/**
 * Pays one or more pending ticket bookings, using the member's ticket value first (oldest credit first)
 * and M-Pesa for any difference. Either every booking is paid or none is: when M-Pesa is needed the
 * credit stays held until the payment confirms, and is released if it fails.
 */
export async function payBatchesWithCredit(
  userId: string,
  opts: { batchIds: string[]; useCredit?: boolean; phone?: string | null; context?: MetaBrowserContext }
): Promise<CreditCheckoutResult> {
  const uniqueIds = [...new Set(opts.batchIds.filter((id) => typeof id === 'string' && id))]
  if (uniqueIds.length === 0) throw new WalletCheckoutError('Choose at least one booking to pay for')
  if (uniqueIds.length > 20) throw new WalletCheckoutError('You can pay for at most 20 bookings at once')
  const useCredit = opts.useCredit !== false

  const prepared = await withWallet(userId, async (client) => {
    const batches: Batch[] = []
    for (const batchId of uniqueIds) {
      const rows = (await client.query(BATCH_ROWS_SQL, [batchId])).rows
      if (rows.length === 0 || rows.some((r) => r.user_id !== userId)) {
        throw new WalletCheckoutError('Booking not found', 404)
      }
      if (rows.some((r) => r.payment_status !== 'pending')) {
        throw new WalletCheckoutError(`Tickets for ${rows[0].event_title} are no longer awaiting payment`, 409)
      }
      if (rows.some((r) => r.checkout_request_id)) {
        throw new WalletCheckoutError(
          `An M-Pesa payment was already started for ${rows[0].event_title}. Complete it or book again.`,
          409
        )
      }
      if (!rows[0].upcoming || rows[0].cancelled_at) {
        throw new WalletCheckoutError(`${rows[0].event_title} is no longer open for booking`, 409)
      }
      batches.push({
        id: batchId,
        total: roundKes(rows.reduce((sum, r) => sum + Number(r.price || 0), 0)),
        count: rows.length,
        title: rows[0].event_title,
      })
    }
    const total = roundKes(batches.reduce((sum, b) => sum + b.total, 0))

    let creditUsed = 0
    if (useCredit) {
      for (const batch of batches) {
        const hold = await holdCredit(client, userId, { maxAmount: batch.total, purchaseBatchId: batch.id })
        creditUsed = roundKes(creditUsed + hold.held)
        if (hold.regionId) {
          await client.query(`UPDATE tickets SET referral_region_id = $2 WHERE purchase_batch_id = $1`, [
            batch.id,
            hold.regionId,
          ])
        }
      }
    }
    const mpesaAmount = roundKes(total - creditUsed)

    if (mpesaAmount <= 0) {
      const references: string[] = []
      for (const batch of batches) {
        const spent = await commitHolds(client, userId, { purchaseBatchId: batch.id }, {
          note: describe([batch]),
          referenceType: 'ticket_batch',
          referenceId: batch.id,
        })
        const reference = spent.txId ? `WALLET-${spent.txId}` : `WALLET-FREE-${batch.id}`
        await client.query(
          `UPDATE tickets SET payment_status = 'paid', payment_provider = 'credit', checkout_request_id = $1
           WHERE purchase_batch_id = $2`,
          [reference, batch.id]
        )
        references.push(reference)
      }
      return { kind: 'paid' as const, references, total, creditUsed }
    }

    if (!opts.phone) throw new WalletCheckoutError('Enter your M-Pesa number to pay the rest')
    const txId = await createPendingMpesaTx(client, userId, {
      type: 'ticket_payment_mpesa',
      mpesaAmount,
      phone: opts.phone,
      referenceType: 'ticket_batch',
      referenceId: uniqueIds.length === 1 ? uniqueIds[0] : null,
      note: describe(batches),
    })
    await client.query(
      `UPDATE ticket_credit_uses SET payment_tx_id = $1
       WHERE purchase_batch_id = ANY($2::uuid[]) AND status = 'held' AND payment_tx_id IS NULL`,
      [txId, uniqueIds]
    )
    return { kind: 'mpesa' as const, txId, total, creditUsed, mpesaAmount }
  })

  if (prepared.kind === 'paid') {
    for (const reference of prepared.references) {
      await recordCaptainCommissionsForCheckout(reference)
      reportMetaPurchase(reference, opts.context)
      sendTicketBatchEmail(reference).catch((error: Error) => {
        console.error(`Error sending ticket email for ${reference}: ${error.message}`)
      })
    }
    return { status: 'paid', references: prepared.references, total: prepared.total, creditUsed: prepared.creditUsed }
  }

  let stk
  try {
    stk = await startMpesaForTx(prepared.txId, opts.phone!, prepared.mpesaAmount, `WALLET-${prepared.txId}`)
  } catch (error) {
    await releaseHolds(poolDb, { paymentTxId: prepared.txId })
    throw error
  }
  await query(
    `UPDATE tickets SET checkout_request_id = $1, payment_provider = 'mpesa'
     WHERE purchase_batch_id = ANY($2::uuid[]) AND payment_status = 'pending'`,
    [stk.checkoutRequestId, uniqueIds]
  )
  if (opts.context) await saveMetaContext(stk.checkoutRequestId, opts.context)
  return {
    status: 'mpesa',
    checkoutRequestId: stk.checkoutRequestId,
    customerMessage: stk.customerMessage,
    total: prepared.total,
    creditUsed: prepared.creditUsed,
    mpesaAmount: prepared.mpesaAmount,
  }
}

function describe(batches: Batch[]): string {
  if (batches.length === 1) {
    const b = batches[0]
    return `${b.count} ticket${b.count === 1 ? '' : 's'} for ${b.title}`
  }
  return `Tickets for ${batches.map((b) => b.title).join(', ')}`
}

/**
 * Settles a confirmed M-Pesa payment for tickets part-paid with credit: spends the held credit and
 * marks the tickets paid. Returns the number of tickets newly marked paid (plus 1 if only the ledger settled).
 */
export async function settleCreditTicketPayment(checkoutRequestId: string, mpesaReceipt: string | null): Promise<number> {
  const pending = await query(
    `SELECT id, user_id FROM wallet_transactions
     WHERE checkout_request_id = $1 AND type = 'ticket_payment_mpesa' AND status = 'pending'`,
    [checkoutRequestId]
  )
  let settled = 0
  for (const row of pending.rows as { id: string; user_id: string }[]) {
    settled += await withWallet(row.user_id, async (client) => {
      const tx = await client.query(
        `SELECT note FROM wallet_transactions WHERE id = $1 AND status = 'pending' FOR UPDATE`,
        [row.id]
      )
      if (tx.rows.length === 0) return 0
      // A hold released as abandoned before M-Pesa confirmed is taken again, as far as credit allows.
      const lapsed = await client.query(
        `SELECT COALESCE(SUM(amount), 0)::float AS amount FROM ticket_credit_uses
         WHERE payment_tx_id = $1 AND status = 'released'`,
        [row.id]
      )
      const lapsedAmount = Number(lapsed.rows[0]?.amount ?? 0)
      if (lapsedAmount > 0) {
        await client.query(`UPDATE ticket_credit_uses SET status = 'lapsed' WHERE payment_tx_id = $1 AND status = 'released'`, [
          row.id,
        ])
        await holdCredit(client, row.user_id, { maxAmount: lapsedAmount, paymentTxId: row.id })
      }
      await commitHolds(client, row.user_id, { paymentTxId: row.id }, {
        note: tx.rows[0].note ?? 'Event tickets',
        referenceType: 'wallet_transaction',
        referenceId: row.id,
      })
      await client.query(
        `UPDATE wallet_transactions SET status = 'completed', mpesa_receipt = COALESCE($2, mpesa_receipt) WHERE id = $1`,
        [row.id, mpesaReceipt]
      )
      const paid = await client.query(
        `UPDATE tickets SET payment_status = 'paid', mpesa_receipt = COALESCE($2, mpesa_receipt)
         WHERE checkout_request_id = $1 AND payment_status IN ('pending', 'failed')`,
        [checkoutRequestId, mpesaReceipt]
      )
      return Math.max(1, paid.rowCount || 0)
    })
  }
  return settled
}

/** Ticket bookings the member created but has not paid for yet. */
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
       AND t.purchase_batch_id IS NOT NULL AND e.event_date >= CURRENT_DATE AND e.cancelled_at IS NULL
     GROUP BY t.purchase_batch_id, e.id
     ORDER BY e.event_date ASC`,
    [userId]
  )
  return result.rows
}
