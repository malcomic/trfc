import { query } from '../config/db.js'

export function normalizeReferralCode(code: unknown): string | null {
  if (typeof code !== 'string') return null
  const trimmed = code.trim().toUpperCase()
  return /^[A-Z0-9-]{3,20}$/.test(trimmed) ? trimmed : null
}

export async function findActiveCaptainByCode(code: unknown) {
  const normalized = normalizeReferralCode(code)
  if (!normalized) return null
  const result = await query(
    `SELECT c.user_id, c.referral_code, u.name, r.name AS region_name, r.code AS region_code
     FROM captains c
     JOIN users u ON u.id = c.user_id
     JOIN regions r ON r.id = c.region_id
     WHERE c.referral_code = $1 AND c.status = 'active'`,
    [normalized]
  )
  return result.rows[0] ?? null
}

/**
 * Ties a user to the captain owning `code`. Only applies when the user has no captain yet,
 * so a referral can never be overwritten. Invalid codes are ignored.
 */
export async function applyReferral(userId: string, code: unknown): Promise<boolean> {
  const normalized = normalizeReferralCode(code)
  if (!normalized) return false
  try {
    const result = await query(
      `UPDATE users u
       SET referred_by_captain_id = c.user_id, referred_at = NOW()
       FROM captains c
       WHERE u.id = $1
         AND u.referred_by_captain_id IS NULL
         AND c.referral_code = $2
         AND c.status = 'active'
         AND c.user_id <> u.id
       RETURNING u.id`,
      [userId, normalized]
    )
    return result.rows.length > 0
  } catch (error) {
    console.error(`Failed to apply referral code ${normalized} to user ${userId}:`, error)
    return false
  }
}
