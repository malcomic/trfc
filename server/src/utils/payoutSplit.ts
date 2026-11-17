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

export interface TicketAttributionRow {
  /** Null when the ticket has no chosen captain in this zone (guest, unset, or other zone). */
  captain_id: string | null
  tickets: number
}

export interface ZoneCommissionRow {
  id: string
  amount: number
  source_type: string
  event_id: string | null
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

/**
 * Splits `total` by integer weights into whole shillings. Weight 0 gets 0. Leftover shillings and
 * cents go to the lead among captains with weight &gt; 0 (or the first weighted captain).
 * Every weight must be ≥ 0 and at least one weight must be &gt; 0.
 */
export function splitByWeights<T extends { isLead: boolean; weight: number }>(
  total: number,
  captains: T[]
): (T & { amount: number })[] {
  if (captains.length === 0) return []
  const totalWeight = captains.reduce((sum, c) => sum + c.weight, 0)
  if (totalWeight <= 0) {
    throw new Error('splitByWeights needs at least one positive weight')
  }
  const totalCents = Math.round(total * 100)
  const amountCents = captains.map((captain) => {
    if (captain.weight <= 0) return 0
    return Math.floor(((totalCents * captain.weight) / totalWeight) / 100) * 100
  })
  const leftover = totalCents - amountCents.reduce((sum, n) => sum + n, 0)
  // Leftover goes to the lead among captains with weight > 0, else the first weighted captain.
  let payIndex = captains.findIndex((c) => c.weight > 0 && c.isLead)
  if (payIndex < 0) payIndex = captains.findIndex((c) => c.weight > 0)
  return captains.map((captain, i) => ({
    ...captain,
    amount: (amountCents[i] + (i === payIndex ? leftover : 0)) / 100,
  }))
}

/**
 * Turns attribution rows into per-captain ticket weights. Unallocated tickets (null captain_id)
 * are redistributed among captains who already have credited tickets. When nobody has credited
 * tickets, returns null so the caller can fall back to an equal split.
 */
export function buildCaptainTicketWeights(
  captains: ZoneCaptain[],
  attribution: TicketAttributionRow[]
): (ZoneCaptain & { weight: number; creditedTickets: number })[] | null {
  if (captains.length === 0) return null
  const credited = new Map<string, number>()
  let unallocated = 0
  for (const row of attribution) {
    const tickets = Number(row.tickets) || 0
    if (tickets <= 0) continue
    if (row.captain_id && captains.some((c) => c.captainId === row.captain_id)) {
      credited.set(row.captain_id, (credited.get(row.captain_id) ?? 0) + tickets)
    } else {
      unallocated += tickets
    }
  }
  const creditedTotal = [...credited.values()].reduce((sum, n) => sum + n, 0)
  if (creditedTotal <= 0) return null

  const withCredited = captains.map((c) => ({
    ...c,
    creditedTickets: credited.get(c.captainId) ?? 0,
    weight: credited.get(c.captainId) ?? 0,
  }))
  if (unallocated <= 0) return withCredited

  // Redistribute unallocated tickets by credited share; leftover tickets to the lead among credited.
  const creditedCaptains = withCredited.filter((c) => c.creditedTickets > 0)
  const extras = new Map<string, number>()
  let assignedExtra = 0
  for (const c of creditedCaptains) {
    const extra = Math.floor((unallocated * c.creditedTickets) / creditedTotal)
    extras.set(c.captainId, extra)
    assignedExtra += extra
  }
  let leftoverTickets = unallocated - assignedExtra
  const leadAmongCredited =
    creditedCaptains.find((c) => c.isLead) ?? creditedCaptains[0]
  if (leftoverTickets > 0 && leadAmongCredited) {
    extras.set(leadAmongCredited.captainId, (extras.get(leadAmongCredited.captainId) ?? 0) + leftoverTickets)
  }

  return withCredited.map((c) => ({
    ...c,
    weight: c.creditedTickets + (extras.get(c.captainId) ?? 0),
  }))
}

/** Used referral tickets for one event in one zone, grouped by the buyer's chosen captain in that zone. */
export async function loadZoneTicketAttribution(
  eventId: string,
  regionId: string,
  db: Queryable = poolDb
): Promise<TicketAttributionRow[]> {
  const result = await db.query(
    `SELECT
       CASE
         WHEN u.captain_id IS NOT NULL AND EXISTS (
           SELECT 1 FROM captains zc
           WHERE zc.user_id = u.captain_id AND zc.region_id = $2 AND zc.status = 'active'
         ) THEN u.captain_id
         ELSE NULL
       END AS captain_id,
       COUNT(*)::int AS tickets
     FROM tickets t
     LEFT JOIN users u ON u.id = t.user_id
     WHERE t.event_id = $1 AND t.payment_status = 'paid' AND t.checked_in_at IS NOT NULL
       AND COALESCE(
         t.referral_region_id,
         CASE WHEN t.created_at >= COALESCE(u.referred_at, '-infinity'::timestamptz) THEN u.referred_by_region_id END
       ) = $2
       AND NOT EXISTS (
         SELECT 1 FROM captains own
         WHERE own.user_id = t.user_id AND own.region_id = $2 AND own.status = 'active'
       )
     GROUP BY 1`,
    [eventId, regionId]
  )
  return result.rows.map((row: any) => ({
    captain_id: row.captain_id ?? null,
    tickets: Number(row.tickets) || 0,
  }))
}

/**
 * Splits one zone commission amount. Event-share money uses ticket weights; when nobody has
 * credited tickets (or attribution is empty), falls back to an equal split.
 */
export function splitZonePayoutAmount(
  amount: number,
  captains: ZoneCaptain[],
  attribution: TicketAttributionRow[] | null
): CaptainShare[] {
  if (captains.length === 0) return []
  const weights = attribution ? buildCaptainTicketWeights(captains, attribution) : null
  if (!weights) return splitEqually(amount, captains)
  return splitByWeights(amount, weights).map(({ weight: _w, creditedTickets: _c, ...share }) => share)
}

/** Zone commissions selected for payout, with the event id when the source is an event profit share. */
export async function loadZoneCommissionsForPayout(
  commissionIds: string[],
  regionId: string,
  db: Queryable = poolDb
): Promise<ZoneCommissionRow[]> {
  if (commissionIds.length === 0) return []
  const result = await db.query(
    `SELECT cc.id, cc.amount::float AS amount, cc.source_type, l.event_id
     FROM captain_commissions cc
     LEFT JOIN event_settlement_lines l
       ON cc.source_type = 'event_share' AND l.id = cc.source_id AND l.region_id = cc.region_id
     WHERE cc.id = ANY($1::uuid[]) AND cc.region_id = $2 AND cc.captain_id IS NULL
       AND cc.status = 'approved' AND cc.payout_id IS NULL`,
    [commissionIds, regionId]
  )
  return result.rows.map((row: any) => ({
    id: row.id,
    amount: Number(row.amount),
    source_type: row.source_type,
    event_id: row.event_id ?? null,
  }))
}

/**
 * Splits each selected zone commission (ticket-weighted for event shares, equal otherwise), then
 * sums per captain. Only captains owed more than 0 are returned.
 */
export async function splitZoneCommissions(
  commissionIds: string[],
  regionId: string,
  captains: ZoneCaptain[],
  db: Queryable = poolDb
): Promise<{ amount: number; shares: CaptainShare[] }> {
  const commissions = await loadZoneCommissionsForPayout(commissionIds, regionId, db)
  const amount = Math.round(commissions.reduce((sum, c) => sum + c.amount, 0) * 100) / 100
  if (captains.length === 0 || commissions.length === 0) {
    return { amount, shares: [] }
  }

  const attributionCache = new Map<string, TicketAttributionRow[]>()
  const totals = new Map<string, number>()

  for (const commission of commissions) {
    let attribution: TicketAttributionRow[] | null = null
    if (commission.source_type === 'event_share' && commission.event_id) {
      const key = `${commission.event_id}:${regionId}`
      if (!attributionCache.has(key)) {
        attributionCache.set(key, await loadZoneTicketAttribution(commission.event_id, regionId, db))
      }
      attribution = attributionCache.get(key)!
    }
    for (const share of splitZonePayoutAmount(commission.amount, captains, attribution)) {
      totals.set(share.captainId, Math.round(((totals.get(share.captainId) ?? 0) + share.amount) * 100) / 100)
    }
  }

  // Fix rounding drift so summed shares equal the payout total; leftover cents to the lead.
  const shares = captains
    .map((c) => ({ ...c, amount: totals.get(c.captainId) ?? 0 }))
    .filter((c) => c.amount > 0)
  const summed = Math.round(shares.reduce((sum, s) => sum + s.amount, 0) * 100)
  const target = Math.round(amount * 100)
  if (shares.length > 0 && summed !== target) {
    const receiver = shares.find((s) => s.isLead) ?? shares[0]
    receiver.amount = Math.round((receiver.amount + (target - summed) / 100) * 100) / 100
  }
  return { amount, shares }
}
