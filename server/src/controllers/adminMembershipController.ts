import { Request, Response } from 'express'
import { getClient, query } from '../config/db.js'
import { perkFromRow } from './membershipController.js'
import {
  MembershipError,
  cancelMembership,
  getMembershipSettings,
  grantMembership,
} from '../utils/membership.js'
import {
  MEMBER_CSV_COLUMNS,
  MEMBER_STATUS_FILTERS,
  MEMBER_TYPE_FILTERS,
  NOTE_MAX,
  memberStatusSql,
  parseGrant,
  parseMembershipSettings,
  parsePerkUpdate,
  type MemberStatusFilter,
} from '../utils/membershipAdmin.js'
import { toCsv } from '../utils/reachOut.js'
import { isUuid } from '../utils/zones.js'

const PAGE_SIZE = 25
const EXPORT_MAX_ROWS = 10_000

function settingsJson(s: Awaited<ReturnType<typeof getMembershipSettings>>) {
  return {
    standardPrice: s.standardPrice,
    foundingPrice: s.foundingPrice,
    foundingLimit: s.foundingLimit,
    foundingDeadline: s.foundingDeadline.toISOString(),
    renewalPrice: s.renewalPrice,
    renewalGraceDays: s.renewalGraceDays,
    salesOpenAt: s.salesOpenAt.toISOString(),
    salesPaused: s.salesPaused,
    updatedAt: s.updatedAt?.toISOString() ?? null,
  }
}

