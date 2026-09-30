import { Request, Response } from 'express'
import { query } from '../config/db.js'
import { toKenyanMsisdn } from '../utils/phone.js'
import {
  isProgramId,
  isTier,
  priceFor,
  resolveProgram,
} from '../config/onboarding.js'
import { notifySignupWelcome } from '../utils/signupActivation.js'

async function findOrCreateUser(name: string, phone: string, whatsapp: string) {
  const existing = await query(
    `SELECT id, whatsapp FROM users WHERE phone_normalized = $1 ORDER BY created_at ASC LIMIT 1`,
    [phone]
  )
  if (existing.rows.length > 0) {
    const user = existing.rows[0]
    if (!user.whatsapp) {
      await query('UPDATE users SET whatsapp = $1 WHERE id = $2', [whatsapp, user.id])
    }
    return { userId: user.id as string, isReturning: true }
  }

  const created = await query(
    `INSERT INTO users (name, phone, phone_normalized, whatsapp, source, role)
     VALUES ($1, $2, $2, $3, 'onboarding', 'member')
     RETURNING id`,
    [name, phone, whatsapp]
  )
  return { userId: created.rows[0].id as string, isReturning: false }
}

export async function createSignup(req: Request, res: Response) {
  try {
    const { name, phone, whatsapp, program, tier, quizAnswers } = req.body ?? {}

    const trimmedName = typeof name === 'string' ? name.trim() : ''
    if (!trimmedName || trimmedName.length > 100) {
      return res.status(400).json({ error: 'Please enter your name' })
    }

    const msisdn = toKenyanMsisdn(phone)
    if (!msisdn) {
      return res.status(400).json({ error: 'Enter a valid Safaricom number, e.g. 07XX XXX XXX' })
    }
    const whatsappMsisdn = whatsapp ? toKenyanMsisdn(whatsapp) : msisdn
    if (!whatsappMsisdn) {
      return res.status(400).json({ error: 'Enter a valid WhatsApp number' })
    }

    if (!isProgramId(program) || !isTier(tier)) {
      return res.status(400).json({ error: 'Invalid program or access tier' })
    }

    const finalProgram = resolveProgram(program, tier)
    const { userId, isReturning } = await findOrCreateUser(trimmedName, msisdn, whatsappMsisdn)
    const amount = priceFor(tier, isReturning)
    const paymentStatus = tier === 'free' ? 'n/a' : 'pending'

    const inserted = await query(
      `INSERT INTO signups (user_id, program, tier, is_returning, amount, payment_status, quiz_answers)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        userId,
        finalProgram,
        tier,
        isReturning,
        amount,
        paymentStatus,
        quizAnswers && typeof quizAnswers === 'object' ? JSON.stringify(quizAnswers) : null,
      ]
    )
    const signupId = inserted.rows[0].id as string

    if (tier === 'free') {
      void notifySignupWelcome(signupId)
    }

    res.status(201).json({
      signupId,
      program: finalProgram,
      tier,
      amount,
      isReturning,
      phone: msisdn,
    })
  } catch (error) {
    console.error('Error creating signup:', error)
    res.status(500).json({ error: 'Could not complete signup. Please try again.' })
  }
}

export async function getSignupStatus(req: Request, res: Response) {
  try {
    const result = await query(
      'SELECT id, program, tier, amount, payment_status FROM signups WHERE id = $1',
      [req.params.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Signup not found' })
    }
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching signup status:', error)
    res.status(500).json({ error: 'Failed to fetch signup status' })
  }
}

export async function getAdminSignups(req: Request, res: Response) {
  try {
    const { program, tier, payment_status: paymentStatus, from, to } = req.query
    const conditions: string[] = []
    const params: unknown[] = []

    const addFilter = (sql: string, value: unknown) => {
      params.push(value)
      conditions.push(sql.replace('?', `$${params.length}`))
    }

    if (typeof program === 'string' && program) addFilter('s.program = ?', program)
    if (typeof tier === 'string' && tier) addFilter('s.tier = ?', tier)
    if (typeof paymentStatus === 'string' && paymentStatus) {
      addFilter('s.payment_status = ?', paymentStatus)
    }
    if (typeof from === 'string' && from) addFilter('s.created_at >= ?::date', from)
    if (typeof to === 'string' && to) {
      addFilter("s.created_at < (?::date + INTERVAL '1 day')", to)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const result = await query(
      `SELECT s.id, s.program, s.tier, s.is_returning, s.amount, s.payment_status,
              s.mpesa_receipt, s.whatsapp_sent_at, s.created_at,
              u.id AS user_id, u.name, u.phone_normalized AS phone, u.whatsapp,
              u.access_tier, u.elite_expires_at
       FROM signups s
       LEFT JOIN users u ON s.user_id = u.id
       ${where}
       ORDER BY s.created_at DESC
       LIMIT 1000`,
      params
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching admin signups:', error)
    res.status(500).json({ error: 'Failed to fetch signups' })
  }
}
