import { query } from '../config/db.js'

const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const SATURDAY = 6

export const COMMUNITY_RUN_TITLE = 'Saturday Community Run'
const COMMUNITY_RUN_DESCRIPTION =
  'The free weekly community run. Run, jog or walk with us. Show your TRFC pass to your captain so the Saturday counts.'

/** The next `count` Saturdays in Nairobi as YYYY-MM-DD, starting today if today is a Saturday. */
export function upcomingSaturdays(now: Date, count = 2): string[] {
  const nairobi = new Date(now.getTime() + NAIROBI_OFFSET_MS)
  const offset = (SATURDAY - nairobi.getUTCDay() + 7) % 7
  const first = Date.UTC(nairobi.getUTCFullYear(), nairobi.getUTCMonth(), nairobi.getUTCDate()) + offset * DAY_MS
  return Array.from({ length: count }, (_, i) => new Date(first + i * 7 * DAY_MS).toISOString().slice(0, 10))
}

/**
 * Makes sure the free Saturday run exists for the next two Saturdays, linked to every active zone so
 * every captain can scan members in. A run an admin cancelled or moved to another day is not re-created.
 * event_date holds Kenya wall-clock time, so the day is compared with event_date::date directly.
 */
export async function ensureUpcomingCommunityRuns(now = new Date()): Promise<number> {
  const settings = await query(
    `SELECT to_char(community_run_time, 'HH24:MI') AS run_time, community_run_location AS location
     FROM ticket_rules_settings WHERE id = 1`
  )
  const runTime: string = settings.rows[0]?.run_time ?? '06:30'
  const location: string = settings.rows[0]?.location ?? 'TBA'

  let created = 0
  for (const day of upcomingSaturdays(now)) {
    const existing = await query(
      `SELECT 1 FROM events
       WHERE is_community_run AND event_date >= $1::date AND event_date < $1::date + 1
       LIMIT 1`,
      [day]
    )
    if (existing.rows.length > 0) continue

    const inserted = await query(
      `INSERT INTO events (title, description, location, event_date, price, capacity, is_community_run)
       VALUES ($1, $2, $3, $4::date + $5::time, 0, NULL, true)
       RETURNING id`,
      [COMMUNITY_RUN_TITLE, COMMUNITY_RUN_DESCRIPTION, location, day, runTime]
    )
    const eventId = inserted.rows[0]?.id
    if (!eventId) continue
    await query(
      `INSERT INTO event_zones (event_id, zone_id)
       SELECT $1, r.id FROM regions r WHERE r.is_active = true
       ON CONFLICT DO NOTHING`,
      [eventId]
    )
    created++
  }
  return created
}
