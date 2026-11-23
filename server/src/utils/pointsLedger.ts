import type { PoolClient } from 'pg'
import { query } from '../config/db.js'

type Queryable = Pick<PoolClient, 'query'>
const poolDb = { query } as unknown as Queryable

export type SeasonLedgerKind = 'scan' | 'streak_bonus' | 'adjustment'

export interface AppendSeasonPointsInput {
  seasonId: string
  userId: string
  points: number
  kind: SeasonLedgerKind
  eventId?: string | null
  checkinId?: string | null
  reason?: string | null
  createdBy?: string | null
}

function isUniqueViolation(error: unknown) {
  return !!error && typeof error === 'object' && (error as { code?: string }).code === '23505'
}

/** Append-only season points. Never update or delete rows. */
export async function appendSeasonPoints(
  input: AppendSeasonPointsInput,
  db: Queryable = poolDb
): Promise<{ id: string } | null> {
  if (input.points === 0) return null
  try {
    const result = await db.query(
      `INSERT INTO points_ledger
         (season_id, user_id, event_id, checkin_id, points, kind, reason, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        input.seasonId,
        input.userId,
        input.eventId ?? null,
        input.checkinId ?? null,
        input.points,
        input.kind,
        input.reason ?? null,
        input.createdBy ?? null,
      ]
    )
    return result.rows[0] ?? null
  } catch (error) {
    if (isUniqueViolation(error) && input.kind === 'scan') return null
    throw error
  }
}

export async function seasonBalance(
  userId: string,
  seasonId: string,
  db: Queryable = poolDb
): Promise<number> {
  const result = await db.query(
    `SELECT COALESCE(SUM(points), 0)::int AS total
     FROM points_ledger WHERE user_id = $1 AND season_id = $2`,
    [userId, seasonId]
  )
  return Number(result.rows[0]?.total ?? 0)
}

export async function monthSeasonBalance(
  userId: string,
  seasonId: string,
  year: number,
  month: number,
  db: Queryable = poolDb
): Promise<number> {
  const result = await db.query(
    `SELECT COALESCE(SUM(points), 0)::int AS total
     FROM points_ledger
     WHERE user_id = $1 AND season_id = $2
       AND created_at >= make_timestamptz($3, $4, 1, 0, 0, 0, 'Africa/Nairobi')
       AND created_at < make_timestamptz($3, $4, 1, 0, 0, 0, 'Africa/Nairobi') + INTERVAL '1 month'`,
    [userId, seasonId, year, month]
  )
  return Number(result.rows[0]?.total ?? 0)
}
