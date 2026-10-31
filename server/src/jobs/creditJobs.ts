import { query } from '../config/db.js'
import { sendEmail } from '../utils/emailService.js'
import {
  buildCreditCreatedEmailHTML,
  buildCreditCreatedEmailText,
  buildCreditExpiringEmailHTML,
  buildCreditExpiringEmailText,
} from '../utils/emailTemplates.js'
import { autoConfirmScanLists } from '../utils/attendance.js'
import { daysLeft } from '../utils/ticketRules.js'
import { expireCredits } from '../utils/wallet.js'
import { notifyWaitlist } from '../utils/waitlist.js'
import { remindUnpaidSettlements } from '../utils/eventSettlement.js'
import { sendCreditCreated, sendCreditExpiring } from '../utils/whatsapp.js'

const TICK_MS = 30 * 60 * 1000
const BATCH = 200
/** Credit held for an M-Pesa payment that never confirmed is given back after this long. */
const STALE_HOLD_MINUTES = 30

export type ExpiryStage = '14d' | '7d' | '2d'

/** Expiry reminders go out 14, 7 and 2 days before the credit ends; only the latest due stage is sent. */
export function dueExpiryStage(
  days: number,
  sent: { d14: boolean; d7: boolean; d2: boolean }
): { send: ExpiryStage; mark: ExpiryStage[] } | null {
  if (days <= 0) return null
  if (days <= 2) return sent.d2 ? null : { send: '2d', mark: ['14d', '7d', '2d'] }
  if (days <= 7) return sent.d7 ? null : { send: '7d', mark: ['14d', '7d'] }
  if (days <= 14) return sent.d14 ? null : { send: '14d', mark: ['14d'] }
  return null
}

const firstName = (name: string | null) => name?.trim().split(/\s+/)[0] || 'there'
const kes = (value: number) => `KSh ${Number(value).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`
const shortDate = (date: Date) =>
  date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' })

export async function releaseStaleHolds(now = new Date()): Promise<number> {
  const result = await query(
    `UPDATE ticket_credit_uses u SET status = 'released', settled_at = $1
     WHERE u.status = 'held' AND u.created_at < $1::timestamptz - make_interval(mins => $2)
       AND NOT EXISTS (
         SELECT 1 FROM wallet_transactions w
         WHERE w.id = u.payment_tx_id AND w.status = 'completed'
       )
     RETURNING u.id`,
    [now, STALE_HOLD_MINUTES]
  )
  return result.rowCount ?? 0
}

/** Tells members about new ticket value once it is on their wallet (with its last day). */
async function notifyNewCredits(now: Date): Promise<number> {
  const due = await query(
    `SELECT c.id, c.amount::float AS amount, c.reason, c.available_from, c.expires_at,
            e.title AS event_title, u.name, u.email, COALESCE(u.whatsapp, u.phone_normalized) AS phone
     FROM ticket_credits c
     JOIN users u ON u.id = c.user_id
     LEFT JOIN events e ON e.id = c.source_event_id
     WHERE c.notified_at IS NULL AND c.status = 'active' AND c.available_from <= $1 AND c.expires_at > $1
     ORDER BY c.created_at
     LIMIT ${BATCH}`,
    [now]
  )
  let sent = 0
  for (const row of due.rows) {
    await query('UPDATE ticket_credits SET notified_at = $2 WHERE id = $1', [row.id, now])
    const expiresAt = new Date(row.expires_at)
    const data = {
      name: row.name ?? null,
      amount: Number(row.amount),
      reason: row.reason,
      eventTitle: row.event_title ?? null,
      availableFrom: new Date(row.available_from),
      expiresAt,
    }
    const [email, whatsapp] = await Promise.all([
      row.email
        ? sendEmail({
            to: row.email,
            subject: `You have ${kes(data.amount)} ticket value`,
            html: buildCreditCreatedEmailHTML(data),
            text: buildCreditCreatedEmailText(data),
          }).then((r) => r.success)
        : Promise.resolve(false),
      row.phone
        ? sendCreditCreated(row.phone, {
            firstName: firstName(row.name),
            amount: kes(data.amount),
            lastDay: shortDate(expiresAt),
          })
        : Promise.resolve(false),
    ])
    if (email || whatsapp) sent++
  }
  return sent
}

