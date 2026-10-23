import { query } from '../config/db.js'
import { sendEmail } from '../utils/emailService.js'
import {
  buildInstallmentReminderEmailHTML,
  buildInstallmentReminderEmailText,
  buildPlanExpiredEmailHTML,
  buildPlanExpiredEmailText,
} from '../utils/emailTemplates.js'
import { expirePlan, type ClosedPlan } from '../utils/installments.js'
import { sendInstallmentReminder } from '../utils/whatsapp.js'

const TICK_MS = 60 * 60 * 1000
const MAX_REMINDERS_PER_TICK = 100
/** Plans with nothing paid this long after booking are released so the seats go back on sale. */
const UNPAID_DEPOSIT_HOURS = 24

export interface InstallmentTickResult {
  reminded: number
  expired: number
  released: number
}

// The next unpaid installment per active plan that is due within a day (or overdue),
// for members not reminded in the last 24 hours.
const REMINDER_SQL = `
  SELECT DISTINCT ON (p.id)
    i.id AS installment_id, i.amount::float AS amount, i.due_at, p.id AS plan_id,
    (p.total_amount - p.amount_paid)::float AS remaining,
    e.title AS event_title, u.name, u.email, COALESCE(u.whatsapp, u.phone_normalized) AS phone
  FROM ticket_plan_installments i
  JOIN ticket_payment_plans p ON p.id = i.plan_id
  JOIN events e ON e.id = p.event_id
  JOIN users u ON u.id = p.user_id
  WHERE p.status = 'active'
    AND p.amount_paid > 0
    AND i.paid_at IS NULL
    AND i.due_at <= $1::timestamptz + INTERVAL '24 hours'
    AND (i.last_reminded_at IS NULL OR i.last_reminded_at <= $1::timestamptz - INTERVAL '24 hours')
  ORDER BY p.id, i.seq
  LIMIT ${MAX_REMINDERS_PER_TICK}`

const firstName = (name: string | null) => name?.trim().split(/\s+/)[0] || 'there'
const kes = (value: number) => `KES ${Number(value).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`

async function sendReminders(now: Date): Promise<number> {
  const due = await query(REMINDER_SQL, [now])
  let reminded = 0
  for (const row of due.rows) {
    const dueAt = new Date(row.due_at)
    const data = {
      name: row.name ?? null,
      eventTitle: row.event_title,
      amountDue: Number(row.amount),
      dueAt,
      overdue: dueAt.getTime() < now.getTime(),
      remaining: Number(row.remaining),
    }
    const [email, whatsapp] = await Promise.all([
      row.email
        ? sendEmail({
            to: row.email,
            subject: `Installment ${data.overdue ? 'overdue' : 'due soon'} — ${row.event_title}`,
            html: buildInstallmentReminderEmailHTML(data),
            text: buildInstallmentReminderEmailText(data),
          }).then((r) => r.success)
        : Promise.resolve(false),
      row.phone
        ? sendInstallmentReminder(row.phone, {
            firstName: firstName(row.name),
            amount: kes(data.amountDue),
            eventTitle: row.event_title,
            dueDate: dueAt.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' }),
          })
        : Promise.resolve(false),
    ])
    // Mark even on failure so a broken address isn't retried every hour; it is retried tomorrow.
    await query('UPDATE ticket_plan_installments SET last_reminded_at = $2 WHERE id = $1', [row.installment_id, now])
    if (email || whatsapp) reminded++
  }
  return reminded
}

async function notifyExpired(plan: ClosedPlan) {
  const user = await query('SELECT name, email FROM users WHERE id = $1', [plan.userId])
  const row = user.rows[0]
  if (!row?.email) return
  const data = { name: row.name ?? null, eventTitle: plan.eventTitle, credited: plan.credited, balance: plan.balance }
  await sendEmail({
    to: row.email,
    subject: `Installment plan ended — ${plan.eventTitle}`,
    html: buildPlanExpiredEmailHTML(data),
    text: buildPlanExpiredEmailText(data),
  })
}

/**
 * Active plans whose event day has passed, plus plans whose first payment never arrived.
 * `events.event_date` is a timestamp without time zone holding Nairobi wall-clock time.
 */
async function closeStalePlans(now: Date): Promise<{ expired: number; released: number }> {
  const stale = await query(
    `SELECT p.id,
            (e.event_date::date < ($1::timestamptz AT TIME ZONE 'Africa/Nairobi')::date) AS past_event
     FROM ticket_payment_plans p
     JOIN events e ON e.id = p.event_id
     WHERE p.status = 'active'
       AND (
         e.event_date::date < ($1::timestamptz AT TIME ZONE 'Africa/Nairobi')::date
         OR (p.amount_paid = 0 AND p.created_at < $1::timestamptz - make_interval(hours => $2))
       )`,
    [now, UNPAID_DEPOSIT_HOURS]
  )
  let expired = 0
  let released = 0
  for (const row of stale.rows) {
    const closed = await expirePlan(row.id)
    if (!closed) continue
    if (row.past_event) {
      expired++
      notifyExpired(closed).catch((error) => console.error(`Plan expiry email failed for ${row.id}:`, error))
    } else {
      released++
    }
  }
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
      console.log(`💳 Installments: ${reminded} reminded, ${expired} expired, ${released} released (no deposit)`)
    }
  } catch (error: any) {
    console.error('⚠️  Installment job failed:', error?.message || error)
  } finally {
    isRunning = false
  }
}

export function startInstallmentScheduler(): void {
  if (timer) return
  if (process.env.INSTALLMENT_JOBS_ENABLED === 'false' || process.env.NODE_ENV === 'test') return
  timer = setInterval(tick, TICK_MS)
  void tick()
  console.log('✓ Installment reminders and expiry scheduled (hourly)')
}

export function stopInstallmentScheduler(): void {
  if (timer) clearInterval(timer)
  timer = null
}
