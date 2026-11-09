import { query } from '../config/db.js'
import { sendEmail } from '../utils/emailService.js'
import { buildAnnouncementEmailHTML, buildAnnouncementEmailText } from '../utils/emailTemplates.js'
import { EMAILS_PER_TICK, signUnsubscribeToken } from '../utils/announcements.js'

const TICK_MS = 60_000
const STUCK_AFTER_MINUTES = 15

export interface AnnouncementEmailTickResult {
  sent: number
  failed: number
  released: number
}

/** Rows left in 'sending' by a crash or restart go back to the queue. */
const RELEASE_STUCK_SQL = `
  UPDATE announcement_emails SET status = 'pending', claimed_at = NULL
  WHERE status = 'sending' AND claimed_at < NOW() - make_interval(mins => $1)`

// SKIP LOCKED lets two server instances share the queue without claiming the same rows.
const CLAIM_SQL = `
  WITH batch AS (
    SELECT announcement_id, user_id FROM announcement_emails
    WHERE status = 'pending'
    ORDER BY announcement_id, user_id
    LIMIT $1
    FOR UPDATE SKIP LOCKED
  )
  UPDATE announcement_emails e SET status = 'sending', claimed_at = NOW()
  FROM batch, announcements a
  WHERE e.announcement_id = batch.announcement_id AND e.user_id = batch.user_id
    AND a.id = e.announcement_id
  RETURNING e.announcement_id, e.user_id, e.email, a.title, a.body, a.link_url, a.link_label, a.kind`

async function finish(announcementId: string, userId: string, success: boolean, error?: string) {
  await query(
    `UPDATE announcement_emails
     SET status = $3, error = $4, sent_at = CASE WHEN $3 = 'sent' THEN NOW() ELSE NULL END
     WHERE announcement_id = $1 AND user_id = $2`,
    [announcementId, userId, success ? 'sent' : 'failed', success ? null : error ?? 'Unknown email error']
  )
}

export async function runAnnouncementEmailTick(): Promise<AnnouncementEmailTickResult> {
  const summary: AnnouncementEmailTickResult = { sent: 0, failed: 0, released: 0 }

  const released = await query(RELEASE_STUCK_SQL, [STUCK_AFTER_MINUTES])
  summary.released = released.rowCount ?? 0

  const claimed = await query(CLAIM_SQL, [EMAILS_PER_TICK])
  for (const row of claimed.rows) {
    const data = {
      title: row.title,
      body: row.body,
      linkUrl: row.link_url,
      linkLabel: row.link_label,
      kind: row.kind,
      unsubscribeToken: row.kind === 'news' ? signUnsubscribeToken(row.user_id) : null,
    }
    try {
      const result = await sendEmail({
        to: row.email,
        subject: row.title,
        html: buildAnnouncementEmailHTML(data),
        text: buildAnnouncementEmailText(data),
      })
      await finish(row.announcement_id, row.user_id, result.success, result.error)
      if (result.success) summary.sent++
      else summary.failed++
    } catch (error: any) {
      await finish(row.announcement_id, row.user_id, false, error?.message)
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
    const { sent, failed } = await runAnnouncementEmailTick()
    if (sent || failed) console.log(`📣 Announcement emails: ${sent} sent, ${failed} failed`)
  } catch (error: any) {
    console.error('⚠️  Announcement email check failed:', error?.message || error)
  } finally {
    isRunning = false
  }
}

export function startAnnouncementEmailScheduler(): void {
  if (timer) return
  if (process.env.ANNOUNCEMENT_EMAILS_ENABLED === 'false' || process.env.NODE_ENV === 'test') return
  timer = setInterval(tick, TICK_MS)
  void tick()
  console.log(`✓ Announcement emails scheduled (${EMAILS_PER_TICK} every 60s)`)
}

export function stopAnnouncementEmailScheduler(): void {
  if (timer) clearInterval(timer)
  timer = null
}
