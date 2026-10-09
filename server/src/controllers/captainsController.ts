import { Request, Response } from 'express'
import { query, getClient } from '../config/db.js'
import { findActiveCaptainByCode, normalizeReferralCode } from '../utils/referrals.js'
import { toKenyanMsisdn } from '../utils/phone.js'
import { slugify } from '../utils/slugify.js'
import { syncCaptainCommissions } from '../utils/captainCommissions.js'
import { generateTextQRCodeDataUrl } from '../utils/qrCodeGenerator.js'

const COMMISSION_STATUSES = ['pending', 'approved', 'paid', 'reversed'] as const
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const COMMISSION_TOTALS_SQL = `
  COALESCE(SUM(cc.base_amount) FILTER (WHERE cc.status <> 'reversed'), 0)::float AS referred_sales,
  COALESCE(SUM(cc.amount) FILTER (WHERE cc.status = 'pending'), 0)::float AS pending_amount,
  COALESCE(SUM(cc.amount) FILTER (WHERE cc.status = 'approved'), 0)::float AS approved_amount,
  COALESCE(SUM(cc.amount) FILTER (WHERE cc.status = 'paid'), 0)::float AS paid_amount`

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string })?.code === '23505'
}

function maskName(name: string | null | undefined): string {
  if (!name) return 'Customer'
  const [first, ...rest] = name.trim().split(/\s+/)
  const lastInitial = rest.length ? ` ${rest[rest.length - 1][0].toUpperCase()}.` : ''
  return `${first}${lastInitial}`
}

function parseRate(value: unknown): number | null {
  const rate = Number(value)
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) return null
  return Math.round(rate * 10000) / 10000
}

function parsePagination(req: Request) {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1)
  const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10) || 50))
  return { page, limit, offset: (page - 1) * limit }
}

async function generateReferralCode(regionCode: string, name: string): Promise<string> {
  const first = (name.trim().split(/\s+/)[0] || 'CAPT').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8) || 'CAPT'
  for (let attempt = 0; attempt < 25; attempt++) {
    const digits = String(Math.floor(Math.random() * 90) + 10)
    const code = `${regionCode}-${first}${digits}`
    const taken = await query('SELECT 1 FROM captains WHERE referral_code = $1', [code])
    if (taken.rows.length === 0) return code
  }
  throw new Error('Could not generate a unique referral code')
}

// ---------- Public ----------

