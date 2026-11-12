import { query } from '../config/db.js'
import { audienceSql, emailRecipientsSql, type AnnouncementInput } from './announcements.js'

export const ANNOUNCEMENT_FIELDS = 'id, title, body, link_url, link_label, kind, audience, send_email, published_at, archived_at'

/** Saves an announcement and, when asked, queues its emails for the announcement email job. */
export async function publishAnnouncement(input: AnnouncementInput, createdBy: string | null) {
  const created = await query(
    `INSERT INTO announcements (title, body, link_url, link_label, kind, audience, send_email, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${ANNOUNCEMENT_FIELDS}`,
    [input.title, input.body, input.linkUrl, input.linkLabel, input.kind, input.audience, input.sendEmail, createdBy]
  )
  const announcement = created.rows[0]

  let queued = 0
  if (input.sendEmail) {
    const result = await query(
      `INSERT INTO announcement_emails (announcement_id, user_id, email)
       SELECT $1, u.id, TRIM(u.email) FROM users u
       WHERE ${audienceSql(input.audience)} AND ${emailRecipientsSql(input.kind)}
       ON CONFLICT DO NOTHING`,
      [announcement.id]
    )
    queued = result.rowCount ?? 0
  }
  return { announcement, queued }
}
