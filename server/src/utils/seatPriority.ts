import type { PoolClient } from 'pg'
import { addDays, getTicketRules, nairobiTime } from './ticketRules.js'

export type SeatPool = 'member' | 'open'

export interface SeatState {
  /** Total seats for the event, or null when it has no overall limit. */
  total: number | null
  priorityPct: number | null
  memberSeats: number
  memberTaken: number
  openTaken: number
  /** When unclaimed member seats open to everyone. */
  releaseAt: Date | null
  released: boolean
  /** Seats a non-member can book now. */
  openAvailable: number | null
  /** Member-priority seats still free (members can also take open seats). */
  memberPoolAvailable: number | null
  /** Member seats that were not claimed and have opened to everyone. */
  openedToAll: number
}

/**
 * `pct`% of seats (rounded up) are held for members until `releaseAt`. Before then non-members can only
 * take the other seats; members fill member seats first and can also take open seats. From `releaseAt`
 * every free seat is open to everyone.
 */
export function computeSeatState(input: {
  total: number | null
  pct: number | null
  memberTaken: number
  openTaken: number
  releaseAt: Date | null
  now?: Date
}): SeatState {
  const now = input.now ?? new Date()
  const { total, memberTaken, openTaken } = input
  const pct = total != null && input.pct != null && input.pct > 0 ? Math.min(100, input.pct) : null
  const memberSeats = total != null && pct != null ? Math.ceil((total * pct) / 100) : 0
  const released = pct == null || (input.releaseAt != null && now.getTime() >= input.releaseAt.getTime())

  if (total == null) {
    return {
      total,
      priorityPct: null,
      memberSeats: 0,
      memberTaken,
      openTaken,
      releaseAt: null,
      released: true,
      openAvailable: null,
      memberPoolAvailable: null,
      openedToAll: 0,
    }
  }

  const free = Math.max(0, total - memberTaken - openTaken)
  if (released) {
    return {
      total,
      priorityPct: pct,
      memberSeats,
      memberTaken,
      openTaken,
      releaseAt: pct == null ? null : input.releaseAt,
      released: true,
      openAvailable: free,
      memberPoolAvailable: 0,
      openedToAll: pct == null ? 0 : Math.max(0, memberSeats - memberTaken),
    }
  }

  const memberPoolAvailable = Math.max(0, memberSeats - memberTaken)
  const openAvailable = Math.min(free, Math.max(0, total - memberSeats - openTaken))
  return {
    total,
    priorityPct: pct,
    memberSeats,
    memberTaken,
    openTaken,
    releaseAt: input.releaseAt,
    released: false,
    openAvailable,
    memberPoolAvailable: Math.min(free, memberPoolAvailable),
    openedToAll: 0,
  }
}

/** Seats this viewer can book now, or null when unlimited. */
export function availableFor(state: SeatState, isMember: boolean): number | null {
  if (state.openAvailable == null) return null
  if (!isMember || state.released) return state.openAvailable
  return Math.min(Math.max(0, (state.total ?? 0) - state.memberTaken - state.openTaken), state.openAvailable + (state.memberPoolAvailable ?? 0))
}

/** Which pool each requested seat comes from, or null if there aren't enough seats for this viewer. */
export function allocateSeats(state: SeatState, isMember: boolean, quantity: number): SeatPool[] | null {
  const available = availableFor(state, isMember)
  if (available != null && quantity > available) return null
  const fromMemberPool = isMember && !state.released ? Math.min(quantity, state.memberPoolAvailable ?? 0) : 0
  return Array.from({ length: quantity }, (_, i) => (i < fromMemberPool ? 'member' : 'open'))
}

type Queryable = Pick<PoolClient, 'query'>

/**
 * Loads the seat state for an event. Total seats is `events.capacity`, or the sum of the ticket type
 * capacities when every active type has one. Pass a transaction client that has locked the event row
 * when the result decides a booking.
 */
export async function loadSeatState(db: Queryable, eventId: string, now = new Date()): Promise<SeatState | null> {
  const result = await db.query(
    `SELECT e.capacity, e.member_priority_pct, to_char(e.event_date, 'YYYY-MM-DD') AS event_day,
            (SELECT CASE WHEN COUNT(*) > 0 AND COUNT(*) = COUNT(ett.capacity) THEN SUM(ett.capacity) END
             FROM event_ticket_types ett WHERE ett.event_id = e.id AND ett.is_active = true) AS type_capacity,
            COUNT(t.id) FILTER (WHERE t.seat_pool = 'member')::int AS member_taken,
            COUNT(t.id) FILTER (WHERE t.seat_pool IS DISTINCT FROM 'member')::int AS open_taken
     FROM events e
     LEFT JOIN tickets t ON t.event_id = e.id AND t.payment_status IN ('pending', 'paid', 'reserved')
     WHERE e.id = $1
     GROUP BY e.id`,
    [eventId]
  )
  const row = result.rows[0]
  if (!row) return null
  const rules = await getTicketRules()
  const total = row.capacity != null ? Number(row.capacity) : row.type_capacity != null ? Number(row.type_capacity) : null
  const pct = row.member_priority_pct != null ? Number(row.member_priority_pct) : null
  return computeSeatState({
    total,
    pct,
    memberTaken: Number(row.member_taken),
    openTaken: Number(row.open_taken),
    releaseAt: pct ? nairobiTime(addDays(String(row.event_day), -rules.priorityReleaseDays)) : null,
    now,
  })
}

export async function isActiveMember(db: Queryable, userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false
  const result = await db.query('SELECT member_until > NOW() AS active FROM users WHERE id = $1', [userId])
  return Boolean(result.rows[0]?.active)
}

/** What a client may see. Non-members never see member seat counts. */
export function publicSeatInfo(state: SeatState | null, isMember: boolean) {
  if (!state) return { priority_note: null, seats_available: null, sold_out_for_you: false }
  const available = availableFor(state, isMember)
  return {
    priority_note:
      state.priorityPct != null
        ? `${state.priorityPct}% of the seats are given to members as first priority.`
        : null,
    seats_available: available,
    sold_out_for_you: available === 0,
  }
}