export async function getReferrer(req: Request, res: Response) {
  try {
    const captain = await findActiveCaptainByCode(req.params.code)
    if (!captain) {
      return res.status(404).json({ error: 'Referral code not found' })
    }
    res.json({
      code: captain.referral_code,
      name: maskName(captain.name),
      region: captain.region_name,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to look up referral code' })
  }
}

// ---------- Captain ----------

export async function getMyCaptainProfile(req: Request, res: Response) {
  try {
    const captainId = req.user!.id
    const profile = await query(
      `SELECT c.user_id, c.referral_code, c.commission_rate::float AS commission_rate, c.payout_phone,
              c.status, c.created_at, u.name, u.email, u.phone,
              r.id AS region_id, r.name AS region_name, r.code AS region_code
       FROM captains c
       JOIN users u ON u.id = c.user_id
       JOIN regions r ON r.id = c.region_id
       WHERE c.user_id = $1`,
      [captainId]
    )
    if (profile.rows.length === 0) {
      return res.status(404).json({ error: 'Captain profile not found' })
    }

    const stats = await query(
      `SELECT
         (SELECT COUNT(*)::int FROM users WHERE referred_by_captain_id = $1) AS referred_customers,
         ${COMMISSION_TOTALS_SQL}
       FROM captain_commissions cc
       WHERE cc.captain_id = $1`,
      [captainId]
    )

    res.json({ ...profile.rows[0], stats: stats.rows[0] })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch captain profile' })
  }
}

export async function getMyReferrals(req: Request, res: Response) {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.referred_at,
              COUNT(cc.id) FILTER (WHERE cc.status <> 'reversed')::int AS purchases,
              COALESCE(SUM(cc.base_amount) FILTER (WHERE cc.status <> 'reversed'), 0)::float AS total_spent,
              COALESCE(SUM(cc.amount) FILTER (WHERE cc.status <> 'reversed'), 0)::float AS commission_earned
       FROM users u
       LEFT JOIN captain_commissions cc ON cc.referred_user_id = u.id AND cc.captain_id = $1
       WHERE u.referred_by_captain_id = $1
       GROUP BY u.id
       ORDER BY u.referred_at DESC NULLS LAST
       LIMIT 500`,
      [req.user!.id]
    )
    res.json(result.rows.map(({ name, ...row }) => ({ ...row, name: maskName(name) })))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch referrals' })
  }
}

export async function getMyCommissions(req: Request, res: Response) {
  try {
    const { page, limit, offset } = parsePagination(req)
    const params: unknown[] = [req.user!.id]
    let statusFilter = ''
    if (COMMISSION_STATUSES.includes(req.query.status as never)) {
      params.push(req.query.status)
      statusFilter = `AND cc.status = $${params.length}`
    }

    const total = await query(
      `SELECT COUNT(*)::int AS count FROM captain_commissions cc WHERE cc.captain_id = $1 ${statusFilter}`,
      params
    )
    const rows = await query(
      `SELECT cc.id, cc.source_type, cc.base_amount::float AS base_amount, cc.rate::float AS rate,
              cc.amount::float AS amount, cc.status, cc.created_at, cc.approved_at, u.name AS customer_name
       FROM captain_commissions cc
       LEFT JOIN users u ON u.id = cc.referred_user_id
       WHERE cc.captain_id = $1 ${statusFilter}
       ORDER BY cc.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    )
    res.json({
      commissions: rows.rows.map(({ customer_name, ...row }) => ({ ...row, customer_name: maskName(customer_name) })),
      total: total.rows[0].count,
      page,
      limit,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch commissions' })
  }
}

export async function getMyReferralQr(req: Request, res: Response) {
  try {
    let origin: string
    try {
      const parsed = new URL(String(req.query.origin ?? ''))
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('bad protocol')
      origin = parsed.origin
    } catch {
      return res.status(400).json({ error: 'A valid origin is required' })
    }
    const result = await query('SELECT referral_code FROM captains WHERE user_id = $1', [req.user!.id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'Captain profile not found' })
    const link = `${origin}/register?ref=${encodeURIComponent(result.rows[0].referral_code)}`
    res.json({ link, dataUrl: await generateTextQRCodeDataUrl(link) })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to generate QR code' })
  }
}

export async function getMyPayouts(req: Request, res: Response) {
  try {
    const result = await query(
      `SELECT p.id, p.amount::float AS amount, p.mpesa_receipt, p.note, p.paid_at,
              (SELECT COUNT(*)::int FROM captain_commissions cc WHERE cc.payout_id = p.id) AS commission_count
       FROM captain_payouts p
       WHERE p.captain_id = $1
       ORDER BY p.paid_at DESC`,
      [req.user!.id]
    )
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch payouts' })
  }
}

// ---------- Admin: regions ----------

export async function getRegions(_req: Request, res: Response) {
  try {
    const result = await query(
      `SELECT r.*, (SELECT COUNT(*)::int FROM captains c WHERE c.region_id = r.id AND c.status = 'active') AS captain_count
       FROM regions r
       ORDER BY r.is_active DESC, r.name ASC`
    )
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch regions' })
  }
}

function parseRegionBody(body: Record<string, unknown>) {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : ''
  if (!name || name.length > 100) return { error: 'Region name is required (max 100 characters)' }
  if (!/^[A-Z]{2,5}$/.test(code)) return { error: 'Region code must be 2-5 letters, e.g. NRB' }
  return { name, code, slug: slugify(name) }
}

export async function createRegion(req: Request, res: Response) {
  try {
    const parsed = parseRegionBody(req.body ?? {})
    if ('error' in parsed) return res.status(400).json({ error: parsed.error })
    const result = await query(
      'INSERT INTO regions (name, slug, code) VALUES ($1, $2, $3) RETURNING *',
      [parsed.name, parsed.slug, parsed.code]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    if (isUniqueViolation(error)) {
      return res.status(400).json({ error: 'A region with that name or code already exists' })
    }
    console.error(error)
    res.status(500).json({ error: 'Failed to create region' })
  }
}

export async function updateRegion(req: Request, res: Response) {
  try {
    const parsed = parseRegionBody(req.body ?? {})
    if ('error' in parsed) return res.status(400).json({ error: parsed.error })
    const isActive = req.body?.is_active !== undefined ? Boolean(req.body.is_active) : true
    const result = await query(
      'UPDATE regions SET name = $1, slug = $2, code = $3, is_active = $4 WHERE id = $5 RETURNING *',
      [parsed.name, parsed.slug, parsed.code, isActive, req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Region not found' })
    res.json(result.rows[0])
  } catch (error) {
    if (isUniqueViolation(error)) {
      return res.status(400).json({ error: 'A region with that name or code already exists' })
    }
    console.error(error)
    res.status(500).json({ error: 'Failed to update region' })
  }
}

export async function deleteRegion(req: Request, res: Response) {
  try {
    const result = await query('UPDATE regions SET is_active = false WHERE id = $1 RETURNING id', [req.params.id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'Region not found' })
    res.json({ message: 'Region deactivated' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to deactivate region' })
  }
}

// ---------- Admin: captains ----------

export async function getAdminCaptains(req: Request, res: Response) {
  try {
    const params: unknown[] = []
    const conditions: string[] = []
    if (typeof req.query.regionId === 'string' && UUID_PATTERN.test(req.query.regionId)) {
      params.push(req.query.regionId)
      conditions.push(`c.region_id = $${params.length}`)
    }
    if (req.query.status === 'active' || req.query.status === 'suspended') {
      params.push(req.query.status)
      conditions.push(`c.status = $${params.length}`)
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await query(
      `SELECT c.user_id, c.referral_code, c.commission_rate::float AS commission_rate, c.payout_phone,
              c.status, c.created_at, u.name, u.email, u.phone,
              r.id AS region_id, r.name AS region_name, r.code AS region_code,
              (SELECT COUNT(*)::int FROM users ru WHERE ru.referred_by_captain_id = c.user_id) AS referred_customers,
              ${COMMISSION_TOTALS_SQL}
       FROM captains c
       JOIN users u ON u.id = c.user_id
       JOIN regions r ON r.id = c.region_id
       LEFT JOIN captain_commissions cc ON cc.captain_id = c.user_id
       ${where}
       GROUP BY c.user_id, u.id, r.id
       ORDER BY referred_sales DESC, u.name ASC`,
      params
    )
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch captains' })
  }
}

export async function createCaptain(req: Request, res: Response) {
  const { userId, regionId, referralCode, commissionRate, payoutPhone } = req.body ?? {}
  if (typeof userId !== 'string' || !UUID_PATTERN.test(userId)) {
    return res.status(400).json({ error: 'A valid userId is required' })
  }
  if (typeof regionId !== 'string' || !UUID_PATTERN.test(regionId)) {
    return res.status(400).json({ error: 'A valid regionId is required' })
  }
  const rate = commissionRate === undefined || commissionRate === null || commissionRate === '' ? 0.1 : parseRate(commissionRate)
  if (rate === null) {
    return res.status(400).json({ error: 'Commission rate must be between 0 and 1 (e.g. 0.10 for 10%)' })
  }
  let code: string | null = null
  if (referralCode) {
    code = normalizeReferralCode(referralCode)
    if (!code) return res.status(400).json({ error: 'Referral code must be 3-20 letters, numbers or dashes' })
  }
  const phone = payoutPhone ? toKenyanMsisdn(payoutPhone) : null
  if (payoutPhone && !phone) {
    return res.status(400).json({ error: 'Payout phone must be a valid Kenyan number' })
  }

  const client = await getClient()
  try {
    await client.query('BEGIN')
    const userResult = await client.query('SELECT id, name, role, phone FROM users WHERE id = $1 FOR UPDATE', [userId])
    const user = userResult.rows[0]
    if (!user) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'User not found' })
    }
    if (user.role === 'admin' || user.role === 'scanner') {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: `This user is a${user.role === 'admin' ? 'n' : ''} ${user.role} and cannot become a captain` })
    }
    const regionResult = await client.query('SELECT code FROM regions WHERE id = $1 AND is_active = true', [regionId])
    if (regionResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Region not found or inactive' })
    }

    const existing = await client.query('SELECT referral_code FROM captains WHERE user_id = $1', [userId])
    const finalCode = code ?? existing.rows[0]?.referral_code ?? (await generateReferralCode(regionResult.rows[0].code, user.name))
    const finalPhone = phone ?? toKenyanMsisdn(user.phone)

    await client.query(
      `INSERT INTO captains (user_id, region_id, referral_code, commission_rate, payout_phone, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       ON CONFLICT (user_id) DO UPDATE
         SET region_id = EXCLUDED.region_id, referral_code = EXCLUDED.referral_code,
             commission_rate = EXCLUDED.commission_rate, payout_phone = EXCLUDED.payout_phone, status = 'active'`,
      [userId, regionId, finalCode, rate, finalPhone]
    )
    await client.query(`UPDATE users SET role = 'captain' WHERE id = $1`, [userId])
    await client.query('COMMIT')

    res.status(201).json({ user_id: userId, referral_code: finalCode })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    if (isUniqueViolation(error)) {
      return res.status(400).json({ error: 'That referral code is already taken' })
    }
    console.error(error)
    res.status(500).json({ error: 'Failed to create captain' })
  } finally {
    client.release()
  }
}

class CaptainStatusError extends Error {}

async function setCaptainStatus(captainId: string, status: 'active' | 'suspended') {
  const client = await getClient()
  try {
    await client.query('BEGIN')
    if (status === 'active') {
      const user = await client.query('SELECT role FROM users WHERE id = $1 FOR UPDATE', [captainId])
      const role = user.rows[0]?.role
      if (role && role !== 'member' && role !== 'captain') {
        throw new CaptainStatusError(`This user is now a${role === 'admin' ? 'n' : ''} ${role} and cannot be reactivated as a captain`)
      }
    }
    const result = await client.query('UPDATE captains SET status = $1 WHERE user_id = $2 RETURNING user_id', [status, captainId])
    if (result.rows.length > 0) {
      await client.query('UPDATE users SET role = $1 WHERE id = $2', [status === 'active' ? 'captain' : 'member', captainId])
    }
    await client.query('COMMIT')
    return result.rows.length > 0
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    throw error
  } finally {
    client.release()
  }
}

export async function updateCaptain(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { regionId, referralCode, commissionRate, payoutPhone, status } = req.body ?? {}
    const sets: string[] = []
    const params: unknown[] = []

    if (regionId !== undefined) {
      if (typeof regionId !== 'string' || !UUID_PATTERN.test(regionId)) {
        return res.status(400).json({ error: 'Invalid regionId' })
      }
      params.push(regionId)
      sets.push(`region_id = $${params.length}`)
    }
    if (referralCode !== undefined) {
      const code = normalizeReferralCode(referralCode)
      if (!code) return res.status(400).json({ error: 'Referral code must be 3-20 letters, numbers or dashes' })
      params.push(code)
      sets.push(`referral_code = $${params.length}`)
    }
    if (commissionRate !== undefined) {
      const rate = parseRate(commissionRate)
      if (rate === null) return res.status(400).json({ error: 'Commission rate must be between 0 and 1' })
      params.push(rate)
      sets.push(`commission_rate = $${params.length}`)
    }
    if (payoutPhone !== undefined) {
      const phone = payoutPhone ? toKenyanMsisdn(payoutPhone) : null
      if (payoutPhone && !phone) return res.status(400).json({ error: 'Payout phone must be a valid Kenyan number' })
      params.push(phone)
      sets.push(`payout_phone = $${params.length}`)
    }
    if (status !== undefined && status !== 'active' && status !== 'suspended') {
      return res.status(400).json({ error: 'Status must be active or suspended' })
    }

    if (sets.length > 0) {
      params.push(id)
      const result = await query(
        `UPDATE captains SET ${sets.join(', ')} WHERE user_id = $${params.length} RETURNING user_id`,
        params
      )
      if (result.rows.length === 0) return res.status(404).json({ error: 'Captain not found' })
    }
    if (status !== undefined) {
      const found = await setCaptainStatus(id, status)
      if (!found) return res.status(404).json({ error: 'Captain not found' })
    }

    res.json({ message: 'Captain updated' })
  } catch (error) {
    if (error instanceof CaptainStatusError) {
      return res.status(400).json({ error: error.message })
    }
    if (isUniqueViolation(error)) {
      return res.status(400).json({ error: 'That referral code is already taken' })
    }
    if ((error as { code?: string })?.code === '23503') {
      return res.status(400).json({ error: 'Region not found' })
    }
    console.error(error)
    res.status(500).json({ error: 'Failed to update captain' })
  }
}

export async function removeCaptain(req: Request, res: Response) {
  try {
    const found = await setCaptainStatus(req.params.id, 'suspended')
    if (!found) return res.status(404).json({ error: 'Captain not found' })
    res.json({ message: 'Captain suspended and demoted to member' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to remove captain' })
  }
}

// ---------- Admin: commissions & payouts ----------

export async function getAdminCommissions(req: Request, res: Response) {
  try {
    const params: unknown[] = []
    const conditions: string[] = []
    const { captainId, regionId, status, from, to } = req.query

    if (typeof captainId === 'string' && UUID_PATTERN.test(captainId)) {
      params.push(captainId)
      conditions.push(`cc.captain_id = $${params.length}`)
    }
    if (typeof regionId === 'string' && UUID_PATTERN.test(regionId)) {
      params.push(regionId)
      conditions.push(`c.region_id = $${params.length}`)
    }
    if (COMMISSION_STATUSES.includes(status as never)) {
      params.push(status)
      conditions.push(`cc.status = $${params.length}`)
    }
    if (typeof from === 'string' && !Number.isNaN(Date.parse(from))) {
      params.push(from)
      conditions.push(`cc.created_at >= $${params.length}::date`)
    }
    if (typeof to === 'string' && !Number.isNaN(Date.parse(to))) {
      params.push(to)
      conditions.push(`cc.created_at < ($${params.length}::date + INTERVAL '1 day')`)
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await query(
      `SELECT cc.id, cc.captain_id, cc.referred_user_id, cc.source_type, cc.source_id, cc.match_method,
              cc.base_amount::float AS base_amount, cc.rate::float AS rate, cc.amount::float AS amount,
              cc.status, cc.payout_id, cc.approved_at, cc.created_at,
              cu.name AS captain_name, c.referral_code, r.name AS region_name,
              ru.name AS customer_name, ru.email AS customer_email, ru.phone AS customer_phone
       FROM captain_commissions cc
       JOIN captains c ON c.user_id = cc.captain_id
       JOIN users cu ON cu.id = c.user_id
       JOIN regions r ON r.id = c.region_id
       LEFT JOIN users ru ON ru.id = cc.referred_user_id
       ${where}
       ORDER BY cc.created_at DESC
       LIMIT 1000`,
      params
    )
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch commissions' })
  }
}

export async function approveCommissions(req: Request, res: Response) {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((id: unknown) => typeof id === 'string' && UUID_PATTERN.test(id)) : []
    if (ids.length === 0) return res.status(400).json({ error: 'Select at least one commission' })
    const result = await query(
      `UPDATE captain_commissions SET status = 'approved', approved_at = NOW()
       WHERE id = ANY($1::uuid[]) AND status = 'pending'
       RETURNING id`,
      [ids]
    )
    res.json({ approved: result.rows.length })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to approve commissions' })
  }
}

export async function reverseCommission(req: Request, res: Response) {
  try {
    const result = await query(
      `UPDATE captain_commissions SET status = 'reversed', approved_at = NULL
       WHERE id = $1 AND status IN ('pending', 'approved')
       RETURNING id`,
      [req.params.id]
    )
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Commission not found or already paid/reversed' })
    }
    res.json({ message: 'Commission reversed' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to reverse commission' })
  }
}

export async function syncCommissions(req: Request, res: Response) {
  try {
    const days = Math.min(3650, Math.max(1, parseInt(String(req.body?.days ?? '90'), 10) || 90))
    const created = await syncCaptainCommissions(days)
    res.json({ created, days })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to sync commissions' })
  }
}

export async function getAdminPayouts(req: Request, res: Response) {
  try {
    const params: unknown[] = []
    let where = ''
    if (typeof req.query.captainId === 'string' && UUID_PATTERN.test(req.query.captainId)) {
      params.push(req.query.captainId)
      where = 'WHERE p.captain_id = $1'
    }
    const result = await query(
      `SELECT p.id, p.captain_id, p.amount::float AS amount, p.mpesa_receipt, p.note, p.paid_at,
              cu.name AS captain_name, c.referral_code, c.payout_phone, r.name AS region_name,
              pb.name AS paid_by_name,
              (SELECT COUNT(*)::int FROM captain_commissions cc WHERE cc.payout_id = p.id) AS commission_count
       FROM captain_payouts p
       JOIN captains c ON c.user_id = p.captain_id
       JOIN users cu ON cu.id = c.user_id
       JOIN regions r ON r.id = c.region_id
       LEFT JOIN users pb ON pb.id = p.paid_by
       ${where}
       ORDER BY p.paid_at DESC
       LIMIT 1000`,
      params
    )
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch payouts' })
  }
}

export async function createPayout(req: Request, res: Response) {
  const { captainId, commissionIds, mpesaReceipt, note } = req.body ?? {}
  if (typeof captainId !== 'string' || !UUID_PATTERN.test(captainId)) {
    return res.status(400).json({ error: 'A valid captainId is required' })
  }
  const ids: string[] = Array.isArray(commissionIds)
    ? commissionIds.filter((id: unknown): id is string => typeof id === 'string' && UUID_PATTERN.test(id))
    : []
  if (ids.length === 0) return res.status(400).json({ error: 'Select at least one approved commission' })
  const receipt = typeof mpesaReceipt === 'string' ? mpesaReceipt.trim().toUpperCase() : ''
  if (!receipt) return res.status(400).json({ error: 'M-Pesa receipt is required' })

  const client = await getClient()
  try {
    await client.query('BEGIN')
    const commissions = await client.query(
      `SELECT id, amount FROM captain_commissions
       WHERE id = ANY($1::uuid[]) AND captain_id = $2 AND status = 'approved' AND payout_id IS NULL
       FOR UPDATE`,
      [ids, captainId]
    )
    if (commissions.rows.length !== new Set(ids).size) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'All selected commissions must be approved, unpaid and belong to this captain' })
    }
    const amount = commissions.rows.reduce((sum, row) => sum + Number(row.amount), 0)
    const payout = await client.query(
      `INSERT INTO captain_payouts (captain_id, amount, mpesa_receipt, note, paid_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, amount::float AS amount, paid_at`,
      [captainId, Math.round(amount * 100) / 100, receipt, typeof note === 'string' ? note.trim() || null : null, req.user?.id ?? null]
    )
    await client.query(
      `UPDATE captain_commissions SET status = 'paid', payout_id = $1 WHERE id = ANY($2::uuid[])`,
      [payout.rows[0].id, ids]
    )
    await client.query('COMMIT')
    res.status(201).json(payout.rows[0])
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    console.error(error)
    res.status(500).json({ error: 'Failed to record payout' })
  } finally {
    client.release()
  }
}
