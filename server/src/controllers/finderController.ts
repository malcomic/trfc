import { Request, Response } from 'express'
import { FREE_PROGRAM_ID } from '../config/onboarding.js'
import { query } from '../config/db.js'
import { toKenyanMsisdn } from '../utils/phone.js'
import { sanitizeQuizAnswers } from '../utils/sanitizeFinderAnswers.js'

function isEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) && value.trim().length <= 150
}

/**
 * Mid-funnel soft account: require name plus email and/or phone.
 * Creates or finds the user and stores a draft signup with finder answers.
 */
export async function createFinderAccount(req: Request, res: Response) {
  try {
    const { name, email, phone, whatsapp, answers } = req.body ?? {}
    const trimmedName = typeof name === 'string' ? name.trim() : ''
    if (!trimmedName || trimmedName.length > 100) {
      return res.status(400).json({ error: 'Please enter your name' })
    }

    const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
    if (trimmedEmail && !isEmail(trimmedEmail)) {
      return res.status(400).json({ error: 'Enter a valid email address' })
    }
    const msisdn = phone ? toKenyanMsisdn(phone) : null
    if (phone && !msisdn) {
      return res.status(400).json({ error: 'Enter a valid Safaricom number, e.g. 07XX XXX XXX' })
    }
    if (!trimmedEmail && !msisdn) {
      return res.status(400).json({ error: 'Enter your email or phone number' })
    }
    const whatsappMsisdn = whatsapp ? toKenyanMsisdn(whatsapp) : msisdn

    let userId: string | null = null
    let isReturning = false

    if (msisdn) {
      const byPhone = await query(
        `SELECT id, email FROM users WHERE phone_normalized = $1 ORDER BY created_at ASC LIMIT 1`,
        [msisdn]
      )
      if (byPhone.rows[0]) {
        userId = byPhone.rows[0].id
        isReturning = true
        if (trimmedEmail && !byPhone.rows[0].email) {
          await query('UPDATE users SET email = $1 WHERE id = $2 AND email IS NULL', [trimmedEmail, userId])
        }
        if (whatsappMsisdn) {
          await query('UPDATE users SET whatsapp = COALESCE(whatsapp, $1) WHERE id = $2', [whatsappMsisdn, userId])
        }
      }
    }

    if (!userId && trimmedEmail) {
      const byEmail = await query(`SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1`, [trimmedEmail])
      if (byEmail.rows[0]) {
        userId = byEmail.rows[0].id
        isReturning = true
        if (msisdn) {
          await query(
            `UPDATE users SET phone = COALESCE(phone, $1), phone_normalized = COALESCE(phone_normalized, $1),
             whatsapp = COALESCE(whatsapp, $2) WHERE id = $3`,
            [msisdn, whatsappMsisdn, userId]
          )
        }
      }
    }

    if (!userId) {
      const created = await query(
        `INSERT INTO users (name, email, phone, phone_normalized, whatsapp, source, role)
         VALUES ($1, $2, $3, $3, $4, 'finder', 'member')
         RETURNING id`,
        [trimmedName, trimmedEmail || null, msisdn, whatsappMsisdn]
      )
      userId = created.rows[0].id
    } else {
      await query('UPDATE users SET name = COALESCE(NULLIF(name, \'\'), $1) WHERE id = $2', [trimmedName, userId])
    }

    const quiz = sanitizeQuizAnswers({ version: 2, answers: answers ?? {} })
    const inserted = await query(
      `INSERT INTO signups (user_id, program, tier, is_returning, amount, payment_status, quiz_answers)
       VALUES ($1, $2, 'free', $3, 0, 'draft', $4)
       RETURNING id`,
      [userId, FREE_PROGRAM_ID, isReturning, quiz ? JSON.stringify(quiz) : null]
    )

    res.status(201).json({
      userId,
      isReturning,
      signupId: inserted.rows[0].id,
      email: trimmedEmail || null,
      phone: msisdn,
    })
  } catch (error) {
    console.error('Finder account error:', error)
    res.status(500).json({ error: 'Could not save your details. Please try again.' })
  }
}
