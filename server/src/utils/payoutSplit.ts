import type { PoolClient } from 'pg'
import { query } from '../config/db.js'

type Queryable = Pick<PoolClient, 'query'>
const poolDb = { query } as unknown as Queryable

export interface ZoneCaptain {
  captainId: string
  name: string | null
  email: string | null
  /** The captain's M-Pesa payout phone, or their account phone when none is set. */
  phone: string | null
  isLead: boolean
}

export interface CaptainShare extends ZoneCaptain {
  amount: number
}

/** Active captains of a zone, lead captain first, then by the date they became captains. */
export async function loadZoneCaptains(regionId: string, db: Queryable = poolDb): Promise<ZoneCaptain[]> {
  const result = await db.query(
    `SELECT c.user_id, u.name, u.email, COALESCE(NULLIF(c.payout_phone, ''), u.phone) AS phone,
            (r.lead_captain_id IS NOT DISTINCT FROM c.user_id) AS is_lead
     FROM captains c
     JOIN users u ON u.id = c.user_id
     JOIN regions r ON r.id = c.region_id
     WHERE c.region_id = $1 AND c.status = 'active'
     ORDER BY is_lead DESC, c.created_at ASC, c.user_id ASC`,
    [regionId]
  )
  return result.rows.map((row: any) => ({
    captainId: row.user_id,
    name: row.name ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    isLead: Boolean(row.is_lead),
  }))
}

/**
 * Splits `total` equally into whole shillings. The leftover (shillings and any cents) goes to the
 * lead captain, or to the first captain listed when the zone has no lead.
 */
export function splitEqually<T extends { isLead: boolean }>(total: number, captains: T[]): (T & { amount: number })[] {
  if (captains.length === 0) return []
  const totalCents = Math.round(total * 100)
  const baseCents = Math.floor(totalCents / captains.length / 100) * 100
  const leftover = totalCents - baseCents * captains.length
  const receiver = Math.max(0, captains.findIndex((c) => c.isLead))
  return captains.map((captain, i) => ({
    ...captain,
    amount: (baseCents + (i === receiver ? leftover : 0)) / 100,
  }))
}
