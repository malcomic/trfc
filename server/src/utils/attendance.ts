import type { PoolClient } from 'pg'
import { getClient, query } from '../config/db.js'
import { recordCaptainCommission, reverseCaptainCommission } from './captainCommissions.js'
import { closePlanToCredit } from './installments.js'
import { creditAvailableFrom, getTicketRules } from './ticketRules.js'
import { addCredit, poolDb, voidCredit, withWallet } from './wallet.js'

const HOUR_MS = 60 * 60 * 1000

export class AttendanceError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
    this.name = 'AttendanceError'
  }
}

type Queryable = Pick<PoolClient, 'query'>
export interface Actor {
  id: string
  role: string
}

/** Admins can act on any event; active captains only on events in their own zone. */
export async function canActOnEvent(db: Queryable, actor: Actor, eventId: string): Promise<boolean> {
  if (actor.role === 'admin') return true
  const result = await db.query(
    `SELECT 1 FROM captains c JOIN event_zones ez ON ez.zone_id = c.region_id
     WHERE c.user_id = $1 AND c.status = 'active' AND ez.event_id = $2`,
    [actor.id, eventId]
  )
  return result.rows.length > 0
}

/** Recent and upcoming events this person can confirm scan lists for. */
export async function listManageableEvents(actor: Actor) {
  const zoneFilter =
    actor.role === 'admin'
      ? ''
      : `AND EXISTS (SELECT 1 FROM captains c JOIN event_zones ez ON ez.zone_id = c.region_id
                     WHERE c.user_id = $1 AND c.status = 'active' AND ez.event_id = e.id)`
  const result = await query(
    `SELECT e.id, e.title, e.event_date, e.location, e.scan_list_confirmed_at, e.cancelled_at,
            COUNT(t.id) FILTER (WHERE t.payment_status = 'paid')::int AS paid,
            COUNT(t.id) FILTER (WHERE t.payment_status = 'paid' AND t.checked_in_at IS NOT NULL)::int AS scanned,
            COUNT(t.id) FILTER (WHERE t.attendance_status = 'no_show')::int AS no_shows,
            COUNT(t.id) FILTER (WHERE t.attendance_status = 'cancelled_early')::int AS cancelled_early
     FROM events e
     LEFT JOIN tickets t ON t.event_id = e.id
     WHERE e.event_date >= CURRENT_DATE - INTERVAL '14 days' AND e.event_date < CURRENT_DATE + INTERVAL '8 days'
       ${zoneFilter}
     GROUP BY e.id
     ORDER BY e.event_date DESC`,
    actor.role === 'admin' ? [] : [actor.id]
  )
  return result.rows
}

export async function getScanList(eventId: string) {
  const [event, tickets, rules] = await Promise.all([
    query(
      `SELECT id, title, event_date, location, scan_list_confirmed_at, cancelled_at,
              (event_date AT TIME ZONE 'Africa/Nairobi') AS starts_at
       FROM events WHERE id = $1`,
      [eventId]
    ),
    query(
      `SELECT t.id, t.attendee_name, t.phone, t.email, t.payment_status, t.checked_in_at, t.attendance_status,
              t.marked_present_at, t.cancel_notice_at, u.name AS user_name
       FROM tickets t LEFT JOIN users u ON u.id = t.user_id
       WHERE t.event_id = $1 AND (t.payment_status = 'paid' OR t.attendance_status IS NOT NULL)
       ORDER BY t.checked_in_at NULLS LAST, t.attendee_name`,
      [eventId]
    ),
    getTicketRules(),
  ])
  if (event.rows.length === 0) throw new AttendanceError('Event not found', 404)
  const startsAt = new Date(event.rows[0].starts_at)
  return {
    event: event.rows[0],
    tickets: tickets.rows,
    markPresentUntil: new Date(startsAt.getTime() + rules.markPresentHours * HOUR_MS),
  }
}

/** The member the value goes to: the ticket's account, or an account with the ticket's email. */
async function ticketOwner(db: Queryable, ticket: { user_id: string | null; email: string | null }) {
  if (ticket.user_id) return ticket.user_id
  if (!ticket.email) return null
  const user = await db.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [ticket.email])
  return (user.rows[0]?.id as string | undefined) ?? null
}

export interface ConfirmResult {
  attended: number
  noShows: number
  credited: number
}

/**
 * Applies the scan list after the event: scanned tickets are "attended"; paid tickets that were not
 * scanned are no-shows and their value becomes ticket credit (shown the morning after the event).
 * Safe to run more than once; only tickets without an attendance status are processed.
 */
