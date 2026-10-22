import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { getClient, query } from '../config/db.js'

export const MIN_PASSWORD_LENGTH = 8
export const RESET_TOKEN_TTL_MINUTES = 60

export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string' || password.length === 0) return 'Password is required'
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
  }
  return null
}

export function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/** Issues a new single-use reset token for the user, retiring any earlier unused ones. Returns the raw token. */
export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex')
  await query(
    `UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`,
    [userId]
  )
  await query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + ($3::int * INTERVAL '1 minute'))`,
    [userId, hashResetToken(token), RESET_TOKEN_TTL_MINUTES]
  )
  return token
}

export interface ResetUser {
  id: string
  email: string
  name: string | null
}

/**
 * Sets a new password if the token is valid, unused and unexpired, and marks the token used.
 * Returns the user, or null when the token can't be used.
 */
export async function consumePasswordResetToken(token: string, newPassword: string): Promise<ResetUser | null> {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null

  const client = await getClient()
  try {
    await client.query('BEGIN')
    const tokenResult = await client.query(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
       FOR UPDATE`,
      [hashResetToken(token)]
    )
    const row = tokenResult.rows[0]
    if (!row) {
      await client.query('ROLLBACK')
      return null
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)
    const userResult = await client.query(
      `UPDATE users SET password_hash = $1, password_changed_at = NOW()
       WHERE id = $2
       RETURNING id, email, name`,
      [passwordHash, row.user_id]
    )
    await client.query(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`,
      [row.user_id]
    )
    await client.query('COMMIT')
    return userResult.rows[0] ?? null
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}
