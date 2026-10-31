import type { PoolClient } from 'pg'
import { getClient, query } from '../config/db.js'
import { creditExpiry, daysLeft, getTicketRules, nairobiDay } from './ticketRules.js'

/**
 * Ticket credit ("ticket value"). TRFC never holds cash for members: value only comes from event tickets
 * a member did not use, can only be spent on event tickets, and lapses `creditDays` after the event.
 * Each credit is its own row in ticket_credits; wallet_transactions is the member-facing history.
 */

export type CreditReason =
  | 'no_show'
  | 'cancelled_early'
  | 'missed_deadline'
  | 'event_cancelled'
  | 'late_payment'
  | 'moved'
  | 'legacy'
  | 'admin'

export type WalletTxType =
  | 'credit_added'
  | 'credit_used'
  | 'credit_expired'
  | 'credit_voided'
  | 'ticket_payment_mpesa'
  | 'installment'
  // Older ledger rows, kept so history still renders.
  | 'topup'
  | 'ticket_payment'
  | 'cancellation_credit'
  | 'plan_expiry_credit'
  | 'adjustment'

export interface WalletTx {
  id: string
  user_id: string
  type: WalletTxType
  amount: number
  mpesa_amount: number | null
  balance_after: number | null
  status: 'pending' | 'completed' | 'failed'
  reference_type: string | null
  reference_id: string | null
  checkout_request_id: string | null
  mpesa_receipt: string | null
  note: string | null
  reason: CreditReason | null
  created_at: string
}

export interface TicketCredit {
  id: string
  reason: CreditReason
  amount: number
  remaining: number
  held: number
  available_from: string
  expires_at: string
  status: 'active' | 'used' | 'expired' | 'voided'
  event_title: string | null
  event_date: string | null
  days_left: number
  available: boolean
  created_at: string
}

export class CreditError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
    this.name = 'CreditError'
  }
}

export const roundKes = (value: number) => Math.round(value * 100) / 100

type Queryable = Pick<PoolClient, 'query'>

/** The pool as a Queryable, for helpers that may run outside a transaction. */
export const poolDb = { query } as unknown as Queryable

const TX_FIELDS = `t.id, t.user_id, t.type, t.amount::float AS amount, t.mpesa_amount::float AS mpesa_amount,
  t.balance_after::float AS balance_after, t.status, t.reference_type, t.reference_id, t.checkout_request_id,
  t.mpesa_receipt, t.note, t.created_at`

/**
 * Runs `fn` in a transaction holding the member's wallet row lock, so concurrent payments,
 * credits and cancellations for the same member are applied one at a time.
 */
