import { query } from '../config/db.js'
import { sendEmail } from '../utils/emailService.js'
import {
  MEMBERSHIP_REMINDER_SUBJECTS,
  buildMembershipReminderEmailHTML,
  buildMembershipReminderEmailText,
  type MembershipReminderKind,
} from '../utils/emailTemplates.js'
import { expireStaleMembershipHolds, getMembershipSettings } from '../utils/membership.js'

const TICK_MS = 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const BATCH = 200
/** The last-chance reminder goes out this many days before the renewal price ends. */
const LAST_CHANCE_DAYS = 5

/** Which reminder is due for a year ending at `endsAt`; only the window the date falls in, so late runs never send stale ones. */
export function dueReminderKind(endsAt: Date, now: Date, graceDays: number): MembershipReminderKind | null {
  const diff = endsAt.getTime() - now.getTime()
  if (diff > 30 * DAY_MS) return null
  if (diff > 7 * DAY_MS) return 'd30'
  if (diff > 0) return 'd7'
  const since = -diff
  if (since >= graceDays * DAY_MS) return null
  if (graceDays > LAST_CHANCE_DAYS && since >= (graceDays - LAST_CHANCE_DAYS) * DAY_MS) return 'grace_d25'
  return 'expired'
}

/** Reminds each member about their latest year only; a renewal already paid moves the latest year forward. */
export async function sendMembershipReminders(now = new Date()): Promise<number> {
  const settings = await getMembershipSettings()
  const due = await query(
    `SELECT * FROM (
       SELECT DISTINCT ON (m.user_id) m.id, m.ends_at, u.name, u.email
       FROM memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.status = 'paid'
       ORDER BY m.user_id, m.ends_at DESC
     ) latest
     WHERE latest.ends_at <= $1::timestamptz + INTERVAL '30 days'
       AND latest.ends_at > $1::timestamptz - make_interval(days => $2)
     LIMIT ${BATCH}`,
    [now, settings.renewalGraceDays]
  )
  let sent = 0
  for (const row of due.rows) {
    const endsAt = new Date(row.ends_at)
    const kind = dueReminderKind(endsAt, now, settings.renewalGraceDays)
    if (!kind || !row.email) continue
    const claimed = await query(
      `INSERT INTO membership_reminders (membership_id, kind) VALUES ($1, $2)
       ON CONFLICT DO NOTHING RETURNING membership_id`,
      [row.id, kind]
    )
    if (claimed.rows.length === 0) continue
    const data = {
      name: row.name ?? null,
      endsAt,
      renewalPrice: settings.renewalPrice,
      renewalUntil: new Date(endsAt.getTime() + settings.renewalGraceDays * DAY_MS),
    }
    const result = await sendEmail({
      to: row.email,
      subject: MEMBERSHIP_REMINDER_SUBJECTS[kind],
      html: buildMembershipReminderEmailHTML(kind, data),
      text: buildMembershipReminderEmailText(kind, data),
    })
    if (result.success) sent++
  }
  return sent
}

export async function runMembershipTick(now = new Date()) {
  const holdsExpired = await expireStaleMembershipHolds()
  const reminded = await sendMembershipReminders(now)
  return { holdsExpired, reminded }
}

let timer: NodeJS.Timeout | null = null
let isRunning = false

async function tick() {
  if (isRunning) return
  isRunning = true
  try {
    const result = await runMembershipTick()
    if (result.holdsExpired > 0 || result.reminded > 0) {
      console.log(`👑 Membership: ${result.reminded} reminders sent, ${result.holdsExpired} payment holds expired`)
    }
  } catch (error: any) {
    console.error('⚠️  Membership job failed:', error?.message || error)
  } finally {
    isRunning = false
  }
}

export function startMembershipScheduler(): void {
  if (timer) return
  if (process.env.MEMBERSHIP_JOBS_ENABLED === 'false' || process.env.NODE_ENV === 'test') return
  timer = setInterval(tick, TICK_MS)
  void tick()
  console.log('✓ Membership reminders and payment hold expiry scheduled (hourly)')
}

export function stopMembershipScheduler(): void {
  if (timer) clearInterval(timer)
  timer = null
}
