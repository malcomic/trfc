import type { PoolClient } from 'pg'
import { query } from '../config/db.js'
import { appendSeasonPoints } from './pointsLedger.js'
import { getPointsSettings } from './pointsSettings.js'

type Queryable = Pick<PoolClient, 'query'>
const poolDb = { query } as unknown as Queryable

/** Nairobi calendar date YYYY-MM-DD for a timestamp. */
export function nairobiDateString(at: Date): string {
  return at.toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' })
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d + days))
  return utc.toISOString().slice(0, 10)
}

/** Previous Saturday (Nairobi) before or on `from` if from is Saturday. */
export function previousSaturday(from: string): string {
  const [y, m, d] = from.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d))
  const dow = utc.getUTCDay() // 0 Sun .. 6 Sat
  const back = dow === 6 ? 0 : (dow + 1) % 7
  return addDays(from, -back)
}

export interface StreakState {
  /** Saturdays counted toward the next bonus (0..streakLength-1 after a bonus resets progress). */
  progress: number
  freeMissAvailable: boolean
  towardNext: number
}

/**
 * Streak from official Saturdays and the member's attended Saturday dates.
 * One free miss; a second consecutive miss resets. Free miss returns after each bonus.
 */
export function computeStreakState(
  officialSaturdaysAsc: string[],
  attendedSet: Set<string>,
  streakLength: number
): StreakState {
  let progress = 0
  let freeMissAvailable = true
  let consecutiveMisses = 0

  for (const sat of officialSaturdaysAsc) {
    if (attendedSet.has(sat)) {
      consecutiveMisses = 0
      progress += 1
      if (progress >= streakLength) {
        progress = 0
        freeMissAvailable = true
        consecutiveMisses = 0
      }
    } else {
      consecutiveMisses += 1
      if (consecutiveMisses === 1 && freeMissAvailable) {
        freeMissAvailable = false
      } else if (consecutiveMisses >= 2) {
        progress = 0
        freeMissAvailable = true
        consecutiveMisses = 0
      }
    }
  }

  return {
    progress,
    freeMissAvailable,
    towardNext: streakLength - progress,
  }
}

/** How many streak bonuses the attendance sequence has earned so far. */
export function countEarnedStreakBonuses(
  officialSaturdaysAsc: string[],
  attendedSet: Set<string>,
  streakLength: number
): number {
  let progress = 0
  let freeMissAvailable = true
  let consecutiveMisses = 0
  let bonuses = 0

  for (const sat of officialSaturdaysAsc) {
    if (attendedSet.has(sat)) {
      consecutiveMisses = 0
      progress += 1
      if (progress >= streakLength) {
        bonuses += 1
        progress = 0
        freeMissAvailable = true
        consecutiveMisses = 0
      }
    } else {
      consecutiveMisses += 1
      if (consecutiveMisses === 1 && freeMissAvailable) {
        freeMissAvailable = false
      } else if (consecutiveMisses >= 2) {
        progress = 0
        freeMissAvailable = true
        consecutiveMisses = 0
      }
    }
  }
  return bonuses
}

async function officialSaturdays(seasonId: string, throughDate: string, db: Queryable) {
  const result = await db.query(
    `SELECT DISTINCT (e.event_date AT TIME ZONE 'Africa/Nairobi')::date::text AS d
     FROM events e
     WHERE e.season_id = $1
       AND e.cancelled_at IS NULL
       AND EXTRACT(DOW FROM e.event_date AT TIME ZONE 'Africa/Nairobi') = 6
       AND (e.event_date AT TIME ZONE 'Africa/Nairobi')::date <= $2::date
       AND e.points_kind IN ('zone_run', 'common_run', 'hike', 'fit_fest')
     ORDER BY 1`,
    [seasonId, throughDate]
  )
  return result.rows.map((r) => String(r.d))
}

async function attendedSaturdays(userId: string, seasonId: string, throughDate: string, db: Queryable) {
  const result = await db.query(
    `SELECT DISTINCT (e.event_date AT TIME ZONE 'Africa/Nairobi')::date::text AS d
     FROM event_checkins ec
     JOIN events e ON e.id = ec.event_id
     WHERE ec.user_id = $1
       AND e.season_id = $2
       AND e.cancelled_at IS NULL
       AND EXTRACT(DOW FROM e.event_date AT TIME ZONE 'Africa/Nairobi') = 6
       AND (e.event_date AT TIME ZONE 'Africa/Nairobi')::date <= $3::date
     ORDER BY 1`,
    [userId, seasonId, throughDate]
  )
  return new Set(result.rows.map((r) => String(r.d)))
}

export async function getStreakCard(
  userId: string,
  seasonId: string,
  db: Queryable = poolDb
): Promise<StreakState & { streakLength: number }> {
  const settings = await getPointsSettings()
  const today = nairobiDateString(new Date())
  const official = await officialSaturdays(seasonId, today, db)
  const attended = await attendedSaturdays(userId, seasonId, today, db)
  const state = computeStreakState(official, attended, settings.streakLength)
  return { ...state, streakLength: settings.streakLength }
}

/**
 * After a successful Saturday check-in, append streak bonus rows so ledger bonuses
 * match how many full streaks the attendance sequence has earned.
 */
export async function maybeAwardStreakBonus(params: {
  seasonId: string
  userId: string
  eventId: string
  eventDate: Date
  createdBy: string
  db?: Queryable
}): Promise<number> {
  const db = params.db ?? poolDb
  const settings = await getPointsSettings()
  const through = nairobiDateString(params.eventDate)
  const official = await officialSaturdays(params.seasonId, through, db)
  const attended = await attendedSaturdays(params.userId, params.seasonId, through, db)
  const earned = countEarnedStreakBonuses(official, attended, settings.streakLength)
  const existing = await db.query(
    `SELECT COUNT(*)::int AS n FROM points_ledger
     WHERE user_id = $1 AND season_id = $2 AND kind = 'streak_bonus'`,
    [params.userId, params.seasonId]
  )
  const have = Number(existing.rows[0]?.n ?? 0)
  let awarded = 0
  for (let i = have; i < earned; i++) {
    const row = await appendSeasonPoints(
      {
        seasonId: params.seasonId,
        userId: params.userId,
        points: settings.streakBonusPoints,
        kind: 'streak_bonus',
        eventId: params.eventId,
        reason: `Streak bonus ${i + 1}`,
        createdBy: params.createdBy,
      },
      db
    )
    if (row) awarded += settings.streakBonusPoints
  }
  return awarded
}
