import { query } from '../config/db.js'

export function normalizeReferralCode(code: unknown): string | null {
  if (typeof code !== 'string') return null
  const trimmed = code.trim().toUpperCase()
  return /^[A-Z0-9-]{3,20}$/.test(trimmed) ? trimmed : null
}

export interface ReferralZone {
  region_id: string
  region_name: string
  region_code: string
  referral_code: string
}

/**
 * SQL resolving a referral code ($1) to an active zone: the zone's own code first, then a legacy
 * personal captain code, which now credits that captain's current zone.
 */
const ZONE_BY_CODE_SQL = `
  SELECT r.id AS region_id, r.name AS region_name, r.code AS region_code, r.referral_code
  FROM regions r
  WHERE r.is_active = true
    AND (r.referral_code = $1 OR r.id = (SELECT c.region_id FROM captains c WHERE c.referral_code = $1))
  ORDER BY (r.referral_code = $1) DESC
  LIMIT 1`

export async function findActiveZoneByCode(code: unknown): Promise<ReferralZone | null> {
  const normalized = normalizeReferralCode(code)
  if (!normalized) return null
  const result = await query(ZONE_BY_CODE_SQL, [normalized])
  return (result.rows[0] as ReferralZone | undefined) ?? null
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Ties a user to the zone owning `code`. Only applies when the user has no referring zone yet,
 * so a referral can never be overwritten. A zone link does not pick a personal captain, and a
 * captain is never referred to their own zone. Invalid codes are ignored.
 */
export async function applyReferral(userId: string, code: unknown): Promise<ReferralZone | null> {
  const normalized = normalizeReferralCode(code)
  if (!normalized) return null
  try {
    const zone = await findActiveZoneByCode(normalized)
    if (!zone) return null
    const result = await query(
      `UPDATE users u
       SET referred_by_region_id = $2, referred_at = NOW()
       WHERE u.id = $1
         AND u.referred_by_region_id IS NULL
         AND NOT EXISTS (SELECT 1 FROM captains c WHERE c.user_id = u.id AND c.region_id = $2)
       RETURNING u.id`,
      [userId, zone.region_id]
    )
    return result.rows.length > 0 ? zone : null
  } catch (error) {
    console.error(`Failed to apply referral code ${normalized} to user ${userId}:`, error)
    return null
  }
}

/**
 * Sets the member's personal captain. This never touches the referral, so a chosen captain does
 * not earn commission. Unknown or inactive captains, and captains outside `regionId` when given,
 * are ignored.
 */
export async function assignChosenCaptain(
  userId: string,
  captainId: unknown,
  regionId?: string | null
): Promise<boolean> {
  if (typeof captainId !== 'string' || !UUID_PATTERN.test(captainId)) return false
  try {
    const result = await query(
      `UPDATE users u
       SET captain_id = c.user_id, captain_chosen_at = NOW()
       FROM captains c
       WHERE u.id = $1
         AND c.user_id = $2
         AND c.status = 'active'
         AND c.user_id <> u.id
         AND ($3::uuid IS NULL OR c.region_id = $3::uuid)
       RETURNING u.id`,
      [userId, captainId, regionId ?? null]
    )
    return result.rows.length > 0
  } catch (error) {
    console.error(`Failed to assign captain ${captainId} to user ${userId}:`, error)
    return false
  }
}
