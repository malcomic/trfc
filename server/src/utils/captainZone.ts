import { query } from '../config/db.js'
import { FREE_PROGRAM_ID } from '../config/onboarding.js'

/** Members who signed up this many days ago or less are New, whatever their attendance. */
export const NEW_MEMBER_DAYS = 14
/** Members who missed this many Saturdays in a row (or more) are Missing. */
export const MISSING_AFTER_SATURDAYS = 3
/** A captain reopening the dashboard within this many minutes is not logged again. */
export const OPEN_LOG_THROTTLE_MINUTES = 10

export const MEMBER_STATUSES = ['new', 'active', 'missing'] as const
export type MemberStatus = (typeof MEMBER_STATUSES)[number]
export type CaptainAccessAction = 'open' | 'export' | 'copy'

export function isMemberStatus(value: unknown): value is MemberStatus {
  return typeof value === 'string' && (MEMBER_STATUSES as readonly string[]).includes(value)
}

/**
 * CTEs for the zone of the captain whose user id is $1. Every captain count and list is built on
 * these, so the overview always matches the members list.
 * - zone_members: members whose zone is the captain's zone, or who chose this captain.
 * - saturday_events / saturdays: Saturdays (Nairobi dates) with a non-cancelled event that has started.
 * - member_activity: per zone member, Saturdays attended, last seen, Saturdays missed since and status.
 * `events.event_date` is a Nairobi local timestamp, so its date and weekday need no conversion.
 */
export const ZONE_ACTIVITY_CTES = `
  me AS (SELECT user_id, region_id FROM captains WHERE user_id = $1),
  zone_members AS (
    SELECT u.id, u.name, u.created_at AS signed_up_at, u.captain_id, u.referred_by_region_id,
           z.name AS zone,
           COALESCE(u.captain_chosen_at, u.referred_at, u.created_at) AS joined_at,
           CASE WHEN u.referred_by_region_id = me.region_id THEN 'zone_link' ELSE 'chosen' END AS joined_via,
           (u.captain_id IS NOT DISTINCT FROM me.user_id) AS is_my_member
    FROM me
    JOIN users u ON u.id <> me.user_id
    LEFT JOIN captains oc ON oc.user_id = u.captain_id
    LEFT JOIN regions z ON z.id = COALESCE(u.referred_by_region_id, oc.region_id)
    WHERE (u.captain_id = me.user_id OR COALESCE(u.referred_by_region_id, oc.region_id) = me.region_id)
      AND u.deletion_requested_at IS NULL
      AND u.role = 'member'
  ),
  saturday_events AS (
    SELECT e.id, e.event_date::date AS day
    FROM events e
    WHERE e.cancelled_at IS NULL
      AND EXTRACT(DOW FROM e.event_date) = 6
      AND e.event_date <= (NOW() AT TIME ZONE 'Africa/Nairobi')
  ),
  saturdays AS (SELECT DISTINCT day FROM saturday_events),
  attendance AS (
    SELECT DISTINCT a.user_id, se.day
    FROM (
      SELECT ec.event_id, ec.user_id FROM event_checkins ec
      UNION
      SELECT t.event_id, t.user_id FROM tickets t WHERE t.checked_in_at IS NOT NULL AND t.user_id IS NOT NULL
    ) a
    JOIN saturday_events se ON se.id = a.event_id
    JOIN zone_members zm ON zm.id = a.user_id
  ),
  attended AS (
    SELECT user_id, COUNT(*)::int AS saturdays_attended, MAX(day) AS last_seen
    FROM attendance GROUP BY user_id
  ),
  member_activity AS (
    SELECT zm.*,
           COALESCE(att.saturdays_attended, 0) AS saturdays_attended,
           att.last_seen,
           (SELECT COUNT(*)::int FROM saturdays s
            WHERE s.day > GREATEST(att.last_seen, zm.signed_up_at::date)) AS missed_saturdays
    FROM zone_members zm
    LEFT JOIN attended att ON att.user_id = zm.id
  ),
  member_status AS (
    SELECT ma.*,
           CASE
             WHEN ma.signed_up_at >= NOW() - make_interval(days => ${NEW_MEMBER_DAYS}) THEN 'new'
             WHEN ma.missed_saturdays >= ${MISSING_AFTER_SATURDAYS} THEN 'missing'
             ELSE 'active'
           END AS status
    FROM member_activity ma
  )`

export interface TeamFilters {
  q?: string
  status?: MemberStatus
}

/** Adds the name search and status filter to `params`, returning the WHERE clause for `member_status m`. */
function teamWhere(filters: TeamFilters, params: unknown[]): string {
  const conditions: string[] = []
  const q = filters.q?.trim().slice(0, 100)
  if (q) {
    params.push(`%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`)
    conditions.push(`m.name ILIKE $${params.length}`)
  }
  if (filters.status) {
    params.push(filters.status)
    conditions.push(`m.status = $${params.length}`)
  }
  return conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
}

/**
 * The captain's zone members with attendance and status. Programs are Couch to 5K only; the WhatsApp
 * number only while the member shares it with this captain, checked on every request.
 */