export async function confirmScanList(eventId: string, actorId: string | null, now = new Date()): Promise<ConfirmResult> {
  const eventResult = await query(
    `SELECT e.id, e.title, e.cancelled_at, to_char(e.event_date, 'YYYY-MM-DD') AS event_day,
            (e.event_date AT TIME ZONE 'Africa/Nairobi') AS starts_at,
            (e.event_date AT TIME ZONE 'Africa/Nairobi') >= s.attendance_since AS after_launch
     FROM events e CROSS JOIN ticket_rules_settings s WHERE e.id = $1 AND s.id = 1`,
    [eventId]
  )
  const event = eventResult.rows[0]
  if (!event) throw new AttendanceError('Event not found', 404)
  if (event.cancelled_at) throw new AttendanceError('This event was cancelled')
  if (new Date(event.starts_at).getTime() > now.getTime()) {
    throw new AttendanceError('The scan list can be confirmed once the event has started')
  }
  if (!event.after_launch) {
    throw new AttendanceError('Scan lists can only be confirmed for events held after the ticket value rules started')
  }

  const attended = await query(
    `UPDATE tickets SET attendance_status = 'attended'
     WHERE event_id = $1 AND payment_status = 'paid' AND checked_in_at IS NOT NULL AND attendance_status IS NULL`,
    [eventId]
  )

  const missing = await query(
    `SELECT t.id, t.user_id, t.email, t.referral_region_id, COALESCE(t.unit_price, ett.price, 0)::float AS price
     FROM tickets t LEFT JOIN event_ticket_types ett ON ett.id = t.ticket_type_id
     WHERE t.event_id = $1 AND t.payment_status = 'paid' AND t.checked_in_at IS NULL AND t.attendance_status IS NULL`,
    [eventId]
  )
  const availableFrom = new Date(Math.max(now.getTime(), creditAvailableFrom(event.event_day).getTime()))
  let credited = 0
  for (const ticket of missing.rows) {
    const owner = await ticketOwner(poolDb, ticket)
    const marked = async (db: Queryable) => {
      const updated = await db.query(
        `UPDATE tickets SET attendance_status = 'no_show' WHERE id = $1 AND attendance_status IS NULL RETURNING id`,
        [ticket.id]
      )
      return (updated.rowCount ?? 0) > 0
    }
    if (owner && ticket.price > 0) {
      const added = await withWallet(owner, async (client) => {
        if (!(await marked(client))) return false
        await addCredit(client, owner, {
          amount: ticket.price,
          reason: 'no_show',
          eventDay: event.event_day,
          availableFrom,
          sourceTicketId: ticket.id,
          sourceEventId: eventId,
          regionId: ticket.referral_region_id,
          note: `No-show: ${event.title}`,
        })
        return true
      })
      if (added) credited++
    } else {
      await marked(poolDb)
    }
    await reverseCaptainCommission('ticket', ticket.id)
  }

  await query(
    `UPDATE events SET scan_list_confirmed_at = COALESCE(scan_list_confirmed_at, $2),
            scan_list_confirmed_by = COALESCE(scan_list_confirmed_by, $3)
     WHERE id = $1`,
    [eventId, now, actorId]
  )
  return { attended: attended.rowCount ?? 0, noShows: missing.rows.length, credited }
}

/** The member came but didn't scan: mark them present and take back the unused no-show credit. */
export async function markPresent(ticketId: string, actor: Actor, now = new Date()) {
  const rules = await getTicketRules()
  const found = await query(
    `SELECT t.id, t.event_id, t.user_id, t.email, t.payment_status, t.attendance_status,
            (e.event_date AT TIME ZONE 'Africa/Nairobi') AS starts_at
     FROM tickets t JOIN events e ON e.id = t.event_id WHERE t.id = $1`,
    [ticketId]
  )
  const ticket = found.rows[0]
  if (!ticket) throw new AttendanceError('Ticket not found', 404)
  if (!(await canActOnEvent(poolDb, actor, ticket.event_id))) {
    throw new AttendanceError('You can only update scan lists for events in your zone', 403)
  }
  if (ticket.payment_status !== 'paid') throw new AttendanceError('Only paid tickets can be marked present')
  if (ticket.attendance_status === 'attended') return { voided: 0 }
  const deadline = new Date(ticket.starts_at).getTime() + rules.markPresentHours * HOUR_MS
  if (now.getTime() > deadline) {
    throw new AttendanceError(`Members can only be marked present within ${rules.markPresentHours} hours of the event`)
  }

  const credit = await query(
    `SELECT id, user_id FROM ticket_credits WHERE source_ticket_id = $1 AND reason = 'no_show' AND status = 'active'`,
    [ticketId]
  )
  const apply = async (db: Queryable) => {
    let voided = 0
    for (const row of credit.rows) {
      voided += await voidCredit(db, row.user_id, row.id, {
        note: 'Marked present by the event lead',
        createdBy: actor.id,
      })
    }
    await db.query(
      `UPDATE tickets SET attendance_status = 'attended', marked_present_by = $2, marked_present_at = $3 WHERE id = $1`,
      [ticketId, actor.id, now]
    )
    return voided
  }
  const ownerId: string | undefined = credit.rows[0]?.user_id
  const voided = ownerId ? await withWallet(ownerId, apply) : await apply(poolDb)
  await recordCaptainCommission('ticket', ticketId, { reinstate: true })
  return { voided }
}

