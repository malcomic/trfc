import { Request, Response } from 'express'
import { query } from '../config/db.js'
import { sendEmail } from '../utils/emailService.js'
import { buildAnnouncementEmailHTML, buildAnnouncementEmailText } from '../utils/emailTemplates.js'
import { isUuid } from '../utils/zones.js'
import {
  EMAILS_PER_TICK,
  audienceSql,
  emailRecipientsSql,
  isAnnouncementAudience,
  isAnnouncementKind,
  parseAnnouncementInput,
  signUnsubscribeToken,
  verifyUnsubscribeToken,
} from '../utils/announcements.js'
import { ANNOUNCEMENT_FIELDS as FIELDS, publishAnnouncement } from '../utils/publishAnnouncement.js'
import { hashIp, setMarketing } from '../utils/consents.js'

const MEMBER_LIST_LIMIT = 30
const ADMIN_LIST_LIMIT = 50

/** Announcements this user can see: targeted at them, sent after they joined, and not archived. */
const VISIBLE_TO_USER = `
  a.archived_at IS NULL
  AND a.published_at >= u.created_at
  AND (
    a.audience = 'all'
    OR (a.audience = 'members' AND ${audienceSql('members')})
    OR (a.audience = 'free' AND ${audienceSql('free')})
  )`

export async function createAnnouncement(req: Request, res: Response) {
  try {
    const input = parseAnnouncementInput(req.body)
    if (typeof input === 'string') return res.status(400).json({ error: input })

    res.status(201).json(await publishAnnouncement(input, req.user!.id))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to send the announcement' })
  }
}

export async function listAnnouncements(req: Request, res: Response) {
  try {
    const result = await query(
      `SELECT ${FIELDS.split(', ').map((f) => `a.${f}`).join(', ')},
              cu.name AS created_by_name,
              (SELECT COUNT(*)::int FROM announcement_reads r WHERE r.announcement_id = a.id) AS reads,
              COUNT(e.user_id) FILTER (WHERE e.status = 'sent')::int AS emails_sent,
              COUNT(e.user_id) FILTER (WHERE e.status = 'failed')::int AS emails_failed,
              COUNT(e.user_id) FILTER (WHERE e.status IN ('pending', 'sending'))::int AS emails_pending,
              COUNT(e.user_id)::int AS emails_total
       FROM announcements a
       LEFT JOIN users cu ON cu.id = a.created_by
       LEFT JOIN announcement_emails e ON e.announcement_id = a.id
       GROUP BY a.id, cu.name
       ORDER BY a.published_at DESC
       LIMIT ${ADMIN_LIST_LIMIT}`
    )
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load announcements' })
  }
}

export async function archiveAnnouncement(req: Request, res: Response) {
  try {
    const { id } = req.params
    if (!isUuid(id)) return res.status(404).json({ error: 'Announcement not found' })
    const result = await query(
      `UPDATE announcements SET archived_at = COALESCE(archived_at, NOW()) WHERE id = $1 RETURNING ${FIELDS}`,
      [id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Announcement not found' })
    await query(
      `UPDATE announcement_emails SET status = 'failed', error = 'Archived before sending'
       WHERE announcement_id = $1 AND status = 'pending'`,
      [id]
    )
    res.json(result.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to archive the announcement' })
  }
}

export async function getRecipientCount(req: Request, res: Response) {
  try {
    const { audience, kind } = req.query
    if (!isAnnouncementAudience(audience) || !isAnnouncementKind(kind)) {
      return res.status(400).json({ error: 'Choose an audience and a type' })
    }
    const sendEmail = req.query.sendEmail === 'true'
    const result = await query(
      `SELECT COUNT(*)::int AS dashboard,
              COUNT(*) FILTER (WHERE ${emailRecipientsSql(kind)})::int AS email
       FROM users u WHERE ${audienceSql(audience)}`
    )
    const row = result.rows[0] ?? { dashboard: 0, email: 0 }
    res.json({
      dashboard: row.dashboard,
      email: sendEmail ? row.email : 0,
      minutes: sendEmail ? Math.ceil(row.email / EMAILS_PER_TICK) : 0,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to count recipients' })
  }
}

export async function sendTestAnnouncementEmail(req: Request, res: Response) {
  try {
    const input = parseAnnouncementInput(req.body)
    if (typeof input === 'string') return res.status(400).json({ error: input })

    const me = await query('SELECT id, email FROM users WHERE id = $1', [req.user!.id])
    const to = me.rows[0]?.email
    if (!to) return res.status(400).json({ error: 'Your admin account has no email address' })

    const data = {
      title: input.title,
      body: input.body,
      linkUrl: input.linkUrl,
      linkLabel: input.linkLabel,
      kind: input.kind,
      unsubscribeToken: input.kind === 'news' ? signUnsubscribeToken(req.user!.id) : null,
    }
    const result = await sendEmail({
      to,
      subject: `[Test] ${input.title}`,
      html: buildAnnouncementEmailHTML(data),
      text: buildAnnouncementEmailText(data),
    })
    if (!result.success) return res.status(502).json({ error: result.error || 'The test email could not be sent' })
    res.json({ sentTo: to })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to send the test email' })
  }
}

export async function getMyAnnouncements(req: Request, res: Response) {
  try {
    const result = await query(
      `SELECT a.id, a.title, a.body, a.link_url, a.link_label, a.kind, a.published_at,
              (r.user_id IS NOT NULL) AS read
       FROM announcements a
       JOIN users u ON u.id = $1
       LEFT JOIN announcement_reads r ON r.announcement_id = a.id AND r.user_id = $1
       WHERE ${VISIBLE_TO_USER}
       ORDER BY a.published_at DESC
       LIMIT ${MEMBER_LIST_LIMIT}`,
      [req.user!.id]
    )
    const items = result.rows
    res.json({ items, unread: items.filter((item) => !item.read).length })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load notifications' })
  }
}

export async function markAnnouncementsRead(req: Request, res: Response) {
  try {
    const raw = req.body?.ids
    if (raw != null && (!Array.isArray(raw) || raw.some((id) => !isUuid(id)))) {
      return res.status(400).json({ error: 'Invalid notification ids' })
    }
    const ids: string[] | null = Array.isArray(raw) ? raw : null
    if (ids && ids.length === 0) return res.json({ ok: true })

    await query(
      `INSERT INTO announcement_reads (announcement_id, user_id)
       SELECT a.id, u.id FROM announcements a
       JOIN users u ON u.id = $1
       WHERE ${VISIBLE_TO_USER} ${ids ? 'AND a.id = ANY($2::uuid[])' : ''}
       ON CONFLICT DO NOTHING`,
      ids ? [req.user!.id, ids] : [req.user!.id]
    )
    res.json({ ok: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to update notifications' })
  }
}

export async function unsubscribeFromMarketing(req: Request, res: Response) {
  try {
    const userId = verifyUnsubscribeToken(req.body?.token)
    if (!userId) return res.status(400).json({ error: 'This unsubscribe link is invalid or has expired' })
    await setMarketing(userId, false, { source: 'unsubscribe_link', ipHash: hashIp(req.ip) })
    res.json({ ok: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to update your email preferences' })
  }
}
