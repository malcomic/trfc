import { query } from '../config/db.js'
import { sendTicketBatchEmail } from './ticketEmail.js'
import { sendMedalBatchEmail } from './medalEmail.js'
import { sendOrderConfirmationEmail } from './orderEmail.js'
import { decrementOrderStock } from './orderStock.js'
import {
  recordCaptainCommission,
  recordCaptainCommissionsForCheckout,
  recordCaptainCommissionsForMedalBatch,
} from './captainCommissions.js'
import { reportMetaPurchase, saveMetaContext, type MetaBrowserContext } from './metaConversions.js'
import { commitHolds, createPendingMpesaTx, holdCredit, poolDb, releaseHolds, roundKes, withWallet } from './wallet.js'
import { startMpesaForTx } from './walletMpesa.js'
import { appendRewardPoints, redeemRewardPoints } from './rewardLedger.js'
import { resolveRewardKes } from './rewardRedeem.js'
import type { PoolClient } from 'pg'

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
  opts: {
    batchIds: string[]
    useCredit?: boolean
    phone?: string | null
    context?: MetaBrowserContext
    rewardPoints?: number
  }
): Promise<CreditCheckoutResult> {
  const uniqueIds = [...new Set(opts.batchIds.filter((id) => typeof id === 'string' && id))]
  if (uniqueIds.length === 0) throw new WalletCheckoutError('Choose at least one booking to pay for')
  if (uniqueIds.length > 20) throw new WalletCheckoutError('You can pay for at most 20 bookings at once')
  const useCredit = opts.useCredit !== false
  const rewardSourceRef = `batch-redeem:${uniqueIds.slice().sort().join(',')}`

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
    const gross = roundKes(batches.reduce((sum, b) => sum + b.total, 0))
    const reward = await resolveRewardKes(Number(opts.rewardPoints) || 0, gross)
    if (reward.points > 0) {
      const err = await redeemRewardPoints(userId, reward.points, rewardSourceRef, client)
      if (err) throw new WalletCheckoutError(err, 400)
    }
    let rewardLeft = reward.kes
    for (const batch of batches) {
      const cut = Math.min(batch.total, rewardLeft)
      batch.total = roundKes(batch.total - cut)
      rewardLeft = roundKes(rewardLeft - cut)
    }
    const total = roundKes(batches.reduce((sum, b) => sum + b.total, 0))

    let creditUsed = 0
    if (useCredit && total > 0) {
      for (const batch of batches) {
        if (batch.total <= 0) continue
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
      return { kind: 'paid' as const, references, total, creditUsed, rewardPoints: reward.points }
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
    return { kind: 'mpesa' as const, txId, total, creditUsed, mpesaAmount, rewardPoints: reward.points, rewardSourceRef }
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
    if (prepared.rewardPoints > 0 && prepared.rewardSourceRef) {
      await appendRewardPoints({
        userId,
        points: prepared.rewardPoints,
        kind: 'adjustment',
        sourceRef: `reverse:${prepared.rewardSourceRef}`,
        reason: 'Payment start failed — restore reward points',
      }).catch(() => undefined)
    }
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

async function reholdLapsedCredit(client: PoolClient, userId: string, paymentTxId: string) {
  const lapsed = await client.query(
    `SELECT COALESCE(SUM(amount), 0)::float AS amount FROM ticket_credit_uses
     WHERE payment_tx_id = $1 AND status = 'released'`,
    [paymentTxId]
  )
  const lapsedAmount = Number(lapsed.rows[0]?.amount ?? 0)
  if (lapsedAmount > 0) {
    await client.query(`UPDATE ticket_credit_uses SET status = 'lapsed' WHERE payment_tx_id = $1 AND status = 'released'`, [
      paymentTxId,
    ])
    await holdCredit(client, userId, { maxAmount: lapsedAmount, paymentTxId })
  }
}

/**
 * Pays a pending shop order with ticket value first and M-Pesa for any difference.
 * `orders.total_amount` is already net of any member discount.
 */
export async function payOrderWithCredit(
  userId: string,
  opts: {
    orderId: string
    useCredit?: boolean
    phone?: string | null
    context?: MetaBrowserContext
    rewardPoints?: number
  }
): Promise<CreditCheckoutResult> {
  if (!opts.orderId) throw new WalletCheckoutError('Choose an order to pay for')
  const useCredit = opts.useCredit !== false
  const rewardSourceRef = `order-redeem:${opts.orderId}`

  const prepared = await withWallet(userId, async (client) => {
    const orderResult = await client.query(
      `SELECT id, user_id, payment_status, checkout_request_id, total_amount::float AS total_amount,
              COALESCE(reward_points_applied, 0)::int AS reward_points_applied
       FROM orders WHERE id = $1 FOR UPDATE`,
      [opts.orderId]
    )
    const order = orderResult.rows[0]
    if (!order || order.user_id !== userId) throw new WalletCheckoutError('Order not found', 404)
    if (order.payment_status !== 'pending') {
      throw new WalletCheckoutError('This order is no longer awaiting payment', 409)
    }
    if (order.checkout_request_id) {
      throw new WalletCheckoutError('An M-Pesa payment was already started for this order. Complete it or place a new order.', 409)
    }
    const gross = roundKes(Number(order.total_amount))
    if (!(gross > 0) && !(Number(opts.rewardPoints) > 0) && !(order.reward_points_applied > 0)) {
      throw new WalletCheckoutError('This order has nothing left to pay', 400)
    }

    let redeemedNow = 0
    let total = gross
    if (order.reward_points_applied > 0) {
      // Already deducted + redeemed on createOrder
      total = gross
    } else if (Number(opts.rewardPoints) > 0) {
      const reward = await resolveRewardKes(Number(opts.rewardPoints), gross)
      if (reward.points > 0) {
        const err = await redeemRewardPoints(userId, reward.points, rewardSourceRef, client)
        if (err) throw new WalletCheckoutError(err, 400)
        redeemedNow = reward.points
        total = roundKes(gross - reward.kes)
        await client.query(
          `UPDATE orders SET total_amount = $2, reward_points_applied = $3 WHERE id = $1`,
          [opts.orderId, total, redeemedNow]
        )
      }
    }

    let creditUsed = 0
    if (useCredit && total > 0) {
      const hold = await holdCredit(client, userId, { maxAmount: total, orderId: opts.orderId })
      creditUsed = hold.held
    }
    const mpesaAmount = roundKes(total - creditUsed)

    if (mpesaAmount <= 0) {
      const spent = await commitHolds(client, userId, { orderId: opts.orderId }, {
        note: 'Shop order',
        referenceType: 'order',
        referenceId: opts.orderId,
      })
      const reference = spent.txId ? `WALLET-${spent.txId}` : `WALLET-FREE-${opts.orderId}`
      await client.query(
        `UPDATE orders SET payment_status = 'paid', checkout_request_id = $1 WHERE id = $2`,
        [reference, opts.orderId]
      )
      return { kind: 'paid' as const, references: [reference], total, creditUsed, rewardPoints: redeemedNow }
    }

    if (!opts.phone) throw new WalletCheckoutError('Enter your M-Pesa number to pay the rest')
    const txId = await createPendingMpesaTx(client, userId, {
      type: 'order_payment_mpesa',
      mpesaAmount,
      phone: opts.phone,
      referenceType: 'order',
      referenceId: opts.orderId,
      note: 'Shop order',
    })
    await client.query(
      `UPDATE ticket_credit_uses SET payment_tx_id = $1
       WHERE order_id = $2 AND status = 'held' AND payment_tx_id IS NULL`,
      [txId, opts.orderId]
    )
    return {
      kind: 'mpesa' as const,
      txId,
      total,
      creditUsed,
      mpesaAmount,
      rewardPoints: redeemedNow,
      rewardSourceRef: redeemedNow > 0 ? rewardSourceRef : undefined,
    }
  })

  if (prepared.kind === 'paid') {
    await decrementOrderStock(opts.orderId)
    await recordCaptainCommission('order', opts.orderId)
    reportMetaPurchase(prepared.references[0], opts.context)
    sendOrderConfirmationEmail(opts.orderId).catch((error: Error) => {
      console.error(`Error sending order confirmation email for ${opts.orderId}: ${error.message}`)
    })
    return { status: 'paid', references: prepared.references, total: prepared.total, creditUsed: prepared.creditUsed }
  }

  let stk
  try {
    stk = await startMpesaForTx(prepared.txId, opts.phone!, prepared.mpesaAmount, `WALLET-${prepared.txId}`)
  } catch (error) {
    await releaseHolds(poolDb, { paymentTxId: prepared.txId })
    if (prepared.rewardPoints > 0 && prepared.rewardSourceRef) {
      await appendRewardPoints({
        userId,
        points: prepared.rewardPoints,
        kind: 'adjustment',
        sourceRef: `reverse:${prepared.rewardSourceRef}`,
        reason: 'Payment start failed — restore reward points',
      }).catch(() => undefined)
    }
    throw error
  }
  await query(
    `UPDATE orders SET checkout_request_id = $1 WHERE id = $2 AND payment_status = 'pending'`,
    [stk.checkoutRequestId, opts.orderId]
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

/**
 * Pays a pending medal purchase batch with ticket value first and M-Pesa for any difference.
 */
export async function payMedalBatchWithCredit(
  userId: string,
  opts: { medalBatchId: string; useCredit?: boolean; phone?: string | null; context?: MetaBrowserContext }
): Promise<CreditCheckoutResult> {
  if (!opts.medalBatchId) throw new WalletCheckoutError('Choose a medal purchase to pay for')
  const useCredit = opts.useCredit !== false

  const prepared = await withWallet(userId, async (client) => {
    const rows = (
      await client.query(
        `SELECT p.id, p.user_id, p.payment_status, p.checkout_request_id, o.price::float AS price,
                t.name AS tier_name
         FROM medal_purchases p
         JOIN medal_options o ON o.id = p.medal_option_id
         JOIN medal_tiers t ON t.id = o.tier_id
         WHERE p.purchase_batch_id = $1
         FOR UPDATE OF p`,
        [opts.medalBatchId]
      )
    ).rows
    if (rows.length === 0 || rows.some((r) => r.user_id !== userId)) {
      throw new WalletCheckoutError('Medal purchase not found', 404)
    }
    if (rows.some((r) => r.payment_status !== 'pending')) {
      throw new WalletCheckoutError('These medals are no longer awaiting payment', 409)
    }
    if (rows.some((r) => r.checkout_request_id)) {
      throw new WalletCheckoutError(
        'An M-Pesa payment was already started for these medals. Complete it or buy again.',
        409
      )
    }
    const total = roundKes(rows.reduce((sum, r) => sum + Number(r.price || 0), 0))
    const note = `${rows.length} medal${rows.length === 1 ? '' : 's'} — ${rows[0].tier_name}`

    let creditUsed = 0
    if (useCredit) {
      const hold = await holdCredit(client, userId, { maxAmount: total, medalBatchId: opts.medalBatchId })
      creditUsed = hold.held
    }
    const mpesaAmount = roundKes(total - creditUsed)

    if (mpesaAmount <= 0) {
      const spent = await commitHolds(client, userId, { medalBatchId: opts.medalBatchId }, {
        note,
        referenceType: 'medal_batch',
        referenceId: opts.medalBatchId,
      })
      const reference = spent.txId ? `WALLET-${spent.txId}` : `WALLET-FREE-${opts.medalBatchId}`
      await client.query(
        `UPDATE medal_purchases SET payment_status = 'paid', payment_provider = 'credit', checkout_request_id = $1
         WHERE purchase_batch_id = $2`,
        [reference, opts.medalBatchId]
      )
      return { kind: 'paid' as const, references: [reference], total, creditUsed }
    }

    if (!opts.phone) throw new WalletCheckoutError('Enter your M-Pesa number to pay the rest')
    const txId = await createPendingMpesaTx(client, userId, {
      type: 'medal_payment_mpesa',
      mpesaAmount,
      phone: opts.phone,
      referenceType: 'medal_batch',
      referenceId: opts.medalBatchId,
      note,
    })
    await client.query(
      `UPDATE ticket_credit_uses SET payment_tx_id = $1
       WHERE medal_batch_id = $2 AND status = 'held' AND payment_tx_id IS NULL`,
      [txId, opts.medalBatchId]
    )
    return { kind: 'mpesa' as const, txId, total, creditUsed, mpesaAmount }
  })

  if (prepared.kind === 'paid') {
    await recordCaptainCommissionsForMedalBatch(opts.medalBatchId)
    reportMetaPurchase(prepared.references[0], opts.context)
    sendMedalBatchEmail(prepared.references[0]).catch((error: Error) => {
      console.error(`Error sending medal email for ${prepared.references[0]}: ${error.message}`)
    })
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
    `UPDATE medal_purchases SET checkout_request_id = $1, payment_provider = 'mpesa'
     WHERE purchase_batch_id = $2 AND payment_status = 'pending'`,
    [stk.checkoutRequestId, opts.medalBatchId]
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

/** Settles M-Pesa remainder for a shop order part-paid with ticket value. */
export async function settleCreditOrderPayment(checkoutRequestId: string, mpesaReceipt: string | null): Promise<number> {
  const pending = await query(
    `SELECT id, user_id FROM wallet_transactions
     WHERE checkout_request_id = $1 AND type = 'order_payment_mpesa' AND status = 'pending'`,
    [checkoutRequestId]
  )
  let settled = 0
  for (const row of pending.rows as { id: string; user_id: string }[]) {
    const paidOrderIds = await withWallet(row.user_id, async (client) => {
      const tx = await client.query(
        `SELECT note FROM wallet_transactions WHERE id = $1 AND status = 'pending' FOR UPDATE`,
        [row.id]
      )
      if (tx.rows.length === 0) return [] as string[]
      await reholdLapsedCredit(client, row.user_id, row.id)
      await commitHolds(client, row.user_id, { paymentTxId: row.id }, {
        note: tx.rows[0].note ?? 'Shop order',
        referenceType: 'wallet_transaction',
        referenceId: row.id,
      })
      await client.query(
        `UPDATE wallet_transactions SET status = 'completed', mpesa_receipt = COALESCE($2, mpesa_receipt) WHERE id = $1`,
        [row.id, mpesaReceipt]
      )
      const paid = await client.query(
        `UPDATE orders SET payment_status = 'paid', mpesa_receipt = COALESCE($2, mpesa_receipt)
         WHERE checkout_request_id = $1 AND payment_status IN ('pending', 'failed')
         RETURNING id`,
        [checkoutRequestId, mpesaReceipt]
      )
      return (paid.rows as { id: string }[]).map((r) => r.id)
    })
    for (const orderId of paidOrderIds) {
      await decrementOrderStock(orderId)
    }
    if (paidOrderIds.length > 0 || settled === 0) settled += Math.max(1, paidOrderIds.length)
  }
  return settled
}

/** Settles M-Pesa remainder for a medal batch part-paid with ticket value. */
export async function settleCreditMedalPayment(checkoutRequestId: string, mpesaReceipt: string | null): Promise<number> {
  const pending = await query(
    `SELECT id, user_id FROM wallet_transactions
     WHERE checkout_request_id = $1 AND type = 'medal_payment_mpesa' AND status = 'pending'`,
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
      await reholdLapsedCredit(client, row.user_id, row.id)
      await commitHolds(client, row.user_id, { paymentTxId: row.id }, {
        note: tx.rows[0].note ?? 'Medals',
        referenceType: 'wallet_transaction',
        referenceId: row.id,
      })
      await client.query(
        `UPDATE wallet_transactions SET status = 'completed', mpesa_receipt = COALESCE($2, mpesa_receipt) WHERE id = $1`,
        [row.id, mpesaReceipt]
      )
      const paid = await client.query(
        `UPDATE medal_purchases SET payment_status = 'paid', mpesa_receipt = COALESCE($2, mpesa_receipt)
         WHERE checkout_request_id = $1 AND payment_status IN ('pending', 'failed')`,
        [checkoutRequestId, mpesaReceipt]
      )
      return Math.max(1, paid.rowCount || 0)
    })
  }
  return settled
}