export async function loadZoneTeam(captainId: string, filters: TeamFilters = {}) {
  const params: unknown[] = [captainId, FREE_PROGRAM_ID]
  const where = teamWhere(filters, params)
  const result = await query(
    `WITH ${ZONE_ACTIVITY_CTES}
     SELECT m.id, m.name, m.zone, m.joined_at, m.joined_via, m.is_my_member, m.signed_up_at,
            m.saturdays_attended, to_char(m.last_seen, 'YYYY-MM-DD') AS last_seen, m.missed_saturdays, m.status,
            COALESCE((
              SELECT json_agg(json_build_object(
                'program', pe.program,
                'status', pe.status,
                'sessions_done', (SELECT COUNT(*)::int FROM program_session_progress p
                                  WHERE p.user_id = m.id AND p.program = pe.program AND p.completed_at IS NOT NULL),
                'weeks_checked_in', (SELECT COUNT(*)::int FROM program_checkins pc
                                     WHERE pc.user_id = m.id AND pc.program = pe.program)
              ) ORDER BY pe.enrolled_at)
              FROM program_enrollments pe WHERE pe.user_id = m.id AND pe.program = $2
            ), '[]'::json) AS programs,
            CASE WHEN s.enabled THEN COALESCE(u.whatsapp, u.phone_normalized) END AS whatsapp
     FROM member_status m
     JOIN users u ON u.id = m.id
     LEFT JOIN captain_whatsapp_shares s ON s.member_id = m.id AND s.captain_id = $1
     ${where}
     ORDER BY m.is_my_member DESC, m.joined_at DESC NULLS LAST
     LIMIT 500`,
    params
  )
  return result.rows
}

/** The member list a captain may copy or export: no phone or WhatsApp number, ever. */
export async function loadZoneTeamExport(captainId: string, filters: TeamFilters = {}) {
  const params: unknown[] = [captainId]
  const where = teamWhere(filters, params)
  const result = await query(
    `WITH ${ZONE_ACTIVITY_CTES}
     SELECT m.name, m.status, m.missed_saturdays, m.saturdays_attended,
            to_char(m.last_seen, 'YYYY-MM-DD') AS last_seen, to_char(m.signed_up_at, 'YYYY-MM-DD') AS signed_up_at
     FROM member_status m
     ${where}
     ORDER BY m.name ASC
     LIMIT 2000`,
    params
  )
  return result.rows
}

/** Zone overview counts, from the same definitions as the members list. */
export async function loadZoneOverview(captainId: string) {
  const counts = await query(
    `WITH ${ZONE_ACTIVITY_CTES}
     SELECT COUNT(*)::int AS total_members,
            COUNT(*) FILTER (WHERE m.signed_up_at >= NOW() - INTERVAL '7 days')::int AS joined_this_week,
            COUNT(*) FILTER (WHERE m.referred_by_region_id = (SELECT region_id FROM me))::int AS joined_via_link,
            COUNT(*) FILTER (WHERE m.captain_id IS NULL)::int AS no_captain_count,
            COUNT(*) FILTER (WHERE m.status = 'new')::int AS new_count,
            COUNT(*) FILTER (WHERE m.status = 'active')::int AS active_count,
            COUNT(*) FILTER (WHERE m.status = 'missing')::int AS missing_count
     FROM member_status m`,
    [captainId]
  )
  const saturdays = await query(
    `WITH ${ZONE_ACTIVITY_CTES},
     last_four AS (SELECT day FROM saturdays ORDER BY day DESC LIMIT 4)
     SELECT to_char(lf.day, 'YYYY-MM-DD') AS date,
            (SELECT COUNT(DISTINCT a.user_id)::int FROM attendance a WHERE a.day = lf.day) AS attended
     FROM last_four lf
     ORDER BY lf.day ASC`,
    [captainId]
  )
  return { ...counts.rows[0], last_four_saturdays: saturdays.rows }
}

/**
 * Records a dashboard open, export or copy for the admin access log. Opens are logged at most once
 * per captain every few minutes so reloads don't flood the log. Never throws.
 */
export async function logCaptainAccess(userId: string, action: CaptainAccessAction, rowCount: number | null = null) {
  try {
    if (action === 'open') {
      await query(
        `INSERT INTO captain_access_log (user_id, region_id, action, row_count)
         SELECT $1, (SELECT region_id FROM captains WHERE user_id = $1), 'open', NULL
         WHERE NOT EXISTS (
           SELECT 1 FROM captain_access_log
           WHERE user_id = $1 AND action = 'open' AND created_at > NOW() - make_interval(mins => $2)
         )`,
        [userId, OPEN_LOG_THROTTLE_MINUTES]
      )
      return
    }
    await query(
      `INSERT INTO captain_access_log (user_id, region_id, action, row_count)
       VALUES ($1, (SELECT region_id FROM captains WHERE user_id = $1), $2, $3)`,
      [userId, action, rowCount]
    )
  } catch (error) {
    console.error(`Failed to log captain ${action} for ${userId}:`, error)
  }
}
