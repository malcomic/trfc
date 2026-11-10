import type { PoolClient } from 'pg'
import { getClient, query } from '../config/db.js'
import { InvalidMpesaPhoneError, sendStkPush, stkErrorMessage } from '../controllers/paymentsController.js'
import { describeMpesaError } from './mpesa.js'
import { logError } from './paymentLogger.js'
import { sendMembershipWelcome } from './membershipEmail.js'

type Queryable = Pick<PoolClient, 'query'>
const poolDb = { query } as unknown as Queryable

export type MembershipPriceType = 'founding' | 'standard' | 'renewal' | 'gift'
export type MembershipStatus = 'pending' | 'paid' | 'failed' | 'cancelled'

export interface MembershipSettings {
  standardPrice: number
  foundingPrice: number
  foundingLimit: number
  foundingDeadline: Date
  renewalPrice: number
  renewalGraceDays: number
  salesOpenAt: Date
  salesPaused: boolean
  updatedAt: Date | null
}

export interface MembershipHistoryRow {
  priceType: MembershipPriceType
  status: MembershipStatus
  endsAt: Date
}

export interface MembershipQuote {
  available: boolean
  reason?: 'opens' | 'paused'
  priceType: Exclude<MembershipPriceType, 'gift'>
  amount: number
  startsAt: Date
  endsAt: Date
  foundingLeft: number
  renewalUntil: Date | null
}

export const MEMBERSHIP_HOLD_MINUTES = 10
export const MEMBERSHIP_ACCOUNT_PREFIX = 'MEMBER-'
const DAY_MS = 24 * 60 * 60 * 1000
const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000

export class MembershipError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

/** Adds calendar months in Nairobi time (UTC+3, no daylight saving), clamping to the last day of short months. */
export function addMonthsNairobi(date: Date, months: number): Date {
  const local = new Date(date.getTime() + NAIROBI_OFFSET_MS)
  const day = local.getUTCDate()
  const target = new Date(local.getTime())
  target.setUTCDate(1)
  target.setUTCMonth(target.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(day, lastDay))
  return new Date(target.getTime() - NAIROBI_OFFSET_MS)
}

export function settingsFromRow(row: any): MembershipSettings {
  return {
    standardPrice: Number(row.standard_price),
    foundingPrice: Number(row.founding_price),
    foundingLimit: Number(row.founding_limit),
    foundingDeadline: new Date(row.founding_deadline),
    renewalPrice: Number(row.renewal_price),
    renewalGraceDays: Number(row.renewal_grace_days),
    salesOpenAt: new Date(row.sales_open_at),
    salesPaused: Boolean(row.sales_paused),
    updatedAt: row.updated_at ? new Date(row.updated_at) : null,
  }
}

export async function getMembershipSettings(db: Queryable = poolDb, forUpdate = false): Promise<MembershipSettings> {
  const result = await db.query(
    `SELECT * FROM membership_settings WHERE id = 1${forUpdate ? ' FOR UPDATE' : ''}`
  )
  if (!result.rows[0]) throw new MembershipError('Membership settings are missing', 500)
  return settingsFromRow(result.rows[0])
}

/** The latest end date among paid years (gifts included), or null when the user has never been a member. */
export function latestPaidEnd(history: MembershipHistoryRow[]): Date | null {
  let latest: Date | null = null
  for (const row of history) {
    if (row.status !== 'paid') continue
    if (!latest || row.endsAt.getTime() > latest.getTime()) latest = row.endsAt
  }
  return latest
}

export function renewalDeadline(lastEnd: Date | null, settings: MembershipSettings): Date | null {
  return lastEnd ? new Date(lastEnd.getTime() + settings.renewalGraceDays * DAY_MS) : null
}

