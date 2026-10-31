import { query } from '../config/db.js'
import { sendEmail } from '../utils/emailService.js'
import {
  buildPaymentReminderEmailHTML,
  buildPaymentReminderEmailText,
  buildPlanExpiredEmailHTML,
  buildPlanExpiredEmailText,
} from '../utils/emailTemplates.js'
import { expirePlan, type ClosedPlan } from '../utils/installments.js'
import { nairobiDay, nairobiTime } from '../utils/ticketRules.js'
import { notifyWaitlist } from '../utils/waitlist.js'
import { sendPaymentReminder } from '../utils/whatsapp.js'

const TICK_MS = 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const MAX_REMINDERS_PER_TICK = 100
/** Plans with nothing paid this long after booking are released so the seats go back on sale. */
const UNPAID_DEPOSIT_HOURS = 24

export interface InstallmentTickResult {
  reminded: number
  expired: number
  released: number
}

export type ReminderStage = '7d' | '3d' | '0d'

/**
 * Which payment reminder is due: 7 days before the deadline, 3 days before, and on the deadline day.
 * Only the latest due stage is sent; earlier stages that were skipped are marked as done with it.
 */
export function dueReminderStage(
  deadline: Date,
  now: Date,
  sent: { d7: boolean; d3: boolean; d0: boolean }
): { send: ReminderStage; mark: ReminderStage[] } | null {
  if (now.getTime() > deadline.getTime()) return null
  const deadlineDayStart = nairobiTime(nairobiDay(deadline))
  if (now.getTime() >= deadlineDayStart.getTime()) {
    return sent.d0 ? null : { send: '0d', mark: ['7d', '3d', '0d'] }
  }
  if (now.getTime() >= deadline.getTime() - 3 * DAY_MS) {
    return sent.d3 ? null : { send: '3d', mark: ['7d', '3d'] }
  }
  if (now.getTime() >= deadline.getTime() - 7 * DAY_MS) {
    return sent.d7 ? null : { send: '7d', mark: ['7d'] }
  }
  return null
}

const firstName = (name: string | null) => name?.trim().split(/\s+/)[0] || 'there'
const kes = (value: number) => `KSh ${Number(value).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`

async function sendReminders(now: Date): Promise<number> {
  const due = await query(
    `SELECT p.id, p.deadline_at, (p.total_amount - p.amount_paid)::float AS left_to_pay,
            p.reminded_7d_at IS NOT NULL AS d7, p.reminded_3d_at IS NOT NULL AS d3, p.reminded_0d_at IS NOT NULL AS d0,
            e.title AS event_title, u.name, u.email, COALESCE(u.whatsapp, u.phone_normalized) AS phone
     FROM ticket_payment_plans p
     JOIN events e ON e.id = p.event_id
     JOIN users u ON u.id = p.user_id
     WHERE p.status = 'active' AND p.amount_paid > 0 AND p.amount_paid < p.total_amount
       AND p.deadline_at IS NOT NULL AND p.deadline_at >= $1
       AND p.deadline_at <= $1::timestamptz + INTERVAL '8 days'
       AND (p.reminded_0d_at IS NULL)
     ORDER BY p.deadline_at
     LIMIT ${MAX_REMINDERS_PER_TICK}`,
    [now]
  )
  let reminded = 0
  for (const row of due.rows) {
    const deadline = new Date(row.deadline_at)
    const stage = dueReminderStage(deadline, now, { d7: row.d7, d3: row.d3, d0: row.d0 })
    if (!stage) continue
    const data = {
      name: row.name ?? null,
      eventTitle: row.event_title,
      leftToPay: Number(row.left_to_pay),
      deadline,
      stage: stage.send,
    }
    const [email, whatsapp] = await Promise.all([
      row.email
        ? sendEmail({
            to: row.email,
            subject:
              stage.send === '0d'
                ? `Last day to pay — ${row.event_title}`
                : `Ticket payment reminder — ${row.event_title}`,
            html: buildPaymentReminderEmailHTML(data),
            text: buildPaymentReminderEmailText(data),
          }).then((r) => r.success)
        : Promise.resolve(false),
      row.phone
        ? sendPaymentReminder(row.phone, {
            firstName: firstName(row.name),
            amount: kes(data.leftToPay),
            eventTitle: row.event_title,
            dueDate: deadline.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' }),
          })
        : Promise.resolve(false),
    ])
    // Marked even on failure so a broken address isn't retried every hour.
    const columns = stage.mark.map((s) => `reminded_${s}_at = COALESCE(reminded_${s}_at, $2)`).join(', ')
    await query(`UPDATE ticket_payment_plans SET ${columns} WHERE id = $1`, [row.id, now])
    if (email || whatsapp) reminded++
  }
  return reminded
}

async function notifyExpired(plan: ClosedPlan) {
  const user = await query('SELECT name, email FROM users WHERE id = $1', [plan.userId])
  const row = user.rows[0]
  if (!row?.email) return
  const data = { name: row.name ?? null, eventTitle: plan.eventTitle, credited: plan.credited, expiresAt: plan.expiresAt }
  await sendEmail({
    to: row.email,
    subject: `Payment deadline passed — ${plan.eventTitle}`,
    html: buildPlanExpiredEmailHTML(data),
    text: buildPlanExpiredEmailText(data),
  })
}

/** Plans past their payment deadline, plus plans whose first payment never arrived. */
async function closeStalePlans(now: Date): Promise<{ expired: number; released: number }> {
  const stale = await query(
    `SELECT p.id, (p.deadline_at < $1) AS past_deadline
     FROM ticket_payment_plans p
     WHERE p.status = 'active'
       AND (
         p.deadline_at < $1
         OR (p.amount_paid = 0 AND p.created_at < $1::timestamptz - make_interval(hours => $2))
       )`,
    [now, UNPAID_DEPOSIT_HOURS]
  )
  let expired = 0
  let released = 0
  const events = new Set<string>()
  for (const row of stale.rows) {
    const closed = await expirePlan(row.id)
    if (!closed) continue
    events.add(closed.eventId)
    if (row.past_deadline && closed.credited > 0) {
      expired++
      notifyExpired(closed).catch((error) => console.error(`Plan expiry email failed for ${row.id}:`, error))
    } else {
      released++
    }
  }
  for (const eventId of events) await notifyWaitlist(eventId)
  return { expired, released }
}

export async function runInstallmentTick(now = new Date()): Promise<InstallmentTickResult> {
  const { expired, released } = await closeStalePlans(now)
  const reminded = await sendReminders(now)
  return { reminded, expired, released }
}

let timer: NodeJS.Timeout | null = null
let isRunning = false

async function tick() {
  if (isRunning) return
  isRunning = true
  try {
    const { reminded, expired, released } = await runInstallmentTick()
    if (reminded || expired || released) {
      console.log(`💳 Payment plans: ${reminded} reminded, ${expired} missed deadline, ${released} released (no first payment)`)
    }
  } catch (error: any) {
    console.error('⚠️  Payment plan job failed:', error?.message || error)
  } finally {
    isRunning = false
  }
}

export function startInstallmentScheduler(): void {
  if (timer) return
  if (process.env.INSTALLMENT_JOBS_ENABLED === 'false' || process.env.NODE_ENV === 'test') return
  timer = setInterval(tick, TICK_MS)
  void tick()
  console.log('✓ Payment plan reminders and deadlines scheduled (hourly)')
}

export function stopInstallmentScheduler(): void {
  if (timer) clearInterval(timer)
  timer = null
}
