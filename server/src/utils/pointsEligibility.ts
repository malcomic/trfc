import type { PoolClient } from 'pg'
import { query } from '../config/db.js'
import { getPointsSettings } from './pointsSettings.js'

type Queryable = Pick<PoolClient, 'query'>
const poolDb = { query } as unknown as Queryable

/** Active paid membership covering the given instant (defaults to now). */
export async function isPaidActiveOn(
  userId: string,
  at: Date = new Date(),
  db: Queryable = poolDb
): Promise<boolean> {
  const result = await db.query(
    `SELECT COALESCE(member_until > $2, false) AS active FROM users WHERE id = $1`,
    [userId, at]
  )
  return Boolean(result.rows[0]?.active)
}

/** Captains (any active captains row) are out of member contests and leaderboards. */
export async function isCaptainUser(userId: string, db: Queryable = poolDb): Promise<boolean> {
  const result = await db.query(
    `SELECT 1 FROM captains WHERE user_id = $1 AND status = 'active' LIMIT 1`,
    [userId]
  )
  return result.rows.length > 0
}

export async function getCurrentSeason(db: Queryable = poolDb) {
  const result = await db.query(
    `SELECT id, name, starts_at, ends_at, frozen_at, status
     FROM seasons
     WHERE status IN ('active', 'frozen')
     ORDER BY starts_at DESC
     LIMIT 1`
  )
  return result.rows[0] as
    | {
        id: string
        name: string
        starts_at: Date
        ends_at: Date
        frozen_at: Date | null
        status: string
      }
    | undefined
}

export async function isSeasonFrozen(seasonId: string, db: Queryable = poolDb): Promise<boolean> {
  const result = await db.query(`SELECT status, frozen_at FROM seasons WHERE id = $1`, [seasonId])
  const row = result.rows[0]
  if (!row) return true
  return row.status === 'frozen' || row.status === 'closed' || !!row.frozen_at
}

/** In the Season Champion / Mombasa race: fully paid by the cutoff. */
export async function isInTheRace(userId: string, db: Queryable = poolDb): Promise<boolean> {
  const settings = await getPointsSettings()
  const result = await db.query(
    `SELECT fully_paid_at FROM users WHERE id = $1`,
    [userId]
  )
  const paidAt = result.rows[0]?.fully_paid_at
  if (!paidAt) return false
  return new Date(paidAt).getTime() <= settings.raceCutoffAt.getTime()
}

export async function memberZoneId(userId: string, db: Queryable = poolDb): Promise<string | null> {
  const result = await db.query(
    `SELECT COALESCE(u.referred_by_region_id, c.region_id) AS zone_id
     FROM users u
     LEFT JOIN captains c ON c.user_id = u.captain_id
     WHERE u.id = $1`,
    [userId]
  )
  return result.rows[0]?.zone_id ?? null
}

/** Sets fully_paid_at once on first paid membership. */
export async function ensureFullyPaidAt(userId: string, paidAt: Date = new Date(), db: Queryable = poolDb) {
  await db.query(
    `UPDATE users SET fully_paid_at = COALESCE(fully_paid_at, $2) WHERE id = $1`,
    [userId, paidAt]
  )
}