async function sendExpiryReminders(now: Date): Promise<number> {
  const due = await query(
    `SELECT c.id, c.remaining::float AS remaining, c.expires_at,
            c.reminded_14d_at IS NOT NULL AS d14, c.reminded_7d_at IS NOT NULL AS d7, c.reminded_2d_at IS NOT NULL AS d2,
            u.name, u.email, COALESCE(u.whatsapp, u.phone_normalized) AS phone
     FROM ticket_credits c
     JOIN users u ON u.id = c.user_id
     WHERE c.status = 'active' AND c.remaining > 0 AND c.available_from <= $1
       AND c.expires_at > $1 AND c.expires_at <= $1::timestamptz + INTERVAL '15 days'
       AND c.reminded_2d_at IS NULL
     ORDER BY c.expires_at
     LIMIT ${BATCH}`,
    [now]
  )
  let sent = 0
  for (const row of due.rows) {
    const expiresAt = new Date(row.expires_at)
    const left = daysLeft(expiresAt, now)
    const stage = dueExpiryStage(left, { d14: row.d14, d7: row.d7, d2: row.d2 })
    if (!stage) continue
    const columns = stage.mark.map((s) => `reminded_${s}_at = COALESCE(reminded_${s}_at, $2)`).join(', ')
    await query(`UPDATE ticket_credits SET ${columns} WHERE id = $1`, [row.id, now])
    const data = { name: row.name ?? null, amount: Number(row.remaining), expiresAt, daysLeft: left }
    const [email, whatsapp] = await Promise.all([
      row.email
        ? sendEmail({
            to: row.email,
            subject: `Your ticket value ends in ${left} day${left === 1 ? '' : 's'}`,
            html: buildCreditExpiringEmailHTML(data),
            text: buildCreditExpiringEmailText(data),
          }).then((r) => r.success)
        : Promise.resolve(false),
      row.phone
        ? sendCreditExpiring(row.phone, {
            firstName: firstName(row.name),
            amount: kes(data.amount),
            lastDay: shortDate(expiresAt),
            daysLeft: String(left),
          })
        : Promise.resolve(false),
    ])
    if (email || whatsapp) sent++
  }
  return sent
}

/** Once member-priority seats open to everyone, the waiting list hears about it. */
async function announcePriorityReleases(now: Date): Promise<number> {
  const released = await query(
    `UPDATE events e SET priority_release_notified_at = $1
     FROM ticket_rules_settings s
     WHERE s.id = 1 AND e.member_priority_pct IS NOT NULL AND e.priority_release_notified_at IS NULL
       AND e.cancelled_at IS NULL AND e.event_date >= CURRENT_DATE
       AND (((e.event_date::date - s.priority_release_days)::timestamp) AT TIME ZONE 'Africa/Nairobi') <= $1
     RETURNING e.id`,
    [now]
  )
  for (const row of released.rows) await notifyWaitlist(row.id)
  return released.rowCount ?? 0
}

export interface CreditTickResult {
  expired: number
  holdsReleased: number
  notified: number
  reminded: number
  scanListsConfirmed: number
  prioritySeatsOpened: number
  payoutReminders: number
}

export async function runCreditTick(now = new Date()): Promise<CreditTickResult> {
  const holdsReleased = await releaseStaleHolds(now)
  const scanListsConfirmed = await autoConfirmScanLists(now)
  const expired = await expireCredits(now)
  const notified = await notifyNewCredits(now)
  const reminded = await sendExpiryReminders(now)
  const prioritySeatsOpened = await announcePriorityReleases(now)
  const payoutReminders = await remindUnpaidSettlements(now)
  return { expired, holdsReleased, notified, reminded, scanListsConfirmed, prioritySeatsOpened, payoutReminders }
}

let timer: NodeJS.Timeout | null = null
let isRunning = false

async function tick() {
  if (isRunning) return
  isRunning = true
  try {
    const result = await runCreditTick()
    if (Object.values(result).some((n) => n > 0)) {
      console.log(
        `🎟️  Ticket value: ${result.expired} expired, ${result.notified} added notices, ${result.reminded} expiry reminders, ` +
          `${result.holdsReleased} holds released, ${result.scanListsConfirmed} scan lists confirmed, ` +
          `${result.prioritySeatsOpened} member seat releases, ${result.payoutReminders} captain payout reminders`
      )
    }
  } catch (error: any) {
    console.error('⚠️  Ticket value job failed:', error?.message || error)
  } finally {
    isRunning = false
  }
}

export function startCreditScheduler(): void {
  if (timer) return
  if (process.env.CREDIT_JOBS_ENABLED === 'false' || process.env.NODE_ENV === 'test') return
  timer = setInterval(tick, TICK_MS)
  void tick()
  console.log('✓ Ticket value expiry, reminders and scan list confirmation scheduled (every 30 minutes)')
}

export function stopCreditScheduler(): void {
  if (timer) clearInterval(timer)
  timer = null
}
