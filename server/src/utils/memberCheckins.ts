import { query } from '../config/db.js'
import { AttendanceError, canActOnEvent, type Actor } from './attendance.js'
import { findMemberByCode, normalizeMemberCode, type MemberByCode } from './memberPass.js'
import { parseScanPayload } from './qrCodeGenerator.js'
import { poolDb } from './wallet.js'

export type MemberCheckinStatus = 'valid' | 'already_checked_in' | 'not_found' | 'wrong_zone'
export type CheckinMethod = 'qr' | 'code'

export interface MemberCheckinResult {
  status: MemberCheckinStatus
  member: MemberByCode | null
  checkedInAt: string | null
  /** True when the scan also checked in the member's paid ticket for this event. */
  ticketCheckedIn?: boolean
}

/** Reads a scanned `member:CODE` QR payload or a typed code. */
export function codeFromInput(input: { payload?: unknown; code?: unknown }): { code: string; method: CheckinMethod } | null {
  if (typeof input.payload === 'string' && input.payload.trim()) {
    const parsed = parseScanPayload(input.payload)
    if (parsed?.kind === 'member') {
      const code = normalizeMemberCode(parsed.code)
      return code ? { code, method: 'qr' } : null
    }
    const typed = normalizeMemberCode(input.payload)
    return typed ? { code: typed, method: 'code' } : null
  }
  if (typeof input.code === 'string' && input.code.trim()) {
    const code = normalizeMemberCode(input.code)
    return code ? { code, method: 'code' } : null
  }
  return null
}

const isStaff = (actor: Actor) => actor.role === 'admin' || actor.role === 'scanner'

async function loadEvent(eventId: string) {
  const result = await query('SELECT id, title, cancelled_at FROM events WHERE id = $1', [eventId])
  const event = result.rows[0]
  if (!event) throw new AttendanceError('Event not found', 404)
  if (event.cancelled_at) throw new AttendanceError('This event was cancelled')
  return event
}

async function existingCheckin(eventId: string, userId: string): Promise<string | null> {
  const result = await query('SELECT scanned_at FROM event_checkins WHERE event_id = $1 AND user_id = $2', [
    eventId,
    userId,
  ])
  return result.rows[0]?.scanned_at ?? null
}

async function resolve(actor: Actor, eventId: string, code: string) {
  await loadEvent(eventId)
  const member = await findMemberByCode(code)
  if (!member) return { status: 'not_found' as const, member: null }
  if (!isStaff(actor) && !(await canActOnEvent(poolDb, actor, eventId))) {
    return { status: 'wrong_zone' as const, member }
  }
  return { status: 'valid' as const, member }
}

export async function lookupMemberCheckin(actor: Actor, eventId: string, code: string): Promise<MemberCheckinResult> {
  const found = await resolve(actor, eventId, code)
  if (found.status !== 'valid') return { ...found, checkedInAt: null }
  const checkedInAt = await existingCheckin(eventId, found.member.id)
  return { status: checkedInAt ? 'already_checked_in' : 'valid', member: found.member, checkedInAt }
}

export async function admitMemberCheckin(
  actor: Actor,
  eventId: string,
  code: string,
  method: CheckinMethod
): Promise<MemberCheckinResult> {
  const found = await resolve(actor, eventId, code)
  if (found.status !== 'valid') return { ...found, checkedInAt: null }
  const member = found.member

  const inserted = await query(
    `INSERT INTO event_checkins (event_id, user_id, scanned_by, method)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (event_id, user_id) DO NOTHING
     RETURNING scanned_at`,
    [eventId, member.id, actor.id, method]
  )

  // A paid ticket for the same event counts as used, so no-show credit is not given by mistake.
  const ticket = await query(
    `UPDATE tickets SET checked_in_at = NOW(), checked_in_by = $3
     WHERE id = (
       SELECT id FROM tickets
       WHERE event_id = $1 AND user_id = $2 AND payment_status = 'paid' AND checked_in_at IS NULL
       ORDER BY created_at
       LIMIT 1
     )
     RETURNING id`,
    [eventId, member.id, actor.id]
  )
  const ticketCheckedIn = (ticket.rowCount ?? ticket.rows.length) > 0

  if (inserted.rows[0]) {
    return { status: 'valid', member, checkedInAt: inserted.rows[0].scanned_at, ticketCheckedIn }
  }
  return {
    status: 'already_checked_in',
    member,
    checkedInAt: await existingCheckin(eventId, member.id),
    ticketCheckedIn,
  }
}

/** Recent and upcoming events this person can scan members into. */
export async function listCheckinEvents(actor: Actor) {
  const zoneFilter = isStaff(actor)
    ? ''
    : `AND EXISTS (SELECT 1 FROM captains c JOIN event_zones ez ON ez.zone_id = c.region_id
                   WHERE c.user_id = $1 AND c.status = 'active' AND ez.event_id = e.id)`
  const result = await query(
    `SELECT e.id, e.title, e.event_date, e.location, e.is_community_run,
            (SELECT COUNT(*)::int FROM event_checkins ec WHERE ec.event_id = e.id) AS checked_in
     FROM events e
     WHERE e.cancelled_at IS NULL
       AND e.event_date >= CURRENT_DATE - INTERVAL '2 days'
       AND e.event_date < CURRENT_DATE + INTERVAL '8 days'
       ${zoneFilter}
     ORDER BY e.event_date`,
    isStaff(actor) ? [] : [actor.id]
  )
  return result.rows
}
