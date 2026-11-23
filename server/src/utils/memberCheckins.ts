import { getClient, query } from '../config/db.js'
import { AttendanceError, canActOnEvent, type Actor } from './attendance.js'
import { findMemberByCode, normalizeMemberCode, type MemberByCode } from './memberPass.js'
import { findMemberByPassToken, parseMemberPassPayload } from './memberTotpPass.js'
import {
  getCurrentSeason,
  isCaptainUser,
  isPaidActiveOn,
  isSeasonFrozen,
} from './pointsEligibility.js'
import { appendSeasonPoints } from './pointsLedger.js'
import { getPointsSettings, pointsForKind, type PointsKind } from './pointsSettings.js'
import { maybeAwardStreakBonus } from './pointsStreak.js'
import { parseScanPayload } from './qrCodeGenerator.js'
import { poolDb } from './wallet.js'

export type MemberCheckinStatus =
  | 'valid'
  | 'already_checked_in'
  | 'not_found'
  | 'wrong_zone'
  | 'not_eligible'
  | 'outside_window'
  | 'self_scan'
  | 'season_frozen'

export type CheckinMethod = 'qr' | 'code'

export interface MemberCheckinResult {
  status: MemberCheckinStatus
  member: MemberByCode | null
  checkedInAt: string | null
  /** True when the scan also checked in the member's paid ticket for this event. */
  ticketCheckedIn?: boolean
  pointsAwarded?: number
}

type ResolvedMember =
  | { status: 'not_found'; member: null }
  | { status: 'wrong_zone'; member: MemberByCode }
  | { status: 'valid'; member: MemberByCode }

/** Reads a scanned rotating pass, stable member QR, or a typed code. */
export function codeFromInput(input: {
  payload?: unknown
  code?: unknown
}):
  | { kind: 'code'; code: string; method: CheckinMethod }
  | { kind: 'pass'; userId: string; token: string; method: 'qr' }
  | null {
  if (typeof input.payload === 'string' && input.payload.trim()) {
    const parsed = parseScanPayload(input.payload)
    if (parsed?.kind === 'memberpass') {
      return { kind: 'pass', userId: parsed.userId, token: parsed.token, method: 'qr' }
    }
    if (parsed?.kind === 'member') {
      const code = normalizeMemberCode(parsed.code)
      return code ? { kind: 'code', code, method: 'qr' } : null
    }
    const pass = parseMemberPassPayload(input.payload)
    if (pass) return { kind: 'pass', userId: pass.userId, token: pass.token, method: 'qr' }
    const typed = normalizeMemberCode(input.payload)
    return typed ? { kind: 'code', code: typed, method: 'code' } : null
  }
  if (typeof input.code === 'string' && input.code.trim()) {
    const code = normalizeMemberCode(input.code)
    return code ? { kind: 'code', code, method: 'code' } : null
  }
  return null
}

const isStaff = (actor: Actor) => actor.role === 'admin' || actor.role === 'scanner'

async function loadEvent(eventId: string) {
  const result = await query(
    `SELECT id, title, cancelled_at, event_date, ends_at, season_id, points_kind, is_community_run
     FROM events WHERE id = $1`,
    [eventId]
  )
  const event = result.rows[0]
  if (!event) throw new AttendanceError('Event not found', 404)
  if (event.cancelled_at) throw new AttendanceError('This event was cancelled')
  return event as {
    id: string
    title: string
    cancelled_at: Date | null
    event_date: Date
    ends_at: Date | null
    season_id: string | null
    points_kind: PointsKind
    is_community_run: boolean
  }
}

async function existingCheckin(eventId: string, userId: string): Promise<string | null> {
  const result = await query('SELECT scanned_at FROM event_checkins WHERE event_id = $1 AND user_id = $2', [
    eventId,
    userId,
  ])
  return result.rows[0]?.scanned_at ?? null
}

async function resolveMember(
  actor: Actor,
  eventId: string,
  input: NonNullable<ReturnType<typeof codeFromInput>>
): Promise<ResolvedMember> {
  await loadEvent(eventId)
  let member: MemberByCode | null = null
  if (input.kind === 'pass') {
    member = await findMemberByPassToken(input.userId, input.token)
  } else {
    member = await findMemberByCode(input.code)
  }
  if (!member) return { status: 'not_found', member: null }
  if (!isStaff(actor) && !(await canActOnEvent(poolDb, actor, eventId))) {
    return { status: 'wrong_zone', member }
  }
  return { status: 'valid', member }
}