/** Works out what a user would pay now and which dates the new year would cover. */
export function quoteFor(
  history: MembershipHistoryRow[],
  settings: MembershipSettings,
  foundingTaken: number,
  now: Date = new Date()
): MembershipQuote {
  const foundingLeft =
    now.getTime() <= settings.foundingDeadline.getTime() ? Math.max(0, settings.foundingLimit - foundingTaken) : 0
  const lastEnd = latestPaidEnd(history)
  const renewalUntil = renewalDeadline(lastEnd, settings)

  let priceType: MembershipQuote['priceType']
  let amount: number
  let startsAt: Date
  if (lastEnd && lastEnd.getTime() > now.getTime()) {
    priceType = 'renewal'
    amount = settings.renewalPrice
    startsAt = lastEnd
  } else if (renewalUntil && now.getTime() <= renewalUntil.getTime()) {
    priceType = 'renewal'
    amount = settings.renewalPrice
    startsAt = now
  } else if (!lastEnd && foundingLeft > 0) {
    priceType = 'founding'
    amount = settings.foundingPrice
    startsAt = now
  } else {
    priceType = 'standard'
    amount = settings.standardPrice
    startsAt = now
  }

  const quote: MembershipQuote = {
    available: true,
    priceType,
    amount,
    startsAt,
    endsAt: addMonthsNairobi(startsAt, 12),
    foundingLeft,
    renewalUntil,
  }
  if (settings.salesPaused) return { ...quote, available: false, reason: 'paused' }
  if (now.getTime() < settings.salesOpenAt.getTime()) return { ...quote, available: false, reason: 'opens' }
  return quote
}

/** Founding places used: paid ones plus checkouts still holding a place. */
export async function foundingTaken(db: Queryable = poolDb): Promise<number> {
  const result = await db.query(
    `SELECT COUNT(*)::int AS taken FROM memberships
     WHERE price_type = 'founding'
       AND (status = 'paid' OR (status = 'pending' AND hold_expires_at > NOW()))`
  )
  return Number(result.rows[0]?.taken ?? 0)
}

export async function membershipHistory(userId: string, db: Queryable = poolDb): Promise<MembershipHistoryRow[]> {
  const result = await db.query(
    `SELECT price_type, status, ends_at FROM memberships WHERE user_id = $1 AND status = 'paid'`,
    [userId]
  )
  return result.rows.map((r: any) => ({ priceType: r.price_type, status: r.status, endsAt: new Date(r.ends_at) }))
}

export async function getQuoteForUser(userId: string, db: Queryable = poolDb, now = new Date()) {
  const [settings, history, taken] = await Promise.all([
    getMembershipSettings(db),
    membershipHistory(userId, db),
    foundingTaken(db),
  ])
  return { settings, quote: quoteFor(history, settings, taken, now) }
}

