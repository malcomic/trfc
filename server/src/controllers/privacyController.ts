import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { query } from '../config/db.js'
import {
  ConsentError,
  hashIp,
  listMemberCaptains,
  recordConsent,
  setMarketing,
  setWhatsappShare,
} from '../utils/consents.js'
import { buildMemberExport } from '../utils/memberDataExport.js'
import { getNumberSetting } from '../utils/policies.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function handleError(res: Response, error: unknown, fallback: string) {
  if (error instanceof ConsentError) return res.status(error.status).json({ error: error.message })
  console.error(error)
  res.status(500).json({ error: fallback })
}

export async function getMyPrivacy(req: Request, res: Response) {
  try {
    const userId = req.user!.id
    const user = await query(
      `SELECT marketing_opt_in, marketing_opt_in_at, privacy_version_accepted, privacy_accepted_at, age_confirmed_at,
              password_hash IS NOT NULL AS has_password
       FROM users WHERE id = $1`,
      [userId]
    )
    if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' })
    const [captains, history] = await Promise.all([
      listMemberCaptains(userId),
      query(
        `SELECT cr.consent_type, cr.granted, cr.policy_slug, cr.policy_version, cr.source, cr.created_at, cu.name AS captain_name
         FROM consent_records cr LEFT JOIN users cu ON cu.id = cr.captain_id
         WHERE cr.user_id = $1 ORDER BY cr.created_at DESC LIMIT 100`,
        [userId]
      ),
    ])
    res.json({
      ...user.rows[0],
      captains,
      history: history.rows.map(({ captain_name, ...row }) => ({
        ...row,
        captain_name: captain_name ? String(captain_name).trim().split(/\s+/)[0] : null,
      })),
      delete_grace_days: await getNumberSetting('account_delete_grace_days'),
    })
  } catch (error) {
    handleError(res, error, 'Failed to load your privacy settings')
  }
}

export async function updateMyMarketing(req: Request, res: Response) {
  if (typeof req.body?.optIn !== 'boolean') return res.status(400).json({ error: 'Choose on or off' })
  try {
    await setMarketing(req.user!.id, req.body.optIn, { source: 'settings', ipHash: hashIp(req.ip) })
    res.json({ marketing_opt_in: req.body.optIn })
  } catch (error) {
    handleError(res, error, 'Failed to save your email choice')
  }
}

export async function updateMyWhatsappShare(req: Request, res: Response) {
  const { captainId } = req.params
  if (!UUID_PATTERN.test(captainId)) return res.status(400).json({ error: 'Choose a captain' })
  if (typeof req.body?.enabled !== 'boolean') return res.status(400).json({ error: 'Choose on or off' })
  try {
    await setWhatsappShare(req.user!.id, captainId, req.body.enabled, { source: 'settings', ipHash: hashIp(req.ip) })
    res.json({ captain_id: captainId, whatsapp_shared: req.body.enabled })
  } catch (error) {
    handleError(res, error, 'Failed to save your WhatsApp choice')
  }
}

export async function downloadMyData(req: Request, res: Response) {
  try {
    const data = await buildMemberExport(req.user!.id)
    const stamp = new Date().toISOString().slice(0, 10)
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="trfc-my-information-${stamp}.json"`)
    res.send(JSON.stringify(data, null, 2))
  } catch (error) {
    handleError(res, error, 'Failed to prepare your file')
  }
}

/**
 * Locks the account at once and signs out every session. Personal details are removed by the
 * retention job within the grace period; payment records are kept for the retention period.
 */
export async function deleteMyAccount(req: Request, res: Response) {
  try {
    const userId = req.user!.id
    const result = await query('SELECT role, password_hash, deletion_requested_at FROM users WHERE id = $1', [userId])
    const user = result.rows[0]
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (user.deletion_requested_at) return res.status(400).json({ error: 'This account is already being deleted' })
    if (user.role !== 'member') {
      return res.status(400).json({ error: 'Staff and captain accounts are closed by the TRFC admin team. Please contact us.' })
    }

    const { password, confirm } = req.body ?? {}
    if (user.password_hash) {
      if (typeof password !== 'string' || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(400).json({ error: 'Your password is incorrect' })
      }
    } else if (confirm !== 'DELETE') {
      return res.status(400).json({ error: 'Type DELETE to confirm' })
    }

    const ipHash = hashIp(req.ip)
    const shares = await query(
      'UPDATE captain_whatsapp_shares SET enabled = false, updated_at = NOW() WHERE member_id = $1 AND enabled RETURNING captain_id',
      [userId]
    )
    for (const row of shares.rows) {
      await recordConsent({ userId, type: 'captain_whatsapp', granted: false, captainId: row.captain_id, source: 'account_deleted', ipHash })
    }
    await query(
      `UPDATE users SET deletion_requested_at = NOW(), password_changed_at = NOW(),
         marketing_opt_in = false, marketing_opt_in_at = NULL
       WHERE id = $1`,
      [userId]
    )
    await recordConsent({ userId, type: 'marketing_email', granted: false, source: 'account_deleted', ipHash })

    res.json({ ok: true, delete_within_days: await getNumberSetting('account_delete_grace_days') })
  } catch (error) {
    handleError(res, error, 'Failed to delete your account')
  }
}
