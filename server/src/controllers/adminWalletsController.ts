import { Request, Response } from 'express'
import { query } from '../config/db.js'
import {
  CreditError,
  addCredit,
  getTicketValue,
  getWalletTransactions,
  roundKes,
  voidCredit,
  withWallet,
} from '../utils/wallet.js'
import { getTicketRules, parseTicketRules, updateTicketRules } from '../utils/ticketRules.js'

const MAX_ADMIN_CREDIT = 500_000

function pageParams(req: Request, defaultLimit = 50) {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1)
  const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? String(defaultLimit)), 10) || defaultLimit))
  return { page, limit, offset: (page - 1) * limit }
}

/** Members with ticket value or any activity, plus the total ticket value outstanding. */
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
        `SELECT w.user_id, w.balance::float AS ticket_value, w.updated_at, u.name, u.email, u.phone,
                (SELECT MIN(c.expires_at) FROM ticket_credits c
                 WHERE c.user_id = w.user_id AND c.status = 'active' AND c.remaining > 0) AS next_expiry,
                (SELECT COUNT(*)::int FROM ticket_payment_plans p WHERE p.user_id = w.user_id AND p.status = 'active') AS active_plans
         FROM wallets w JOIN users u ON u.id = w.user_id
         WHERE TRUE ${where}
         ORDER BY w.balance DESC, w.updated_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      ),
      query(
        `SELECT COALESCE(SUM(w.balance), 0)::float AS outstanding, COUNT(*)::int AS wallet_count,
                COUNT(*) FILTER (WHERE w.balance > 0)::int AS with_value
         FROM wallets w JOIN users u ON u.id = w.user_id
         WHERE TRUE ${where}`,
        params
      ),
    ])
    res.json({ wallets: rows.rows, ...totals.rows[0], page, limit })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load ticket value' })
  }
}

export async function getAdminWalletLedger(req: Request, res: Response) {
  try {
    const userId = String(req.params.userId)
    const { page, limit, offset } = pageParams(req)
    const user = await query('SELECT id, name, email, phone FROM users WHERE id = $1', [userId])
    if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' })
    const [value, ledger] = await Promise.all([
      getTicketValue(userId),
      getWalletTransactions(userId, { limit, offset }),
    ])
    res.json({ user: user.rows[0], ...value, ...ledger, page, limit })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load the member history' })
  }
}

/** Admin correction: adds ticket credit (valid for the usual number of days from today). */
export async function createAdminCredit(req: Request, res: Response) {
  try {
    const userId = typeof req.body?.userId === 'string' ? req.body.userId : ''
    const amount = roundKes(Number(req.body?.amount))
    const note = typeof req.body?.note === 'string' ? req.body.note.trim() : ''
    if (!userId) return res.status(400).json({ error: 'userId is required' })
    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_ADMIN_CREDIT) {
      return res.status(400).json({ error: `Amount must be above 0 and at most KES ${MAX_ADMIN_CREDIT.toLocaleString()}` })
    }
    if (note.length < 5) return res.status(400).json({ error: 'Add a note explaining the credit' })

    const user = await query('SELECT id FROM users WHERE id = $1', [userId])
    if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' })

    const credit = await withWallet(userId, (client) =>
      addCredit(client, userId, { amount, reason: 'admin', note: note.slice(0, 500), createdBy: req.user!.id })
    )
    res.status(201).json(credit)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to add ticket credit' })
  }
}

export async function voidAdminCredit(req: Request, res: Response) {
  try {
    const creditId = String(req.params.creditId)
    const note = typeof req.body?.note === 'string' ? req.body.note.trim() : ''
    if (note.length < 5) return res.status(400).json({ error: 'Add a note explaining why the credit is removed' })
    const owner = await query('SELECT user_id FROM ticket_credits WHERE id = $1', [creditId])
    const userId: string | undefined = owner.rows[0]?.user_id
    if (!userId) return res.status(404).json({ error: 'Credit not found' })
    const voided = await withWallet(userId, (client) =>
      voidCredit(client, userId, creditId, { note: note.slice(0, 500), createdBy: req.user!.id, allowPartial: true })
    )
    res.json({ voided })
  } catch (error) {
    if (error instanceof CreditError) return res.status(error.status).json({ error: error.message })
    console.error(error)
    res.status(500).json({ error: 'Failed to remove the credit' })
  }
}

export async function getTicketRulesHandler(_req: Request, res: Response) {
  try {
    res.json(await getTicketRules({ fresh: true }))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load ticket rules' })
  }
}

export async function updateTicketRulesHandler(req: Request, res: Response) {
  try {
    const parsed = parseTicketRules(req.body, await getTicketRules({ fresh: true }))
    if (typeof parsed === 'string') return res.status(400).json({ error: parsed })
    await updateTicketRules(parsed, req.user!.id)
    res.json(await getTicketRules({ fresh: true }))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to save ticket rules' })
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
              p.deposit_amount::float AS deposit_amount, p.deadline_at,
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
    res.status(500).json({ error: 'Failed to load payment plans' })
  }
}