async function withTransaction<T>(fn: (client: Queryable) => Promise<T>): Promise<T> {
  const client = await getClient()
  try {
    await client.query('BEGIN')
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

export interface MembershipCheckoutResult {
  membershipId: string
  checkoutRequestId: string
  amount: number
  priceType: string
  reused: boolean
}

/**
 * Reserves the price with a short hold, then sends the M-Pesa prompt.
 * The settings row lock makes the founding count and the new hold atomic; the STK call runs after commit
 * so a slow Safaricom response does not block other buyers.
 */
export async function startMembershipCheckout(userId: string, phone: string): Promise<MembershipCheckoutResult> {
  const reserved = await withTransaction(async (db) => {
    const settings = await getMembershipSettings(db, true)
    const existing = await db.query(
      `SELECT id, checkout_request_id, amount, price_type FROM memberships
       WHERE user_id = $1 AND status = 'pending' AND hold_expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    )
    if (existing.rows[0]?.checkout_request_id) {
      const row = existing.rows[0]
      return {
        reused: true as const,
        membershipId: row.id as string,
        checkoutRequestId: row.checkout_request_id as string,
        amount: Number(row.amount),
        priceType: row.price_type as string,
      }
    }
    if (existing.rows[0]) {
      throw new MembershipError('Your last payment request is still being sent. Please wait a moment.', 409)
    }

    const history = await membershipHistory(userId, db)
    const quote = quoteFor(history, settings, await foundingTaken(db))
    if (!quote.available) {
      throw new MembershipError(
        quote.reason === 'paused' ? 'Membership sales are paused right now.' : 'Membership sales have not opened yet.',
        409
      )
    }
    const inserted = await db.query(
      `INSERT INTO memberships (user_id, price_type, amount, status, starts_at, ends_at, phone, hold_expires_at)
       VALUES ($1, $2, $3, 'pending', $4, $5, $6, NOW() + ($7 || ' minutes')::interval)
       RETURNING id`,
      [userId, quote.priceType, quote.amount, quote.startsAt, quote.endsAt, phone, String(MEMBERSHIP_HOLD_MINUTES)]
    )
    return { reused: false as const, membershipId: inserted.rows[0].id as string, amount: quote.amount, priceType: quote.priceType }
  })

  if (reserved.reused) return reserved

  const accountReference = `${MEMBERSHIP_ACCOUNT_PREFIX}${reserved.membershipId}`
  let stk
  try {
    stk = await sendStkPush(phone, Math.ceil(reserved.amount), accountReference)
  } catch (error) {
    await query(`UPDATE memberships SET status = 'failed' WHERE id = $1 AND status = 'pending'`, [reserved.membershipId])
    logError('MEMBERSHIP_STK_EXCEPTION', describeMpesaError(error), { accountReference })
    throw new MembershipError(stkErrorMessage(error), error instanceof InvalidMpesaPhoneError ? 400 : 500)
  }
  if (stk.ResponseCode !== '0' || !stk.CheckoutRequestID) {
    await query(`UPDATE memberships SET status = 'failed' WHERE id = $1 AND status = 'pending'`, [reserved.membershipId])
    throw new MembershipError(stk.CustomerMessage || 'Failed to initiate payment. Please try again.')
  }
  await query(`UPDATE memberships SET checkout_request_id = $2 WHERE id = $1`, [
    reserved.membershipId,
    stk.CheckoutRequestID,
  ])
  return {
    membershipId: reserved.membershipId,
    checkoutRequestId: stk.CheckoutRequestID,
    amount: reserved.amount,
    priceType: reserved.priceType,
    reused: false,
  }
}

async function latestPaidEndFor(db: Queryable, userId: string, excludeId?: string): Promise<Date | null> {
  const result = await db.query(
    `SELECT MAX(ends_at) AS ends_at FROM memberships
     WHERE user_id = $1 AND status = 'paid' AND ($2::uuid IS NULL OR id <> $2::uuid)`,
    [userId, excludeId ?? null]
  )
  const value = result.rows[0]?.ends_at
  return value ? new Date(value) : null
}

/**
 * Marks a membership paid once M-Pesa confirms it. Dates are recomputed now so renewals paid back to back stack.
 * A row the hold-expiry job already marked failed is still honoured, because the money has arrived.
 * Pass the membership id from the account reference when known, in case the checkout id was not saved yet.
 */
export async function settleMembershipByCheckoutId(
  checkoutRequestId: string,
  mpesaReceipt: string | null,
  membershipId?: string
): Promise<number> {
  const targetId = membershipId && isUuidLike(membershipId) ? membershipId : null
  const candidate = await query(
    `SELECT 1 FROM memberships
     WHERE (checkout_request_id = $1 OR ($2::uuid IS NOT NULL AND id = $2::uuid AND checkout_request_id IS NULL))
       AND status IN ('pending', 'failed')
     LIMIT 1`,
    [checkoutRequestId, targetId]
  )
  if (candidate.rows.length === 0) return 0

  const settled = await withTransaction(async (db) => {
    const found = await db.query(
      `SELECT id, user_id, price_type FROM memberships
       WHERE (checkout_request_id = $1 OR ($2::uuid IS NOT NULL AND id = $2::uuid AND checkout_request_id IS NULL))
         AND status IN ('pending', 'failed')
       LIMIT 1
       FOR UPDATE`,
      [checkoutRequestId, targetId]
    )
    const row = found.rows[0]
    if (!row) return null

    const lastEnd = await latestPaidEndFor(db, row.user_id, row.id)
    const now = new Date()
    const startsAt = lastEnd && lastEnd.getTime() > now.getTime() ? lastEnd : now
    const endsAt = addMonthsNairobi(startsAt, 12)

    let overLimit = false
    if (row.price_type === 'founding') {
      const settings = await getMembershipSettings(db)
      const paid = await db.query(
        `SELECT COUNT(*)::int AS paid FROM memberships WHERE price_type = 'founding' AND status = 'paid'`
      )
      overLimit = Number(paid.rows[0]?.paid ?? 0) >= settings.foundingLimit
    }

    await db.query(
      `UPDATE memberships
       SET status = 'paid', paid_at = NOW(), starts_at = $2, ends_at = $3, over_limit = $4,
           mpesa_receipt = COALESCE($5, mpesa_receipt), checkout_request_id = COALESCE(checkout_request_id, $6),
           hold_expires_at = NULL
       WHERE id = $1`,
      [row.id, startsAt, endsAt, overLimit, mpesaReceipt, checkoutRequestId]
    )
    await db.query(
      `UPDATE users SET member_until = GREATEST(COALESCE(member_until, $2), $2) WHERE id = $1`,
      [row.user_id, endsAt]
    )
    return row.id as string
  })
  if (!settled) return 0
  void sendMembershipWelcome(settled)
  return 1
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export async function failMembershipByCheckoutId(checkoutRequestId: string): Promise<number> {
  const result = await query(
    `UPDATE memberships SET status = 'failed', hold_expires_at = NULL
     WHERE checkout_request_id = $1 AND status = 'pending'`,
    [checkoutRequestId]
  )
  return result.rowCount || 0
}

/** Sets member_until from the paid years that remain, e.g. after an admin cancels one. */
export async function recalcMemberUntil(db: Queryable, userId: string): Promise<Date | null> {
  const end = await latestPaidEndFor(db, userId)
  await db.query(`UPDATE users SET member_until = $2 WHERE id = $1`, [userId, end])
  return end
}

/** An admin gift or extension, stacked on the current end date. Gifts never count as founding. */
export async function grantMembership(adminId: string, userId: string, months: number, note: string) {
  return withTransaction(async (db) => {
    const user = await db.query(`SELECT id FROM users WHERE id = $1 FOR UPDATE`, [userId])
    if (!user.rows[0]) throw new MembershipError('User not found', 404)
    const lastEnd = await latestPaidEndFor(db, userId)
    const now = new Date()
    const startsAt = lastEnd && lastEnd.getTime() > now.getTime() ? lastEnd : now
    const endsAt = addMonthsNairobi(startsAt, months)
    const inserted = await db.query(
      `INSERT INTO memberships (user_id, price_type, amount, status, starts_at, ends_at, granted_by, note, paid_at)
       VALUES ($1, 'gift', 0, 'paid', $2, $3, $4, $5, NOW())
       RETURNING id, starts_at, ends_at`,
      [userId, startsAt, endsAt, adminId, note]
    )
    await db.query(
      `UPDATE users SET member_until = GREATEST(COALESCE(member_until, $2), $2) WHERE id = $1`,
      [userId, endsAt]
    )
    return inserted.rows[0] as { id: string; starts_at: Date; ends_at: Date }
  })
}

export async function cancelMembership(membershipId: string, note: string) {
  return withTransaction(async (db) => {
    const updated = await db.query(
      `UPDATE memberships
       SET status = 'cancelled', cancelled_at = NOW(),
           note = CASE WHEN note IS NULL OR note = '' THEN $2 ELSE note || E'\\n' || $2 END,
           hold_expires_at = NULL
       WHERE id = $1 AND status IN ('paid', 'pending')
       RETURNING user_id`,
      [membershipId, `Cancelled: ${note}`]
    )
    const row = updated.rows[0]
    if (!row) throw new MembershipError('Membership not found or already cancelled', 404)
    const memberUntil = await recalcMemberUntil(db, row.user_id)
    return { userId: row.user_id as string, memberUntil }
  })
}

/** Holds that ran out without a payment free their founding place. */
export async function expireStaleMembershipHolds(): Promise<number> {
  const result = await query(
    `UPDATE memberships SET status = 'failed'
     WHERE status = 'pending' AND hold_expires_at < NOW()`
  )
  return result.rowCount || 0
}

/** Founding label and the last day the renewal price applies, for the dashboard payload. */
export async function membershipDashboardExtras(
  userId: string,
  memberUntil: Date | string | null | undefined
): Promise<{ isFounding: boolean; renewalUntil: string | null }> {
  const result = await query(
    `SELECT
       EXISTS (SELECT 1 FROM memberships WHERE user_id = $1 AND price_type = 'founding' AND status = 'paid') AS founding,
       (SELECT renewal_grace_days FROM membership_settings WHERE id = 1) AS grace_days`,
    [userId]
  )
  const row = result.rows[0] ?? {}
  const until = memberUntil ? new Date(memberUntil) : null
  const graceDays = Number(row.grace_days ?? 30)
  return {
    isFounding: Boolean(row.founding),
    renewalUntil:
      until && !Number.isNaN(until.getTime()) ? new Date(until.getTime() + graceDays * DAY_MS).toISOString() : null,
  }
}

export async function isFoundingMember(db: Queryable, userId: string): Promise<boolean> {
  const result = await db.query(
    `SELECT EXISTS (SELECT 1 FROM memberships WHERE user_id = $1 AND price_type = 'founding' AND status = 'paid') AS founding`,
    [userId]
  )
  return Boolean(result.rows[0]?.founding)
}