export async function withWallet<T>(userId: string, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getClient()
  try {
    await client.query('BEGIN')
    await client.query('INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [userId])
    await client.query('SELECT user_id FROM wallets WHERE user_id = $1 FOR UPDATE', [userId])
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    throw error
  } finally {
    client.release()
  }
}

/** Recomputes the cached total on wallets (used by admin lists) and returns it. */
async function syncWalletTotal(db: Queryable, userId: string): Promise<number> {
  const result = await db.query(
    `UPDATE wallets SET balance = COALESCE((
       SELECT SUM(remaining) FROM ticket_credits WHERE user_id = $1 AND status = 'active'
     ), 0), updated_at = NOW()
     WHERE user_id = $1 RETURNING balance::float AS balance`,
    [userId]
  )
  return Number(result.rows[0]?.balance ?? 0)
}

async function insertLedger(
  db: Queryable,
  userId: string,
  entry: {
    type: WalletTxType
    amount: number
    balanceAfter: number
    referenceType?: string | null
    referenceId?: string | null
    note?: string | null
    createdBy?: string | null
  }
): Promise<string> {
  const result = await db.query(
    `INSERT INTO wallet_transactions
       (user_id, type, amount, balance_after, status, reference_type, reference_id, note, created_by)
     VALUES ($1, $2, $3, $4, 'completed', $5, $6, $7, $8) RETURNING id`,
    [
      userId,
      entry.type,
      roundKes(entry.amount),
      entry.balanceAfter,
      entry.referenceType ?? null,
      entry.referenceId ?? null,
      entry.note ?? null,
      entry.createdBy ?? null,
    ]
  )
  return result.rows[0].id
}

export interface AddCreditParams {
  amount: number
  reason: CreditReason
  /** Nairobi calendar day ('YYYY-MM-DD') of the event the value came from; expiry counts from the day after. */
  eventDay?: string | null
  availableFrom?: Date
  expiresAt?: Date
  sourceTicketId?: string | null
  sourcePlanId?: string | null
  sourceEventId?: string | null
  regionId?: string | null
  note?: string | null
  createdBy?: string | null
}

export interface AddedCredit {
  id: string
  amount: number
  expiresAt: Date
  availableFrom: Date
}

/** Must be called inside `withWallet` for the same member. */
export async function addCredit(client: Queryable, userId: string, params: AddCreditParams): Promise<AddedCredit | null> {
  const amount = roundKes(params.amount)
  if (!Number.isFinite(amount) || amount <= 0) return null
  const rules = await getTicketRules()
  const now = new Date()
  const expiresAt = params.expiresAt ?? creditExpiry(params.eventDay ?? nairobiDay(now), rules.creditDays)
  const availableFrom = params.availableFrom ?? now
  const inserted = await client.query(
    `INSERT INTO ticket_credits
       (user_id, source_ticket_id, source_plan_id, source_event_id, reason, region_id, amount, remaining,
        available_from, expires_at, note, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10, $11) RETURNING id`,
    [
      userId,
      params.sourceTicketId ?? null,
      params.sourcePlanId ?? null,
      params.sourceEventId ?? null,
      params.reason,
      params.regionId ?? null,
      amount,
      availableFrom,
      expiresAt,
      params.note ?? null,
      params.createdBy ?? null,
    ]
  )
  const id: string = inserted.rows[0].id
  const total = await syncWalletTotal(client, userId)
  await insertLedger(client, userId, {
    type: 'credit_added',
    amount,
    balanceAfter: total,
    referenceType: 'ticket_credit',
    referenceId: id,
    note: params.note ?? null,
    createdBy: params.createdBy ?? null,
  })
  return { id, amount, expiresAt, availableFrom }
}

/** Credit the member can spend right now: active, available, unexpired, minus amounts held for open payments. */
const SPENDABLE_SQL = `
  SELECT c.id, c.region_id, (c.remaining - COALESCE(h.held, 0))::float AS free
  FROM ticket_credits c
  LEFT JOIN (
    SELECT credit_id, SUM(amount) AS held FROM ticket_credit_uses WHERE status = 'held' GROUP BY credit_id
  ) h ON h.credit_id = c.id
  WHERE c.user_id = $1 AND c.status = 'active' AND c.available_from <= $2 AND c.expires_at > $2
    AND c.remaining - COALESCE(h.held, 0) > 0
  ORDER BY c.expires_at ASC, c.created_at ASC`

export async function getSpendableCredit(db: Queryable, userId: string, now = new Date()): Promise<number> {
  const result = await db.query(SPENDABLE_SQL, [userId, now])
  return roundKes(result.rows.reduce((sum: number, row: { free: number }) => sum + Number(row.free), 0))
}

export interface HoldResult {
  held: number
  /** Referral zone on the oldest credit used, so a reused missed ticket stays with its zone. */
  regionId: string | null
}

/**
 * Reserves up to `maxAmount` of the member's credit, oldest expiry first. Must run inside `withWallet`.
 * Holds are either committed (credit spent) or released (payment failed).
 */
export async function holdCredit(
  client: Queryable,
  userId: string,
  target: { maxAmount: number; purchaseBatchId?: string | null; planId?: string | null; paymentTxId?: string | null },
  now = new Date()
): Promise<HoldResult> {
  let left = roundKes(target.maxAmount)
  let held = 0
  let regionId: string | null = null
  if (!(left > 0)) return { held: 0, regionId }
  // The wallet lock already serialises this member's credit changes, so the rows need no extra lock.
  const credits = await client.query(SPENDABLE_SQL, [userId, now])
  for (const credit of credits.rows as { id: string; region_id: string | null; free: number }[]) {
    if (left <= 0) break
    const take = roundKes(Math.min(left, Number(credit.free)))
    if (take <= 0) continue
    await client.query(
      `INSERT INTO ticket_credit_uses (credit_id, purchase_batch_id, plan_id, payment_tx_id, amount, status)
       VALUES ($1, $2, $3, $4, $5, 'held')`,
      [credit.id, target.purchaseBatchId ?? null, target.planId ?? null, target.paymentTxId ?? null, take]
    )
    if (held === 0) regionId = credit.region_id
    held = roundKes(held + take)
    left = roundKes(left - take)
  }
  return { held, regionId }
}

type HoldScope = { paymentTxId: string } | { purchaseBatchId: string } | { planId: string }

function scopeWhere(scope: HoldScope): [string, string] {
  if ('paymentTxId' in scope) return ['u.payment_tx_id = $1', scope.paymentTxId]
  if ('purchaseBatchId' in scope) return ['u.purchase_batch_id = $1', scope.purchaseBatchId]
  return ['u.plan_id = $1', scope.planId]
}

/**
 * Spends held credit. Must run inside `withWallet` for the member who owns the credits.
 * Writes one history row for the total and returns it.
 */
export async function commitHolds(
  client: Queryable,
  userId: string,
  scope: HoldScope,
  history: { note: string; referenceType?: string; referenceId?: string | null }
): Promise<{ amount: number; txId: string | null }> {
  const [where, value] = scopeWhere(scope)
  const holds = await client.query(
    `SELECT u.id, u.credit_id, u.amount::float AS amount FROM ticket_credit_uses u
     JOIN ticket_credits c ON c.id = u.credit_id
     WHERE ${where} AND u.status = 'held' AND c.user_id = $2
     FOR UPDATE OF u, c`,
    [value, userId]
  )
  let amount = 0
  for (const hold of holds.rows as { id: string; credit_id: string; amount: number }[]) {
    await client.query(
      `UPDATE ticket_credits
       SET remaining = GREATEST(remaining - $2, 0),
           status = CASE WHEN remaining - $2 <= 0.005 THEN 'used' ELSE status END
       WHERE id = $1`,
      [hold.credit_id, hold.amount]
    )
    await client.query(`UPDATE ticket_credit_uses SET status = 'committed', settled_at = NOW() WHERE id = $1`, [hold.id])
    amount = roundKes(amount + hold.amount)
  }
  if (amount <= 0) return { amount: 0, txId: null }
  const total = await syncWalletTotal(client, userId)
  const txId = await insertLedger(client, userId, {
    type: 'credit_used',
    amount: -amount,
    balanceAfter: total,
    referenceType: history.referenceType ?? null,
    referenceId: history.referenceId ?? null,
    note: history.note,
  })
  return { amount, txId }
}

/** Gives held credit back after a failed or abandoned payment. Safe to call repeatedly. */
export async function releaseHolds(db: Queryable, scope: HoldScope): Promise<number> {
  const [where, value] = scopeWhere(scope)
  const result = await db.query(
    `UPDATE ticket_credit_uses u SET status = 'released', settled_at = NOW()
     WHERE ${where} AND u.status = 'held' RETURNING u.amount::float AS amount`,
    [value]
  )
  return roundKes(result.rows.reduce((sum: number, row: { amount: number }) => sum + Number(row.amount), 0))
}

/**
 * Cancels an unused credit (e.g. the member was marked present after all). Must run inside `withWallet`.
 * Refuses when part of it was already spent or is held for a payment.
 */
export async function voidCredit(
  client: Queryable,
  userId: string,
  creditId: string,
  opts: { note: string; createdBy?: string | null; allowPartial?: boolean }
): Promise<number> {
  const found = await client.query(
    `SELECT c.amount::float AS amount, c.remaining::float AS remaining, c.status,
            EXISTS (SELECT 1 FROM ticket_credit_uses u WHERE u.credit_id = c.id AND u.status = 'held') AS has_hold
     FROM ticket_credits c WHERE c.id = $1 AND c.user_id = $2 FOR UPDATE`,
    [creditId, userId]
  )
  const credit = found.rows[0]
  if (!credit) throw new CreditError('Credit not found', 404)
  if (credit.status !== 'active' || credit.remaining <= 0) return 0
  if (credit.has_hold) throw new CreditError('This credit is being used for a payment right now. Try again shortly.', 409)
  if (!opts.allowPartial && credit.remaining + 0.005 < credit.amount) {
    throw new CreditError('Part of this credit has already been used on another ticket', 409)
  }
  await client.query(`UPDATE ticket_credits SET status = 'voided', remaining = 0 WHERE id = $1`, [creditId])
  const total = await syncWalletTotal(client, userId)
  await insertLedger(client, userId, {
    type: 'credit_voided',
    amount: -credit.remaining,
    balanceAfter: total,
    referenceType: 'ticket_credit',
    referenceId: creditId,
    note: opts.note,
    createdBy: opts.createdBy ?? null,
  })
  return roundKes(credit.remaining)
}

/** Lapses credits whose last day has ended. Credits with a payment in flight are skipped until it settles. */
export async function expireCredits(now = new Date()): Promise<number> {
  const due = await query(
    `SELECT c.id, c.user_id FROM ticket_credits c
     WHERE c.status = 'active' AND c.expires_at <= $1
       AND NOT EXISTS (SELECT 1 FROM ticket_credit_uses u WHERE u.credit_id = c.id AND u.status = 'held')
     LIMIT 500`,
    [now]
  )
  let expired = 0
  for (const row of due.rows as { id: string; user_id: string }[]) {
    const lapsed = await withWallet(row.user_id, async (client) => {
      const locked = await client.query(
        `SELECT remaining::float AS remaining, status FROM ticket_credits WHERE id = $1 FOR UPDATE`,
        [row.id]
      )
      const credit = locked.rows[0]
      if (!credit || credit.status !== 'active') return false
      await client.query(`UPDATE ticket_credits SET status = 'expired', remaining = 0 WHERE id = $1`, [row.id])
      if (credit.remaining > 0) {
        const total = await syncWalletTotal(client, row.user_id)
        await insertLedger(client, row.user_id, {
          type: 'credit_expired',
          amount: -credit.remaining,
          balanceAfter: total,
          referenceType: 'ticket_credit',
          referenceId: row.id,
          note: 'Ticket value expired',
        })
      }
      return true
    })
    if (lapsed) expired++
  }
  return expired
}

export async function listCredits(userId: string, now = new Date()): Promise<TicketCredit[]> {
  const result = await query(
    `SELECT c.id, c.reason, c.amount::float AS amount, c.remaining::float AS remaining,
            COALESCE((SELECT SUM(u.amount) FROM ticket_credit_uses u WHERE u.credit_id = c.id AND u.status = 'held'), 0)::float AS held,
            c.available_from, c.expires_at, c.status, c.created_at,
            e.title AS event_title, e.event_date
     FROM ticket_credits c
     LEFT JOIN events e ON e.id = c.source_event_id
     WHERE c.user_id = $1 AND c.status = 'active' AND c.remaining > 0 AND c.expires_at > $2
     ORDER BY c.expires_at ASC, c.created_at ASC`,
    [userId, now]
  )
  return result.rows.map((row: any) => ({
    ...row,
    days_left: daysLeft(new Date(row.expires_at), now),
    available: new Date(row.available_from).getTime() <= now.getTime(),
  }))
}

export interface TicketValueSummary {
  /** What can be spent right now. */
  ticketValue: number
  /** Credit from a recent missed event that appears the morning after it. */
  upcoming: number
  credits: TicketCredit[]
}

export async function getTicketValue(userId: string, now = new Date()): Promise<TicketValueSummary> {
  const credits = await listCredits(userId, now)
  let ticketValue = 0
  let upcoming = 0
  for (const credit of credits) {
    const free = roundKes(credit.remaining - credit.held)
    if (credit.available) ticketValue = roundKes(ticketValue + Math.max(0, free))
    else upcoming = roundKes(upcoming + credit.remaining)
  }
  return { ticketValue, upcoming, credits }
}

/** Creates the pending ledger row for an M-Pesa payment that never touches ticket value (amount 0). */
export async function createPendingMpesaTx(
  db: Queryable,
  userId: string,
  params: {
    type: 'ticket_payment_mpesa' | 'installment'
    mpesaAmount: number
    phone: string
    referenceType?: string
    referenceId?: string | null
    note: string
  }
): Promise<string> {
  const result = await db.query(
    `INSERT INTO wallet_transactions
       (user_id, type, amount, mpesa_amount, status, phone, reference_type, reference_id, note)
     VALUES ($1, $2, 0, $3, 'pending', $4, $5, $6, $7) RETURNING id`,
    [
      userId,
      params.type,
      roundKes(params.mpesaAmount),
      params.phone,
      params.referenceType ?? null,
      params.referenceId ?? null,
      params.note,
    ]
  )
  return result.rows[0].id
}

export async function attachCheckoutToTx(txId: string, checkoutRequestId: string): Promise<void> {
  await query('UPDATE wallet_transactions SET checkout_request_id = $1 WHERE id = $2', [checkoutRequestId, txId])
}

/** Marks pending M-Pesa rows failed and gives back any credit held for them. */
export async function failWalletTxByCheckoutId(checkoutRequestId: string): Promise<void> {
  const failed = await query(
    `UPDATE wallet_transactions SET status = 'failed'
     WHERE checkout_request_id = $1 AND status = 'pending' RETURNING id`,
    [checkoutRequestId]
  )
  for (const row of failed.rows as { id: string }[]) {
    await releaseHolds(poolDb, { paymentTxId: row.id })
  }
}

const REASON_SQL = `(SELECT c.reason FROM ticket_credits c WHERE t.reference_type = 'ticket_credit' AND c.id = t.reference_id)`

export async function getWalletTransactions(
  userId: string,
  { limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}
): Promise<{ transactions: WalletTx[]; total: number }> {
  const [rows, total] = await Promise.all([
    query(
      `SELECT ${TX_FIELDS}, ${REASON_SQL} AS reason FROM wallet_transactions t
       WHERE t.user_id = $1 AND t.status <> 'failed'
       ORDER BY t.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
    query(`SELECT COUNT(*)::int AS count FROM wallet_transactions WHERE user_id = $1 AND status <> 'failed'`, [userId]),
  ])
  return { transactions: rows.rows, total: total.rows[0].count }
}
