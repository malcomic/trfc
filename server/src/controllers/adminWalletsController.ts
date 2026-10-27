import { Request, Response } from 'express'
import { query } from '../config/db.js'
import {
  InsufficientFundsError,
  applyEntry,
  getWalletBalance,
  getWalletTransactions,
  roundKes,
  withWallet,
} from '../utils/wallet.js'
import { getWalletLimit, updateWalletLimitSettings, type WalletLimitSettings } from '../utils/walletLimit.js'

const MAX_ADJUSTMENT = 500_000
const MAX_CAP = 1_000_000

function pageParams(req: Request, defaultLimit = 50) {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1)
  const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? String(defaultLimit)), 10) || defaultLimit))
  return { page, limit, offset: (page - 1) * limit }
}

/** Wallets with a balance or any activity, plus the total owed to members (liability). */
export async function getAdminWallets(req: Request, res: Response) {
  try {
    const { page, limit, offset } = pageParams(req)
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
    const params: unknown[] = []
    let where = ''
    if (search) {
      params.push(`%${search.toLowerCase()}%`)
      where = `AND (LOWER(u.name) LIKE $1 OR LOWER(u.email) LIKE $1 OR u.phone LIKE $1)`
    }
    const [rows, totals] = await Promise.all([
      query(
        `SELECT w.user_id, w.balance::float AS balance, w.updated_at, u.name, u.email, u.phone,
                (SELECT COUNT(*)::int FROM ticket_payment_plans p WHERE p.user_id = w.user_id AND p.status = 'active') AS active_plans
         FROM wallets w JOIN users u ON u.id = w.user_id
         WHERE TRUE ${where}
         ORDER BY w.balance DESC, w.updated_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      ),
      query(
        `SELECT COALESCE(SUM(w.balance), 0)::float AS liability, COUNT(*)::int AS wallet_count,
                COUNT(*) FILTER (WHERE w.balance > 0)::int AS funded
         FROM wallets w JOIN users u ON u.id = w.user_id
         WHERE TRUE ${where}`,
        params
      ),
    ])
    res.json({ wallets: rows.rows, ...totals.rows[0], page, limit })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load wallets' })
  }
}

export async function getAdminWalletLedger(req: Request, res: Response) {
  try {
    const userId = String(req.params.userId)
    const { page, limit, offset } = pageParams(req)
    const user = await query('SELECT id, name, email, phone FROM users WHERE id = $1', [userId])
    if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' })
    const [balance, ledger] = await Promise.all([
      getWalletBalance(userId),
      getWalletTransactions(userId, { limit, offset }),
    ])
    res.json({ user: user.rows[0], balance, ...ledger, page, limit })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load the wallet ledger' })
  }
}

export async function createWalletAdjustment(req: Request, res: Response) {
  try {
    const userId = typeof req.body?.userId === 'string' ? req.body.userId : ''
    const amount = roundKes(Number(req.body?.amount))
    const note = typeof req.body?.note === 'string' ? req.body.note.trim() : ''
    if (!userId) return res.status(400).json({ error: 'userId is required' })
    if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > MAX_ADJUSTMENT) {
      return res.status(400).json({ error: `Amount must be non-zero and at most KES ${MAX_ADJUSTMENT.toLocaleString()}` })
    }
    if (note.length < 5) return res.status(400).json({ error: 'Add a note explaining the adjustment' })

    const user = await query('SELECT id FROM users WHERE id = $1', [userId])
    if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' })

    const tx = await withWallet(userId, (client) =>
      applyEntry(client, userId, {
        type: 'adjustment',
        amount,
        note: note.slice(0, 500),
        createdBy: req.user!.id,
      })
    )
    res.status(201).json(tx)
  } catch (error) {
    if (error instanceof InsufficientFundsError) {
      return res.status(400).json({ error: `The wallet only has KES ${error.balance.toLocaleString()}` })
    }
    console.error(error)
    res.status(500).json({ error: 'Failed to adjust the wallet' })
  }
}

export async function getWalletLimitSettingsHandler(_req: Request, res: Response) {
  try {
    res.json(await getWalletLimit({ fresh: true }))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load wallet limit settings' })
  }
}

export function parseWalletLimitSettings(body: any): WalletLimitSettings | string {
  const settings = {
    capMultiplier: Number(body?.capMultiplier),
    ticketsPerEvent: Number(body?.ticketsPerEvent),
    capFloor: roundKes(Number(body?.capFloor)),
    capCeiling: roundKes(Number(body?.capCeiling)),
  }
  if (!Number.isFinite(settings.capMultiplier) || settings.capMultiplier < 1 || settings.capMultiplier > 10) {
    return 'Multiplier must be between 1 and 10'
  }
  if (!Number.isInteger(settings.ticketsPerEvent) || settings.ticketsPerEvent < 1 || settings.ticketsPerEvent > 50) {
    return 'Tickets per event must be a whole number between 1 and 50'
  }
  if (!Number.isFinite(settings.capFloor) || settings.capFloor < 0) return 'Minimum limit cannot be negative'
  if (!Number.isFinite(settings.capCeiling) || settings.capCeiling > MAX_CAP) {
    return `Maximum limit must be at most KES ${MAX_CAP.toLocaleString()}`
  }
  if (settings.capCeiling < settings.capFloor) return 'Maximum limit must be at least the minimum limit'
  return settings
}

export async function updateWalletLimitSettingsHandler(req: Request, res: Response) {
  try {
    const parsed = parseWalletLimitSettings(req.body)
    if (typeof parsed === 'string') return res.status(400).json({ error: parsed })
    await updateWalletLimitSettings(parsed, req.user!.id)
    res.json(await getWalletLimit({ fresh: true }))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to save wallet limit settings' })
  }
}

const PLAN_FILTERS: Record<string, string> = {
  active: `p.status = 'active'`,
  overdue: `p.status = 'active' AND EXISTS (
    SELECT 1 FROM ticket_plan_installments i WHERE i.plan_id = p.id AND i.paid_at IS NULL AND i.due_at < NOW())`,
  completed: `p.status = 'completed'`,
  expired: `p.status IN ('expired', 'cancelled')`,
}

export async function getAdminPaymentPlans(req: Request, res: Response) {
  try {
    const { page, limit, offset } = pageParams(req)
    const filter = PLAN_FILTERS[String(req.query.status ?? '')] ?? 'TRUE'
    const result = await query(
      `SELECT p.id, p.status, p.total_amount::float AS total_amount, p.amount_paid::float AS amount_paid,
              p.installment_count, p.created_at, p.completed_at,
              u.id AS user_id, u.name AS user_name, u.email AS user_email,
              e.title AS event_title, e.event_date,
              (SELECT COUNT(*)::int FROM tickets t WHERE t.purchase_batch_id = p.purchase_batch_id) AS quantity,
              (SELECT MIN(i.due_at) FROM ticket_plan_installments i WHERE i.plan_id = p.id AND i.paid_at IS NULL) AS next_due_at,
              COUNT(*) OVER()::int AS total_count
       FROM ticket_payment_plans p
       JOIN users u ON u.id = p.user_id
       JOIN events e ON e.id = p.event_id
       WHERE ${filter}
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    )
    const total = result.rows[0]?.total_count ?? 0
    res.json({ plans: result.rows.map(({ total_count: _count, ...row }) => row), total, page, limit })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load installment plans' })
  }
}
