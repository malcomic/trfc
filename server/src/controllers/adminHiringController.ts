import { Request, Response } from 'express'
import { query } from '../config/db.js'
import {
  HIRING_CSV_COLUMNS,
  HIRING_STATUSES,
  NOTES_MAX,
  buildHiringWhere,
  isHiringStatus,
  parseHiringFilters,
  toHiringCsvRow,
} from '../utils/coachApplications.js'
import { toCsv } from '../utils/reachOut.js'
import { isUuid } from '../utils/zones.js'

const PAGE_SIZE = 25
const EXPORT_MAX_ROWS = 10_000

const LIST_FIELDS = `a.id, a.full_name, a.phone, a.email, a.location, a.social_url, a.experience,
  a.can_give_3_hours, a.hours, a.worked_harder, a.answers, a.video_url, a.video_source,
  a.status, a.handled_by, h.name AS handled_by_name, a.notes, a.status_changed_at,
  a.agreed_standards_at, a.agreed_storage_at, a.created_at, a.updated_at`
const FROM = 'FROM coach_applications a LEFT JOIN users h ON h.id = a.handled_by'

async function isAdminUser(userId: string): Promise<boolean> {
  const result = await query("SELECT 1 FROM users WHERE id = $1 AND role = 'admin'", [userId])
  return result.rows.length > 0
}

async function findApplication(id: string) {
  const result = await query(`SELECT ${LIST_FIELDS} ${FROM} WHERE a.id = $1`, [id])
  return result.rows[0] ?? null
}

export async function listApplications(req: Request, res: Response) {
  try {
    const filters = parseHiringFilters(req.query)
    const page = Math.max(1, Math.floor(Number(req.query.page)) || 1)
    const { where, params } = buildHiringWhere(filters)
    const countsWhere = buildHiringWhere(filters, { ignoreStatus: true })

    const [rows, total, counts] = await Promise.all([
      query(
        `SELECT ${LIST_FIELDS} ${FROM} ${where}
         ORDER BY a.created_at DESC
         LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
        params
      ),
      query(`SELECT COUNT(*)::int AS total FROM coach_applications a ${where}`, params),
      query(
        `SELECT a.status, COUNT(*)::int AS count FROM coach_applications a ${countsWhere.where} GROUP BY a.status`,
        countsWhere.params
      ),
    ])

    const statusCounts = Object.fromEntries(HIRING_STATUSES.map((s) => [s, 0])) as Record<string, number>
    for (const row of counts.rows) statusCounts[row.status] = row.count
    const all = Object.values(statusCounts).reduce((sum, n) => sum + n, 0)

    res.json({
      rows: rows.rows,
      total: total.rows[0]?.total ?? 0,
      page,
      pageSize: PAGE_SIZE,
      counts: { all, ...statusCounts },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load applications' })
  }
}

export async function exportApplications(req: Request, res: Response) {
  try {
    const { where, params } = buildHiringWhere(parseHiringFilters(req.query))
    const result = await query(
      `SELECT ${LIST_FIELDS} ${FROM} ${where} ORDER BY a.created_at DESC LIMIT ${EXPORT_MAX_ROWS}`,
      params
    )
    const date = new Date().toISOString().slice(0, 10)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="coach-applications-${date}.csv"`)
    res.send(toCsv(HIRING_CSV_COLUMNS, result.rows.map(toHiringCsvRow)))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to export applications' })
  }
}

export async function getApplication(req: Request, res: Response) {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Application not found' })
    const row = await findApplication(req.params.id)
    if (!row) return res.status(404).json({ error: 'Application not found' })
    res.json(row)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load application' })
  }
}

export async function updateApplication(req: Request, res: Response) {
  try {
    const { id } = req.params
    if (!isUuid(id)) return res.status(404).json({ error: 'Application not found' })
    const body = req.body ?? {}

    const current = await query('SELECT status, handled_by FROM coach_applications WHERE id = $1', [id])
    if (current.rows.length === 0) return res.status(404).json({ error: 'Application not found' })

    const sets: string[] = []
    const params: unknown[] = []
    const set = (column: string, value: unknown) => {
      params.push(value)
      sets.push(`${column} = $${params.length}`)
    }

    const statusChanged = body.status !== undefined && body.status !== current.rows[0].status
    if (body.status !== undefined) {
      if (!isHiringStatus(body.status)) return res.status(400).json({ error: 'Choose a valid status' })
      if (statusChanged) {
        set('status', body.status)
        sets.push('status_changed_at = NOW()')
      }
    }

    if (body.notes !== undefined) {
      if (body.notes !== null && typeof body.notes !== 'string') return res.status(400).json({ error: 'Notes must be text' })
      const notes = (body.notes ?? '').trim()
      if (notes.length > NOTES_MAX) return res.status(400).json({ error: `Notes can be up to ${NOTES_MAX} characters` })
      set('notes', notes || null)
    }

    if (body.handledBy !== undefined) {
      if (body.handledBy === null) {
        set('handled_by', null)
      } else {
        if (!isUuid(body.handledBy) || !(await isAdminUser(body.handledBy))) {
          return res.status(400).json({ error: 'Choose an admin to handle this application' })
        }
        set('handled_by', body.handledBy)
      }
    } else if (statusChanged && req.user?.id) {
      set('handled_by', req.user.id)
    }

    if (sets.length > 0) {
      params.push(id)
      await query(`UPDATE coach_applications SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length}`, params)
    }

    res.json(await findApplication(id))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to update application' })
  }
}

async function listAdmins() {
  const result = await query(
    "SELECT id, name, email FROM users WHERE role = 'admin' AND email IS NOT NULL ORDER BY name NULLS LAST, email"
  )
  return result.rows
}

export async function getHiringSettings(_req: Request, res: Response) {
  try {
    const [settings, admins] = await Promise.all([
      query('SELECT notify_user_id, updated_at FROM hiring_settings WHERE id = 1'),
      listAdmins(),
    ])
    const notifyUserId: string | null = settings.rows[0]?.notify_user_id ?? null
    res.json({
      notifyUserId: admins.some((a) => a.id === notifyUserId) ? notifyUserId : null,
      updatedAt: settings.rows[0]?.updated_at ?? null,
      admins,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load hiring settings' })
  }
}

export async function updateHiringSettings(req: Request, res: Response) {
  try {
    const notifyUserId = req.body?.notifyUserId ?? null
    if (notifyUserId !== null && (!isUuid(notifyUserId) || !(await isAdminUser(notifyUserId)))) {
      return res.status(400).json({ error: 'Choose one of the admin accounts' })
    }
    await query(
      `INSERT INTO hiring_settings (id, notify_user_id, updated_by, updated_at)
       VALUES (1, $1, $2, NOW())
       ON CONFLICT (id) DO UPDATE SET notify_user_id = EXCLUDED.notify_user_id,
         updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [notifyUserId, req.user?.id ?? null]
    )
    res.json({ notifyUserId, admins: await listAdmins() })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to save hiring settings' })
  }
}
