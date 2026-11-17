import bcrypt from 'bcrypt'
import { Request, Response } from 'express'
import { getClient, query } from '../config/db.js'
import { hashIp, recordConsent, ConsentError } from '../utils/consents.js'
import { getValidInvitation } from '../utils/coachInvitations.js'
import { validatePassword } from '../utils/passwordReset.js'
import { toKenyanMsisdn } from '../utils/phone.js'
import { currentPolicyVersion } from '../utils/policies.js'

async function checkCoachTerms(acceptTerms: unknown, policyVersion: unknown): Promise<string> {
  if (acceptTerms !== true) {
    throw new ConsentError('Please agree to the Terms and Conditions to activate your coach account')
  }
  const current = await currentPolicyVersion('terms')
  if (!current) throw new ConsentError('The terms are not available right now. Please try again.', 503)
  if (policyVersion !== current) {
    throw new ConsentError('The Terms were just updated. Please reload the page and agree to the new version.', 409)
  }
  return current
}

export async function validateCoachInvitation(req: Request, res: Response) {
  try {
    const token = typeof req.query.token === 'string' ? req.query.token : ''
    const invite = await getValidInvitation(token)
    if (!invite) {
      return res.status(410).json({ error: 'This invitation link is invalid or has expired. Ask the admin for a new one.' })
    }
    if (invite.status !== 'accepted') {
      return res.status(410).json({ error: 'This invitation is no longer valid.' })
    }
    if (invite.userId) {
      return res.status(410).json({ error: 'This invitation has already been used. Sign in with your coach account.' })
    }
    res.json({
      fullName: invite.fullName,
      email: invite.email,
      phone: invite.phone,
      expiresAt: invite.expiresAt,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to validate invitation' })
  }
}

export async function activateCoachInvitation(req: Request, res: Response) {
  try {
    const body = req.body ?? {}
    const token = typeof body.token === 'string' ? body.token : ''
    const passwordError = validatePassword(body.password)
    if (passwordError) return res.status(400).json({ error: passwordError })

    const phoneMsisdn = toKenyanMsisdn(typeof body.phone === 'string' ? body.phone : '')
    if (!phoneMsisdn) return res.status(400).json({ error: 'Enter a valid Kenyan phone number' })

    let termsVersion: string
    try {
      termsVersion = await checkCoachTerms(body.acceptTerms, body.policyVersion)
    } catch (error) {
      if (error instanceof ConsentError) return res.status(error.status).json({ error: error.message })
      throw error
    }

    const invite = await getValidInvitation(token)
    if (!invite) {
      return res.status(410).json({ error: 'This invitation link is invalid or has expired. Ask the admin for a new one.' })
    }
    if (invite.status !== 'accepted') {
      return res.status(410).json({ error: 'This invitation is no longer valid.' })
    }
    if (invite.userId) {
      return res.status(410).json({ error: 'This invitation has already been used. Sign in with your coach account.' })
    }

    const emailTaken = await query('SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1', [invite.email.toLowerCase()])
    if (emailTaken.rows.length > 0) {
      return res.status(400).json({
        error: 'An account with this email already exists. Contact the admin for help.',
      })
    }

    const phoneTaken = await query('SELECT id FROM users WHERE phone_normalized = $1 LIMIT 1', [phoneMsisdn])
    if (phoneTaken.rows.length > 0) {
      return res.status(400).json({
        error: 'An account with this phone number already exists. Contact the admin for help.',
      })
    }

    const passwordHash = await bcrypt.hash(body.password, 10)
    const displayPhone = phoneMsisdn.startsWith('254') ? `0${phoneMsisdn.slice(3)}` : phoneMsisdn

    const client = await getClient()
    try {
      await client.query('BEGIN')
      const userResult = await client.query(
        `INSERT INTO users (name, email, phone, phone_normalized, password_hash, whatsapp, role)
         VALUES ($1, $2, $3, $4, $5, $4, 'coach')
         RETURNING id, name, email, phone, role`,
        [invite.fullName, invite.email.toLowerCase(), displayPhone, phoneMsisdn, passwordHash]
      )
      const user = userResult.rows[0]

      await client.query(
        `INSERT INTO coaches (user_id, application_id, status, phone, terms_accepted_at, terms_version, activated_at)
         VALUES ($1, $2, 'active', $3, NOW(), $4, NOW())`,
        [user.id, invite.applicationId, displayPhone, termsVersion]
      )

      await client.query(`UPDATE coach_applications SET user_id = $1, updated_at = NOW() WHERE id = $2`, [
        user.id,
        invite.applicationId,
      ])

      await client.query(
        `UPDATE coach_invitations SET used_at = COALESCE(used_at, NOW())
         WHERE application_id = $1 AND used_at IS NULL`,
        [invite.applicationId]
      )

      await recordConsent(
        {
          userId: user.id,
          applicationId: invite.applicationId,
          type: 'coach_terms',
          granted: true,
          policySlug: 'terms',
          policyVersion: termsVersion,
          source: 'coach_activation',
          ipHash: hashIp(req.ip),
        },
        client
      )

      await client.query('COMMIT')
      res.status(201).json({
        ok: true,
        email: user.email,
        name: user.name,
      })
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to activate coach account' })
  }
}
