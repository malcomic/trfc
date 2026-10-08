import { query } from '../config/db.js'
import { getCheapestLiveOffer } from '../controllers/flashSalesController.js'
import { sendEmail } from '../utils/emailService.js'
import {
  FLASH_REMINDER_SUBJECTS,
  buildFlashReminderEmailHTML,
  buildFlashReminderEmailText,
  type FlashReminderStage,
} from '../utils/emailTemplates.js'
import { FLASH_ACCESS_HOURS, buildFlashSalesUrl } from '../utils/flashAccess.js'

/** Minutes after the ticket was paid at which each reminder is due. */
export const FLASH_REMINDER_STAGES: Array<{ stage: FlashReminderStage; afterMinutes: number }> = [
  { stage: 1, afterMinutes: 5 },
  { stage: 2, afterMinutes: 12 * 60 + 5 },
  { stage: 3, afterMinutes: 23 * 60 + 5 },
]

const TICK_MS = 60_000
const MAX_SENDS_PER_TICK = 50

export interface FlashReminderTickResult {
  sent: number
  failed: number
}

/** Latest stage due for a ticket paid at `paidAt`, or null if none is due yet or access has closed. */
export function dueFlashReminderStage(paidAt: Date, now: Date): FlashReminderStage | null {
  const elapsedMinutes = (now.getTime() - paidAt.getTime()) / 60_000
  if (elapsedMinutes >= FLASH_ACCESS_HOURS * 60) return null
  let due: FlashReminderStage | null = null
  for (const { stage, afterMinutes } of FLASH_REMINDER_STAGES) {
    if (elapsedMinutes >= afterMinutes) due = stage
  }
  return due
}

// For each address, the earliest paid ticket whose flash window is still open,
// skipping anyone who already has a paid order containing a flash item.
const CANDIDATES_SQL = `
  SELECT DISTINCT ON (c.email) c.ticket_id, c.email, c.paid_at,
    COALESCE((SELECT MAX(r.stage) FROM flash_reminder_emails r WHERE r.ticket_id = c.ticket_id), 0)::int AS last_stage
  FROM (
    SELECT t.id AS ticket_id, LOWER(TRIM(COALESCE(NULLIF(TRIM(t.email), ''), u.email))) AS email, t.paid_at, t.user_id, t.phone
    FROM tickets t
    LEFT JOIN users u ON u.id = t.user_id
    WHERE t.payment_status = 'paid'
      AND t.paid_at IS NOT NULL
      AND t.paid_at + INTERVAL '${FLASH_ACCESS_HOURS} hours' > $1
      AND t.paid_at + INTERVAL '${FLASH_REMINDER_STAGES[0].afterMinutes} minutes' <= $1
      AND NULLIF(TRIM(COALESCE(NULLIF(TRIM(t.email), ''), u.email)), '') IS NOT NULL
  ) c
  WHERE NOT EXISTS (
    SELECT 1
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.payment_status = 'paid'
      AND oi.flash_sale_id IS NOT NULL
      AND (
        (c.user_id IS NOT NULL AND o.user_id = c.user_id)
        OR LOWER(o.email) = c.email
        OR (c.phone IS NOT NULL AND o.phone = c.phone)
      )
  )
  ORDER BY c.email, c.paid_at ASC
`

async function claimStage(email: string, ticketId: string, stage: FlashReminderStage, status = 'sending') {
  const result = await query(
    `INSERT INTO flash_reminder_emails (email, ticket_id, stage, status)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [email, ticketId, stage, status]
  )
  return (result.rows[0]?.id as string | undefined) ?? null
}

async function finishStage(id: string, status: 'sent' | 'failed', error?: string) {
  await query(
    `UPDATE flash_reminder_emails
     SET status = $2, error = $3, sent_at = $4
     WHERE id = $1`,
    [id, status, error ?? null, status === 'sent' ? new Date() : null]
  )
}

export async function runFlashReminderTick(now = new Date()): Promise<FlashReminderTickResult> {
  const summary: FlashReminderTickResult = { sent: 0, failed: 0 }

  const offer = await getCheapestLiveOffer()
  if (!offer) return summary

  const candidates = await query(CANDIDATES_SQL, [now])

  for (const row of candidates.rows) {
    if (summary.sent + summary.failed >= MAX_SENDS_PER_TICK) break

    const email = String(row.email)
    const ticketId = String(row.ticket_id)
    const lastStage = Number(row.last_stage) || 0
    const stage = dueFlashReminderStage(new Date(row.paid_at), now)
    if (!stage || lastStage >= stage) continue

    const claimId = await claimStage(email, ticketId, stage)
    if (!claimId) {
      console.warn(`⚠️  Flash reminder stage ${stage} already claimed for ticket ${ticketId}`)
      continue
    }

    for (let skipped = lastStage + 1; skipped < stage; skipped++) {
      await claimStage(email, ticketId, skipped as FlashReminderStage, 'skipped')
    }

    const flashUrl = await buildFlashSalesUrl(ticketId)
    if (!flashUrl) {
      await finishStage(claimId, 'failed', 'Flash access closed before sending')
      summary.failed++
      continue
    }

    const data = { salePrice: offer.salePrice, regularPrice: offer.regularPrice, flashUrl }
    const result = await sendEmail({
      to: email,
      subject: FLASH_REMINDER_SUBJECTS[stage],
      html: buildFlashReminderEmailHTML(stage, data),
      text: buildFlashReminderEmailText(stage, data),
    })

    if (result.success) {
      await finishStage(claimId, 'sent')
      summary.sent++
    } else {
      await finishStage(claimId, 'failed', result.error)
      summary.failed++
    }
  }

  return summary
}

let timer: NodeJS.Timeout | null = null
let isRunning = false

async function tick() {
  if (isRunning) return
  isRunning = true
  try {
    const { sent, failed } = await runFlashReminderTick()
    if (sent || failed) console.log(`✉️  Flash reminders: ${sent} sent, ${failed} failed`)
  } catch (error: any) {
    console.error('⚠️  Flash reminder check failed:', error?.message || error)
  } finally {
    isRunning = false
  }
}

export function startFlashReminderScheduler(): void {
  if (timer) return
  if (process.env.FLASH_REMINDERS_ENABLED === 'false' || process.env.NODE_ENV === 'test') return
  timer = setInterval(tick, TICK_MS)
  void tick()
  console.log('✓ Flash reminder emails scheduled (every 60s)')
}

export function stopFlashReminderScheduler(): void {
  if (timer) clearInterval(timer)
  timer = null
}
