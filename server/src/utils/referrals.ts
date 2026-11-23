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
  /** The zone's own referral code (not necessarily the code that was looked up). */
  referral_code: string
  /** Set when the looked-up code was an active captain's personal code. */
  captain_id?: string | null
  captain_name?: string | null
}

/**
 * Resolves a referral code ($1) to an active zone. Zone codes win over personal captain codes.
 * When the code is a personal captain code, captain_id / captain_name are the active captain who owns it.
 */
const REFERRAL_BY_CODE_SQL = `
  SELECT r.id AS region_id, r.name AS region_name, r.code AS region_code, r.referral_code,
         cap.user_id AS captain_id, cap.name AS captain_name
  FROM regions r
  LEFT JOIN LATERAL (
    SELECT c.user_id, u.name
    FROM captains c
    JOIN users u ON u.id = c.user_id
    WHERE c.referral_code = $1 AND c.region_id = r.id AND c.status = 'active'
    LIMIT 1
  ) cap ON true
  WHERE r.is_active = true
    AND (r.referral_code = $1 OR r.id = (SELECT c.region_id FROM captains c WHERE c.referral_code = $1))
  ORDER BY (r.referral_code = $1) DESC
  LIMIT 1`

/** @deprecated Prefer findReferralByCode; kept as an alias that drops captain fields for older callers. */
export async function findActiveZoneByCode(code: unknown): Promise<ReferralZone | null> {
  const referral = await findReferralByCode(code)
  if (!referral) return null
  return {
    region_id: referral.region_id,
    region_name: referral.region_name,
    region_code: referral.region_code,
    referral_code: referral.referral_code,
  }
}

export async function findReferralByCode(code: unknown): Promise<ReferralZone | null> {
  const normalized = normalizeReferralCode(code)
  if (!normalized) return null
  const result = await query(REFERRAL_BY_CODE_SQL, [normalized])
  const row = result.rows[0]
  if (!row) return null
  return {
    region_id: row.region_id,
    region_name: row.region_name,
    region_code: row.region_code,
    referral_code: row.referral_code,
    captain_id: row.captain_id ?? null,
    captain_name: row.captain_name ?? null,
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Ties a user to the zone owning `code`. Only applies when the user has no referring zone yet,
 * so a referral can never be overwritten. A zone link does not pick a personal captain. A personal
 * captain link also chooses that captain (shop commission and ticket-weighted event share). A
 * captain is never referred to their own zone. Invalid codes are ignored.
 */
export async function applyReferral(userId: string, code: unknown): Promise<ReferralZone | null> {
  const normalized = normalizeReferralCode(code)
  if (!normalized) return null
  try {
    // Member-to-member referral codes credit reward points when the fee clears; they do not set zone.
    const { attachMemberReferral } = await import('./rewardLedger.js')
    await attachMemberReferral(userId, normalized)

    const referral = await findReferralByCode(normalized)
    if (!referral) return null
    const result = await query(
      `UPDATE users u
       SET referred_by_region_id = $2, referred_at = NOW()
       WHERE u.id = $1
         AND u.referred_by_region_id IS NULL
         AND NOT EXISTS (SELECT 1 FROM captains c WHERE c.user_id = u.id AND c.region_id = $2)
       RETURNING u.id`,
      [userId, referral.region_id]
    )
    if (result.rows.length === 0) return null
    if (referral.captain_id) {
      await assignChosenCaptain(userId, referral.captain_id, referral.region_id)
    }
    return referral
  } catch (error) {
    console.error(`Failed to apply referral code ${normalized} to user ${userId}:`, error)
    return null
  }
}

/**
 * Sets the member's personal captain, who earns the commission on the member's shop purchases
 * from now on. Unknown or inactive captains, and captains outside `regionId` when given, are ignored.
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