function withinScanWindow(
  event: { event_date: Date; ends_at: Date | null },
  graceHours: number,
  now = new Date()
): boolean {
  const start = new Date(event.event_date).getTime()
  const endBase = event.ends_at ? new Date(event.ends_at).getTime() : start
  const end = endBase + graceHours * 60 * 60 * 1000
  const t = now.getTime()
  // Allow scanning from 1 hour before start through grace after end.
  return t >= start - 60 * 60 * 1000 && t <= end
}

export async function lookupMemberCheckin(
  actor: Actor,
  eventId: string,
  input: NonNullable<ReturnType<typeof codeFromInput>>
): Promise<MemberCheckinResult> {
  const found = await resolveMember(actor, eventId, input)
  if (found.status !== 'valid') return { ...found, checkedInAt: null }
  const checkedInAt = await existingCheckin(eventId, found.member.id)
  return { status: checkedInAt ? 'already_checked_in' : 'valid', member: found.member, checkedInAt }
}

export async function admitMemberCheckin(
  actor: Actor,
  eventId: string,
  input: NonNullable<ReturnType<typeof codeFromInput>>
): Promise<MemberCheckinResult> {
  const found = await resolveMember(actor, eventId, input)
  if (found.status !== 'valid') return { ...found, checkedInAt: null }
  const member = found.member
  const method = input.method

  if (actor.id === member.id) {
    return { status: 'self_scan', member, checkedInAt: null }
  }

  const event = await loadEvent(eventId)
  const settings = await getPointsSettings()

  if (!withinScanWindow(event, settings.scanGraceHours)) {
    return { status: 'outside_window', member, checkedInAt: null }
  }

  const eventAt = new Date(event.event_date)
  if (!(await isPaidActiveOn(member.id, eventAt))) {
    return { status: 'not_eligible', member, checkedInAt: null }
  }

  const season = event.season_id
    ? { id: event.season_id }
    : await getCurrentSeason()
  if (season && (await isSeasonFrozen(season.id))) {
    return { status: 'season_frozen', member, checkedInAt: null }
  }

  const client = await getClient()
  try {
    await client.query('BEGIN')

    const inserted = await client.query(
      `INSERT INTO event_checkins (event_id, user_id, scanned_by, method)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (event_id, user_id) DO NOTHING
       RETURNING id, scanned_at`,
      [eventId, member.id, actor.id, method]
    )

    const ticket = await client.query(
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

    if (!inserted.rows[0]) {
      await client.query('COMMIT')
      return {
        status: 'already_checked_in',
        member,
        checkedInAt: await existingCheckin(eventId, member.id),
        ticketCheckedIn,
      }
    }

    let pointsAwarded = 0
    const seasonId = season?.id ?? event.season_id
    const captain = await isCaptainUser(member.id, client)
    if (seasonId && !captain) {
      const kind = event.points_kind
      const pts = pointsForKind(settings, kind)
      if (pts > 0) {
        const row = await appendSeasonPoints(
          {
            seasonId,
            userId: member.id,
            points: pts,
            kind: 'scan',
            eventId,
            checkinId: inserted.rows[0].id,
            createdBy: actor.id,
          },
          client
        )
        if (row) pointsAwarded += pts
      }

      const dow = new Date(event.event_date).toLocaleDateString('en-US', {
        timeZone: 'Africa/Nairobi',
        weekday: 'short',
      })
      if (dow === 'Sat') {
        pointsAwarded += await maybeAwardStreakBonus({
          seasonId,
          userId: member.id,
          eventId,
          eventDate: eventAt,
          createdBy: actor.id,
          db: client,
        })
      }
    }

    await client.query('COMMIT')
    if (pointsAwarded > 0) {
      import('./pointsAlerts.js')
        .then(({ notifyRankAfterScan }) => notifyRankAfterScan(member.id, event.title))
        .catch((err: Error) => console.error('Post-scan rank alert failed:', err?.message || err))
    }
    return {
      status: 'valid',
      member,
      checkedInAt: inserted.rows[0].scanned_at,
      ticketCheckedIn,
      pointsAwarded,
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Members already scanned into an event, newest first. Staff see everyone; a captain sees only
 * members of their zone (or who chose them) and anyone they scanned themselves.
 */
export async function listScannedMembers(actor: Actor, eventId: string) {
  await loadEvent(eventId)
  const staff = isStaff(actor)
  if (!staff && !(await canActOnEvent(poolDb, actor, eventId))) {
    throw new AttendanceError('This event is not in your zone', 403)
  }
  const captainFilter = staff
    ? ''
    : `AND (
         ec.scanned_by = $2
         OR u.captain_id = $2
         OR COALESCE(u.referred_by_region_id, oc.region_id) = (SELECT region_id FROM captains WHERE user_id = $2)
       )`
  const result = await query(
    `SELECT u.id, u.name, ec.scanned_at,
            (SELECT COUNT(DISTINCT e.event_date::date)::int
             FROM events e
             WHERE e.cancelled_at IS NULL
               AND EXTRACT(DOW FROM e.event_date) = 6
               AND e.event_date <= (NOW() AT TIME ZONE 'Africa/Nairobi')
               AND (
                 EXISTS (SELECT 1 FROM event_checkins x WHERE x.event_id = e.id AND x.user_id = u.id)
                 OR EXISTS (SELECT 1 FROM tickets t
                            WHERE t.event_id = e.id AND t.user_id = u.id AND t.checked_in_at IS NOT NULL)
               )) AS saturdays_attended
     FROM event_checkins ec
     JOIN users u ON u.id = ec.user_id
     LEFT JOIN captains oc ON oc.user_id = u.captain_id
     WHERE ec.event_id = $1
       ${captainFilter}
     ORDER BY ec.scanned_at DESC
     LIMIT 500`,
    staff ? [eventId] : [eventId, actor.id]
  )
  return result.rows
}

/** Recent and upcoming events this person can scan members into. */
export async function listCheckinEvents(actor: Actor) {
  const zoneFilter = isStaff(actor)
    ? ''
    : `AND EXISTS (SELECT 1 FROM captains c JOIN event_zones ez ON ez.zone_id = c.region_id
                   WHERE c.user_id = $1 AND c.status = 'active' AND ez.event_id = e.id)`
  const result = await query(
    `SELECT e.id, e.title, e.event_date, e.location, e.is_community_run, e.points_kind, e.ends_at,
            (SELECT COUNT(*)::int FROM event_checkins ec WHERE ec.event_id = e.id) AS checked_in,
            (SELECT eh.count FROM event_headcounts eh WHERE eh.event_id = e.id) AS headcount
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

export async function recordFinishTime(
  actor: Actor,
  eventId: string,
  memberUserId: string,
  seconds: number
) {
  if (!Number.isInteger(seconds) || seconds <= 0 || seconds > 24 * 60 * 60) {
    throw new AttendanceError('Finish time must be a positive number of seconds')
  }
  const event = await loadEvent(eventId)
  if (event.points_kind !== 'common_run') {
    throw new AttendanceError('Finish times are only for common runs')
  }
  if (!isStaff(actor) && !(await canActOnEvent(poolDb, actor, eventId))) {
    throw new AttendanceError('This event is not in your zone', 403)
  }
  const result = await query(
    `INSERT INTO finish_times (event_id, user_id, seconds, recorded_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (event_id, user_id) DO UPDATE
       SET seconds = EXCLUDED.seconds, recorded_by = EXCLUDED.recorded_by
     RETURNING id, seconds`,
    [eventId, memberUserId, seconds, actor.id]
  )
  return result.rows[0]
}

export async function setEventHeadcount(actor: Actor, eventId: string, count: number) {
  if (!Number.isInteger(count) || count < 0 || count > 10_000) {
    throw new AttendanceError('Headcount must be a whole number from 0 to 10000')
  }
  await loadEvent(eventId)
  if (!isStaff(actor) && !(await canActOnEvent(poolDb, actor, eventId))) {
    throw new AttendanceError('This event is not in your zone', 403)
  }
  await query(
    `INSERT INTO event_headcounts (event_id, count, entered_by, entered_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (event_id) DO UPDATE
       SET count = EXCLUDED.count, entered_by = EXCLUDED.entered_by, entered_at = NOW()`,
    [eventId, count, actor.id]
  )
  const scanned = await query(
    `SELECT COUNT(*)::int AS n FROM event_checkins WHERE event_id = $1`,
    [eventId]
  )
  const scannedN = Number(scanned.rows[0]?.n ?? 0)
  if (scannedN > count) {
    await query(
      `INSERT INTO points_flags (type, event_id, captain_id, detail)
       VALUES ('scan_over_headcount', $1, $2, $3)`,
      [
        eventId,
        actor.role === 'captain' ? actor.id : null,
        `Scans ${scannedN} exceed headcount ${count}`,
      ]
    )
  } else if (count - scannedN > 0) {
    await query(
      `INSERT INTO points_flags (type, event_id, captain_id, detail)
       VALUES ('headcount_gap', $1, $2, $3)`,
      [
        eventId,
        actor.role === 'captain' ? actor.id : null,
        `Headcount ${count} vs scans ${scannedN} (gap ${count - scannedN})`,
      ]
    )
  }
  return { eventId, count, scanned: scannedN }
}