export async function getSummary(_req: Request, res: Response) {
  try {
    const settings = await getMembershipSettings()
    const result = await query(
      `SELECT
         (SELECT COUNT(*)::int FROM users WHERE member_until > NOW()) AS active,
         (SELECT COUNT(*)::int FROM users WHERE member_until > NOW() AND member_until <= NOW() + INTERVAL '30 days') AS expiring,
         (SELECT COUNT(*)::int FROM memberships WHERE price_type = 'founding' AND status = 'paid') AS founding_paid,
         (SELECT COUNT(*)::int FROM memberships
            WHERE price_type = 'founding' AND status = 'pending' AND hold_expires_at > NOW()) AS founding_held,
         (SELECT COUNT(*)::int FROM memberships WHERE over_limit AND status = 'paid') AS over_limit,
         (SELECT COALESCE(SUM(amount), 0)::float FROM memberships
            WHERE status = 'paid' AND paid_at >= date_trunc('year', NOW() AT TIME ZONE 'Africa/Nairobi') AT TIME ZONE 'Africa/Nairobi'
         ) AS revenue_this_year`
    )
    const row = result.rows[0]
    res.json({
      active: row.active,
      expiring: row.expiring,
      foundingPaid: row.founding_paid,
      foundingHeld: row.founding_held,
      foundingLimit: settings.foundingLimit,
      overLimit: row.over_limit,
      revenueThisYear: row.revenue_this_year,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load the membership summary' })
  }
}

function buildMembersQuery(q: Request['query'], graceDays: number) {
  const params: unknown[] = [graceDays]
  const where: string[] = []
  const status = String(q.status ?? '')
  if ((MEMBER_STATUS_FILTERS as readonly string[]).includes(status)) {
    where.push(memberStatusSql(status as MemberStatusFilter, '$1'))
  }
  const type = String(q.type ?? '')
  if (type === 'founding') {
    where.push('f.is_founding')
  } else if ((MEMBER_TYPE_FILTERS as readonly string[]).includes(type)) {
    params.push(type)
    where.push(`l.price_type = $${params.length}`)
  }
  const search = String(q.search ?? '').trim().slice(0, 100)
  if (search) {
    params.push(`%${search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`)
    const p = `$${params.length}`
    where.push(`(u.name ILIKE ${p} OR u.email ILIKE ${p} OR u.phone ILIKE ${p})`)
  }
  const sql = `
    WITH latest AS (
      SELECT DISTINCT ON (user_id) id, user_id, price_type, amount, starts_at, ends_at, mpesa_receipt, over_limit
      FROM memberships WHERE status = 'paid'
      ORDER BY user_id, ends_at DESC
    ),
    f AS (
      SELECT user_id,
             BOOL_OR(price_type = 'founding') AS is_founding,
             BOOL_OR(over_limit) AS any_over_limit,
             COUNT(*)::int AS years
      FROM memberships WHERE status = 'paid' GROUP BY user_id
    )
    SELECT u.id AS user_id, u.name, u.email, u.phone, u.member_until,
           l.id AS membership_id, l.price_type, l.amount::float AS amount, l.starts_at, l.mpesa_receipt,
           COALESCE(f.is_founding, false) AS is_founding, COALESCE(f.any_over_limit, false) AS over_limit,
           COALESCE(f.years, 0) AS years,
           CASE
             WHEN u.member_until > NOW() + INTERVAL '30 days' THEN 'active'
             WHEN u.member_until > NOW() THEN 'expiring'
             WHEN u.member_until > NOW() - make_interval(days => $1) THEN 'grace'
             ELSE 'lapsed'
           END AS status
    FROM latest l
    JOIN users u ON u.id = l.user_id
    LEFT JOIN f ON f.user_id = l.user_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`
  return { sql, params }
}

export async function listMembers(req: Request, res: Response) {
  try {
    const settings = await getMembershipSettings()
    const page = Math.max(1, Math.floor(Number(req.query.page)) || 1)
    const { sql, params } = buildMembersQuery(req.query, settings.renewalGraceDays)
    const [rows, total] = await Promise.all([
      query(`${sql} ORDER BY u.member_until DESC NULLS LAST LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`, params),
      query(`SELECT COUNT(*)::int AS total FROM (${sql}) t`, params),
    ])
    res.json({ rows: rows.rows, total: total.rows[0]?.total ?? 0, page, pageSize: PAGE_SIZE })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load members' })
  }
}

export async function exportMembers(req: Request, res: Response) {
  try {
    const settings = await getMembershipSettings()
    const { sql, params } = buildMembersQuery(req.query, settings.renewalGraceDays)
    const result = await query(`${sql} ORDER BY u.member_until DESC NULLS LAST LIMIT ${EXPORT_MAX_ROWS}`, params)
    const date = new Date().toISOString().slice(0, 10)
    const rows = result.rows.map((r: any) => ({
      ...r,
      starts_at: r.starts_at ? new Date(r.starts_at).toISOString().slice(0, 10) : '',
      member_until: r.member_until ? new Date(r.member_until).toISOString().slice(0, 10) : '',
      is_founding: r.is_founding ? 'Yes' : 'No',
      over_limit: r.over_limit ? 'Yes' : 'No',
    }))
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="members-${date}.csv"`)
    res.send(toCsv(MEMBER_CSV_COLUMNS, rows))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to export members' })
  }
}

export async function getMemberYears(req: Request, res: Response) {
  try {
    if (!isUuid(req.params.userId)) return res.status(404).json({ error: 'Member not found' })
    const result = await query(
      `SELECT m.id, m.price_type, m.amount::float AS amount, m.status, m.starts_at, m.ends_at, m.mpesa_receipt,
              m.phone, m.note, m.over_limit, m.paid_at, m.cancelled_at, m.created_at, g.name AS granted_by_name
       FROM memberships m LEFT JOIN users g ON g.id = m.granted_by
       WHERE m.user_id = $1 AND m.status IN ('paid', 'cancelled')
       ORDER BY m.starts_at DESC`,
      [req.params.userId]
    )
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load membership years' })
  }
}

export async function grant(req: Request, res: Response) {
  const parsed = parseGrant(req.body)
  if (!parsed.ok) return res.status(400).json({ error: parsed.error })
  if (!isUuid(parsed.value.userId)) return res.status(404).json({ error: 'User not found' })
  try {
    const row = await grantMembership(req.user!.id, parsed.value.userId, parsed.value.months, parsed.value.note)
    res.status(201).json(row)
  } catch (error) {
    if (error instanceof MembershipError) return res.status(error.status).json({ error: error.message })
    console.error(error)
    res.status(500).json({ error: 'Failed to add membership' })
  }
}

export async function cancel(req: Request, res: Response) {
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Membership not found' })
  const note = typeof req.body?.note === 'string' ? req.body.note.trim() : ''
  if (!note) return res.status(400).json({ error: 'Add a note saying why' })
  if (note.length > NOTE_MAX) return res.status(400).json({ error: `Note can be up to ${NOTE_MAX} characters` })
  try {
    const result = await cancelMembership(req.params.id, note)
    res.json({ userId: result.userId, memberUntil: result.memberUntil?.toISOString() ?? null })
  } catch (error) {
    if (error instanceof MembershipError) return res.status(error.status).json({ error: error.message })
    console.error(error)
    res.status(500).json({ error: 'Failed to cancel membership' })
  }
}

export async function getSettings(_req: Request, res: Response) {
  try {
    res.json(settingsJson(await getMembershipSettings()))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load membership settings' })
  }
}

export async function updateSettings(req: Request, res: Response) {
  const parsed = parseMembershipSettings(req.body)
  if (!parsed.ok) return res.status(400).json({ error: parsed.error })
  const s = parsed.value
  try {
    await query(
      `UPDATE membership_settings
       SET standard_price = $1, founding_price = $2, founding_limit = $3, founding_deadline = $4,
           renewal_price = $5, renewal_grace_days = $6, sales_open_at = $7, sales_paused = $8,
           updated_by = $9, updated_at = NOW()
       WHERE id = 1`,
      [
        s.standardPrice,
        s.foundingPrice,
        s.foundingLimit,
        s.foundingDeadline,
        s.renewalPrice,
        s.renewalGraceDays,
        s.salesOpenAt,
        s.salesPaused,
        req.user?.id ?? null,
      ]
    )
    res.json(settingsJson(await getMembershipSettings()))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to save membership settings' })
  }
}

export async function listPerks(_req: Request, res: Response) {
  try {
    const result = await query('SELECT * FROM member_perks ORDER BY sort_order, title')
    res.json(result.rows.map(perkFromRow))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load perks' })
  }
}

const PERK_COLUMNS: Record<string, string> = {
  title: 'title',
  description: 'description',
  status: 'status',
  icon: 'icon',
  linkUrl: 'link_url',
  buttonLabel: 'button_label',
  sortOrder: 'sort_order',
  settings: 'settings',
}

export async function updatePerk(req: Request, res: Response) {
  const parsed = parsePerkUpdate(req.body)
  if (!parsed.ok) return res.status(400).json({ error: parsed.error })
  try {
    const sets: string[] = []
    const params: unknown[] = []
    for (const [field, value] of Object.entries(parsed.value)) {
      params.push(field === 'settings' ? JSON.stringify(value) : value)
      sets.push(`${PERK_COLUMNS[field]} = $${params.length}${field === 'settings' ? '::jsonb' : ''}`)
    }
    params.push(req.user?.id ?? null)
    sets.push(`updated_by = $${params.length}`, 'updated_at = NOW()')
    params.push(String(req.params.key))
    const result = await query(
      `UPDATE member_perks SET ${sets.join(', ')} WHERE key = $${params.length} RETURNING *`,
      params
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Perk not found' })
    res.json(perkFromRow(result.rows[0]))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to save perk' })
  }
}

export async function reorderPerks(req: Request, res: Response) {
  const keys = req.body?.keys
  if (!Array.isArray(keys) || keys.length === 0 || keys.length > 200 || !keys.every((k) => typeof k === 'string')) {
    return res.status(400).json({ error: 'Send the perks in their new order' })
  }
  if (new Set(keys).size !== keys.length) return res.status(400).json({ error: 'Each perk can appear once' })
  const client = await getClient()
  try {
    await client.query('BEGIN')
    for (let i = 0; i < keys.length; i++) {
      await client.query(
        'UPDATE member_perks SET sort_order = $1, updated_by = $2, updated_at = NOW() WHERE key = $3',
        [(i + 1) * 10, req.user?.id ?? null, keys[i]]
      )
    }
    await client.query('COMMIT')
    const result = await query('SELECT * FROM member_perks ORDER BY sort_order, title')
    res.json(result.rows.map(perkFromRow))
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    console.error(error)
    res.status(500).json({ error: 'Failed to reorder perks' })
  } finally {
    client.release()
  }
}
