import type { PoolClient } from 'pg'
import { query } from '../config/db.js'

type Queryable = Pick<PoolClient, 'query'>
const poolDb = { query } as unknown as Queryable

export type PerkStatus = 'on' | 'coming_soon' | 'hidden'

export interface Perk {
  status: PerkStatus
  settings: Record<string, unknown>
}

export async function getPerk(db: Queryable, key: string): Promise<Perk | null> {
  const result = await db.query('SELECT status, settings FROM member_perks WHERE key = $1', [key])
  const row = result.rows[0]
  if (!row) return null
  return { status: row.status, settings: row.settings && typeof row.settings === 'object' ? row.settings : {} }
}

export async function perkOn(db: Queryable, key: string): Promise<boolean> {
  return (await getPerk(db, key))?.status === 'on'
}

/** A whole-number perk setting such as `hours` or `amount`, falling back when it is missing or invalid. */
export function perkNumber(perk: Perk | null, name: string, fallback: number): number {
  const value = Number(perk?.settings?.[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

export interface MembershipPeriod {
  id: string
  startsAt: Date
  endsAt: Date
}

/** The paid membership year covering `now`; once-a-year perks are counted against it. */
export async function currentMembershipPeriod(
  db: Queryable = poolDb,
  userId: string | null | undefined,
  forUpdate = false
): Promise<MembershipPeriod | null> {
  if (!userId) return null
  const result = await db.query(
    `SELECT id, starts_at, ends_at FROM memberships
     WHERE user_id = $1 AND status = 'paid' AND starts_at <= NOW() AND ends_at > NOW()
     ORDER BY starts_at
     LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
    [userId]
  )
  const row = result.rows[0]
  return row ? { id: row.id, startsAt: new Date(row.starts_at), endsAt: new Date(row.ends_at) } : null
}
