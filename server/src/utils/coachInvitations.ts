import crypto from 'crypto'
import { query } from '../config/db.js'

export const INVITE_TTL_DAYS = 7

export function hashInviteToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function isInviteTokenShape(token: unknown): token is string {
  return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token)
}

/** Issues a new single-use invite for the application, retiring unused ones. Returns the raw token. */
export async function createCoachInvitation(input: {
  applicationId: string
  email: string
  createdBy?: string | null
}): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomBytes(32).toString('hex')
  await query(
    `UPDATE coach_invitations SET used_at = NOW()
     WHERE application_id = $1 AND used_at IS NULL`,
    [input.applicationId]
  )
  const result = await query(
    `INSERT INTO coach_invitations (application_id, email, token_hash, expires_at, created_by)
     VALUES ($1, $2, $3, NOW() + ($4::int * INTERVAL '1 day'), $5)
     RETURNING expires_at`,
    [input.applicationId, input.email.trim().toLowerCase(), hashInviteToken(token), INVITE_TTL_DAYS, input.createdBy ?? null]
  )
  return { token, expiresAt: result.rows[0].expires_at }
}

/** Marks every unused invite for an application as used (e.g. when leaving accepted). */
export async function invalidateCoachInvitations(applicationId: string): Promise<void> {
  await query(
    `UPDATE coach_invitations SET used_at = COALESCE(used_at, NOW())
     WHERE application_id = $1 AND used_at IS NULL`,
    [applicationId]
  )
}

export interface ValidCoachInvitation {
  id: string
  applicationId: string
  email: string
  expiresAt: Date
  fullName: string
  phone: string
  status: string
  userId: string | null
}

export async function getValidInvitation(token: string): Promise<ValidCoachInvitation | null> {
  if (!isInviteTokenShape(token)) return null
  const result = await query(
    `SELECT i.id, i.application_id, i.email, i.expires_at,
            a.full_name, a.phone, a.status, a.user_id
     FROM coach_invitations i
     JOIN coach_applications a ON a.id = i.application_id
     WHERE i.token_hash = $1 AND i.used_at IS NULL AND i.expires_at > NOW()`,
    [hashInviteToken(token)]
  )
  const row = result.rows[0]
  if (!row) return null
  return {
    id: row.id,
    applicationId: row.application_id,
    email: row.email,
    expiresAt: row.expires_at,
    fullName: row.full_name,
    phone: row.phone,
    status: row.status,
    userId: row.user_id,
  }
}

export async function markInvitationUsed(invitationId: string): Promise<void> {
  await query(`UPDATE coach_invitations SET used_at = NOW() WHERE id = $1 AND used_at IS NULL`, [invitationId])
}

export async function getLatestInvitation(applicationId: string) {
  const result = await query(
    `SELECT id, expires_at, used_at, created_at
     FROM coach_invitations
     WHERE application_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [applicationId]
  )
  return result.rows[0] ?? null
}