/**
 * TRFC cancels an event (weather, safety, ...). Every paid or part-paid ticket becomes ticket credit,
 * usable straight away, and is never counted as a member no-show.
 */
export async function cancelEventByTrfc(eventId: string, reason: string, actorId: string) {
  const client = await getClient()
  let eventDay: string
  let title: string
  try {
    await client.query('BEGIN')
    const updated = await client.query(
      `UPDATE events SET cancelled_at = NOW(), cancel_reason = $2
       WHERE id = $1 AND cancelled_at IS NULL
       RETURNING title, to_char(event_date, 'YYYY-MM-DD') AS event_day`,
      [eventId, reason]
    )
    if (updated.rows.length === 0) throw new AttendanceError('Event not found or already cancelled', 404)
    eventDay = updated.rows[0].event_day
    title = updated.rows[0].title
    await client.query(
      `UPDATE tickets SET payment_status = 'cancelled', cancelled_at = NOW()
       WHERE event_id = $1 AND payment_status IN ('pending', 'failed')`,
      [eventId]
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    throw error
  } finally {
    client.release()
  }

  const plans = await query(`SELECT id, user_id FROM ticket_payment_plans WHERE event_id = $1 AND status = 'active'`, [
    eventId,
  ])
  for (const plan of plans.rows) {
    await withWallet(plan.user_id, async (db) => {
      await closePlanToCredit(db, plan.id, 'event_cancelled')
      await db.query(
        `UPDATE tickets SET attendance_status = 'excused'
         WHERE purchase_batch_id = (SELECT purchase_batch_id FROM ticket_payment_plans WHERE id = $1)`,
        [plan.id]
      )
    })
  }

  const paid = await query(
    `SELECT t.id, t.user_id, t.email, t.referral_region_id, COALESCE(t.unit_price, ett.price, 0)::float AS price
     FROM tickets t LEFT JOIN event_ticket_types ett ON ett.id = t.ticket_type_id
     WHERE t.event_id = $1 AND t.payment_status = 'paid'`,
    [eventId]
  )
  let credited = 0
  let withoutAccount = 0
  for (const ticket of paid.rows) {
    const owner = await ticketOwner(poolDb, ticket)
    const cancel = async (db: Queryable) => {
      await db.query(
        `UPDATE tickets SET payment_status = 'cancelled', cancelled_at = NOW(), attendance_status = 'excused' WHERE id = $1`,
        [ticket.id]
      )
    }
    if (owner) {
      await withWallet(owner, async (db) => {
        await cancel(db)
        await addCredit(db, owner, {
          amount: ticket.price,
          reason: 'event_cancelled',
          eventDay,
          sourceTicketId: ticket.id,
          sourceEventId: eventId,
          regionId: ticket.referral_region_id,
          note: `Event cancelled by TRFC: ${title}`,
          createdBy: actorId,
        })
      })
      credited++
    } else {
      await cancel(poolDb)
      withoutAccount++
    }
    await reverseCaptainCommission('ticket', ticket.id)
  }
  return { plansClosed: plans.rows.length, ticketsCredited: credited, guestTickets: withoutAccount }
}

/** Confirms scan lists nobody confirmed, the morning after the event, so no-show credit appears on time. */
export async function autoConfirmScanLists(now = new Date()): Promise<number> {
  const due = await query(
    `SELECT e.id FROM events e CROSS JOIN ticket_rules_settings s
     WHERE s.id = 1 AND e.scan_list_confirmed_at IS NULL AND e.cancelled_at IS NULL
       AND (e.event_date AT TIME ZONE 'Africa/Nairobi') >= s.attendance_since
       AND (((e.event_date::date + 1) + TIME '06:00')::timestamp AT TIME ZONE 'Africa/Nairobi') <= $1
     ORDER BY e.event_date
     LIMIT 20`,
    [now]
  )
  let confirmed = 0
  for (const row of due.rows) {
    try {
      await confirmScanList(row.id, null, now)
      confirmed++
    } catch (error) {
      console.error(`Auto-confirming the scan list for event ${row.id} failed:`, error)
    }
  }
  return confirmed
}
