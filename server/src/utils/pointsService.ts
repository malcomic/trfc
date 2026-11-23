import { query } from '../config/db.js'
import {
  getCurrentSeason,
  isCaptainUser,
  isInTheRace,
  memberZoneId,
} from './pointsEligibility.js'
import { seasonBalance } from './pointsLedger.js'
import { getPointsSettings, pointsForKind } from './pointsSettings.js'
import { getStreakCard, nairobiDateString } from './pointsStreak.js'
import { ensureMemberReferralCode, rewardBalance } from './rewardLedger.js'

function displayName(full: string | null): string {
  if (!full?.trim()) return 'Member'
  const parts = full.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

async function saturdaysAttended(userId: string, seasonId: string): Promise<number> {
  const result = await query(
    `SELECT COUNT(DISTINCT (e.event_date AT TIME ZONE 'Africa/Nairobi')::date)::int AS n
     FROM event_checkins ec
     JOIN events e ON e.id = ec.event_id
     WHERE ec.user_id = $1 AND e.season_id = $2 AND e.cancelled_at IS NULL
       AND EXTRACT(DOW FROM e.event_date AT TIME ZONE 'Africa/Nairobi') = 6`,
    [userId, seasonId]
  )
  return Number(result.rows[0]?.n ?? 0)
}

async function officialSaturdaysSinceJoin(userId: string, seasonId: string): Promise<{ attended: number; official: number }> {
  const paid = await query(`SELECT fully_paid_at FROM users WHERE id = $1`, [userId])
  const fullyPaidAt = paid.rows[0]?.fully_paid_at
  if (!fullyPaidAt) return { attended: 0, official: 0 }

  const firstSat = await query(
    `SELECT MIN((e.event_date AT TIME ZONE 'Africa/Nairobi')::date) AS d
     FROM events e
     WHERE e.season_id = $1 AND e.cancelled_at IS NULL
       AND EXTRACT(DOW FROM e.event_date AT TIME ZONE 'Africa/Nairobi') = 6
       AND (e.event_date AT TIME ZONE 'Africa/Nairobi')::date
           > (($2::timestamptz AT TIME ZONE 'Africa/Nairobi')::date)`,
    [seasonId, fullyPaidAt]
  )
  const from = firstSat.rows[0]?.d
  if (!from) return { attended: 0, official: 0 }

  const official = await query(
    `SELECT COUNT(DISTINCT (e.event_date AT TIME ZONE 'Africa/Nairobi')::date)::int AS n
     FROM events e
     WHERE e.season_id = $1 AND e.cancelled_at IS NULL
       AND EXTRACT(DOW FROM e.event_date AT TIME ZONE 'Africa/Nairobi') = 6
       AND (e.event_date AT TIME ZONE 'Africa/Nairobi')::date >= $2::date
       AND (e.event_date AT TIME ZONE 'Africa/Nairobi')::date <= (NOW() AT TIME ZONE 'Africa/Nairobi')::date
       AND e.points_kind IN ('zone_run', 'common_run', 'hike', 'fit_fest')`,
    [seasonId, from]
  )
  const attended = await query(
    `SELECT COUNT(DISTINCT (e.event_date AT TIME ZONE 'Africa/Nairobi')::date)::int AS n
     FROM event_checkins ec
     JOIN events e ON e.id = ec.event_id
     WHERE ec.user_id = $1 AND e.season_id = $2 AND e.cancelled_at IS NULL
       AND EXTRACT(DOW FROM e.event_date AT TIME ZONE 'Africa/Nairobi') = 6
       AND (e.event_date AT TIME ZONE 'Africa/Nairobi')::date >= $3::date`,
    [userId, seasonId, from]
  )
  return { attended: Number(attended.rows[0]?.n ?? 0), official: Number(official.rows[0]?.n ?? 0) }
}

/** Ranked list of non-captain members with season balances. */
export async function rankedMembers(seasonId: string, opts?: { inRaceOnly?: boolean; zoneId?: string | null }) {
  const settings = await getPointsSettings()
  const result = await query(
    `SELECT u.id, u.name, u.avatar_url, u.fully_paid_at,
            COALESCE(u.referred_by_region_id, c.region_id) AS zone_id,
            r.name AS zone_name,
            COALESCE(SUM(pl.points), 0)::int AS points,
            (SELECT COUNT(DISTINCT (e.event_date AT TIME ZONE 'Africa/Nairobi')::date)::int
             FROM event_checkins ec
             JOIN events e ON e.id = ec.event_id
             WHERE ec.user_id = u.id AND e.season_id = $1 AND e.cancelled_at IS NULL
               AND EXTRACT(DOW FROM e.event_date AT TIME ZONE 'Africa/Nairobi') = 6
            ) AS saturdays
     FROM users u
     LEFT JOIN captains cap ON cap.user_id = u.id AND cap.status = 'active'
     LEFT JOIN captains c ON c.user_id = u.captain_id
     LEFT JOIN regions r ON r.id = COALESCE(u.referred_by_region_id, c.region_id)
     LEFT JOIN points_ledger pl ON pl.user_id = u.id AND pl.season_id = $1
     WHERE cap.user_id IS NULL
       AND u.member_until > NOW()
       AND (u.points_disqualified_season_id IS NULL OR u.points_disqualified_season_id <> $1)
       AND ($2::boolean = false OR (u.fully_paid_at IS NOT NULL AND u.fully_paid_at <= $3))
       AND ($4::uuid IS NULL OR COALESCE(u.referred_by_region_id, c.region_id) = $4)
     GROUP BY u.id, u.name, u.avatar_url, u.fully_paid_at, zone_id, r.name
     ORDER BY points DESC, saturdays DESC, u.fully_paid_at ASC NULLS LAST, u.id ASC`,
    [seasonId, !!opts?.inRaceOnly, settings.raceCutoffAt, opts?.zoneId ?? null]
  )
  return result.rows.map((row, index) => ({
    rank: index + 1,
    userId: row.id as string,
    name: displayName(row.name),
    photoUrl: row.avatar_url as string | null,
    zoneId: row.zone_id as string | null,
    zoneName: row.zone_name as string | null,
    points: Number(row.points),
    saturdays: Number(row.saturdays),
    fullyPaidAt: row.fully_paid_at as string | null,
  }))
}

export async function getMyPointsSummary(userId: string) {
  const season = await getCurrentSeason()
  if (!season) return null
  const settings = await getPointsSettings()
  const captain = await isCaptainUser(userId)
  const total = await seasonBalance(userId, season.id)
  const streak = await getStreakCard(userId, season.id)
  const attendance = await officialSaturdaysSinceJoin(userId, season.id)
  const zoneId = await memberZoneId(userId)
  const overall = captain ? [] : await rankedMembers(season.id, { inRaceOnly: true })
  const zoneRanked = captain || !zoneId ? [] : await rankedMembers(season.id, { inRaceOnly: true, zoneId })
  const myOverall = overall.find((r) => r.userId === userId)
  const myZone = zoneRanked.find((r) => r.userId === userId)
  const aboveOverall = myOverall ? overall.find((r) => r.rank === myOverall.rank - 1) : null
  const inRace = await isInTheRace(userId)
  const referralCode = await ensureMemberReferralCode(userId)
  const rewards = await rewardBalance(userId)
  const rewardMeta = await query(
    `SELECT
       (SELECT MIN(expires_at) FROM reward_ledger
        WHERE user_id = $1 AND points > 0 AND expires_at IS NOT NULL AND expires_at > NOW()
          AND kind IN ('earn_spend', 'referral', 'adjustment', 'mom_prize')
          AND NOT EXISTS (
            SELECT 1 FROM reward_ledger x
            WHERE x.kind = 'expire' AND x.source_ref = 'expire:' || reward_ledger.id::text
          )
       ) AS nearest_expiry,
       (SELECT COUNT(*)::int FROM member_referrals WHERE referrer_id = $1 AND status = 'cleared') AS referral_count`,
    [userId]
  )

  const nextEvent = await query(
    `SELECT id, title, event_date, points_kind
     FROM events
     WHERE cancelled_at IS NULL
       AND event_date >= NOW()
       AND points_kind <> 'none'
     ORDER BY event_date
     LIMIT 1`
  )
  const next = nextEvent.rows[0]

  return {
    season: {
      id: season.id,
      name: season.name,
      startsAt: season.starts_at,
      endsAt: season.ends_at,
      status: season.status,
    },
    isCaptain: captain,
    inRace,
    total,
    overallRank: myOverall?.rank ?? null,
    zoneRank: myZone?.rank ?? null,
    gapToNext: aboveOverall ? aboveOverall.points - total : null,
    streak: {
      progress: streak.progress,
      towardNext: streak.towardNext,
      freeMissAvailable: streak.freeMissAvailable,
      streakLength: streak.streakLength,
    },
    attendance: {
      attended: attendance.attended,
      official: attendance.official,
      share: attendance.official > 0 ? Math.round((attendance.attended / attendance.official) * 1000) / 10 : 0,
    },
    countdowns: {
      raceCutoffAt: settings.raceCutoffAt,
      anniversaryAt: season.ends_at,
      daysToCutoff: Math.max(
        0,
        Math.ceil((settings.raceCutoffAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      ),
      daysToAnniversary: Math.max(
        0,
        Math.ceil((new Date(season.ends_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      ),
    },
    nextSaturday: next
      ? {
          id: next.id,
          title: next.title,
          eventDate: next.event_date,
          points: pointsForKind(settings, next.points_kind),
        }
      : null,
    rewards: {
      balance: rewards,
      referralCode,
      nearestExpiryAt: rewardMeta.rows[0]?.nearest_expiry ?? null,
      referralCount: Number(rewardMeta.rows[0]?.referral_count ?? 0),
    },
  }
}

export async function getMyLedger(userId: string, limit = 50, offset = 0) {
  const season = await getCurrentSeason()
  if (!season) return { rows: [], total: 0 }
  const count = await query(
    `SELECT COUNT(*)::int AS n FROM points_ledger WHERE user_id = $1 AND season_id = $2`,
    [userId, season.id]
  )
  const rows = await query(
    `SELECT pl.id, pl.points, pl.kind, pl.reason, pl.created_at,
            e.title AS event_title, e.event_date,
            s.name AS scanned_by_name
     FROM points_ledger pl
     LEFT JOIN events e ON e.id = pl.event_id
     LEFT JOIN event_checkins ec ON ec.id = pl.checkin_id
     LEFT JOIN users s ON s.id = COALESCE(pl.created_by, ec.scanned_by)
     WHERE pl.user_id = $1 AND pl.season_id = $2
     ORDER BY pl.created_at DESC
     LIMIT $3 OFFSET $4`,
    [userId, season.id, limit, offset]
  )
  return {
    total: Number(count.rows[0]?.n ?? 0),
    rows: rows.rows.map((r) => ({
      id: r.id,
      points: r.points,
      kind: r.kind,
      reason: r.reason,
      createdAt: r.created_at,
      eventTitle: r.event_title,
      eventDate: r.event_date,
      scannedBy: r.scanned_by_name ? displayName(r.scanned_by_name) : null,
    })),
  }
}

export async function getLeaderboards() {
  const season = await getCurrentSeason()
  if (!season) return null
  const overall = (await rankedMembers(season.id, { inRaceOnly: true })).slice(0, 10)

  const now = new Date()
  const nairobi = nairobiDateString(now)
  const [y, m] = nairobi.split('-').map(Number)
  const monthRows = await query(
    `SELECT u.id, u.name, u.avatar_url, r.name AS zone_name,
            COALESCE(SUM(pl.points), 0)::int AS points,
            COUNT(DISTINCT CASE WHEN EXTRACT(DOW FROM e.event_date AT TIME ZONE 'Africa/Nairobi') = 6
              THEN (e.event_date AT TIME ZONE 'Africa/Nairobi')::date END)::int AS saturdays
     FROM points_ledger pl
     JOIN users u ON u.id = pl.user_id
     LEFT JOIN captains cap ON cap.user_id = u.id AND cap.status = 'active'
     LEFT JOIN captains c ON c.user_id = u.captain_id
     LEFT JOIN regions r ON r.id = COALESCE(u.referred_by_region_id, c.region_id)
     LEFT JOIN events e ON e.id = pl.event_id
     WHERE pl.season_id = $1
       AND cap.user_id IS NULL
       AND pl.created_at >= make_timestamptz($2, $3, 1, 0, 0, 0, 'Africa/Nairobi')
       AND pl.created_at < make_timestamptz($2, $3, 1, 0, 0, 0, 'Africa/Nairobi') + INTERVAL '1 month'
     GROUP BY u.id, u.name, u.avatar_url, r.name
     ORDER BY points DESC, saturdays DESC
     LIMIT 10`,
    [season.id, y, m]
  )

  const zones = await query(
    `SELECT r.id, r.name,
            COUNT(DISTINCT u.id)::int AS members,
            COALESCE(AVG(sub.points), 0)::float AS avg_points
     FROM regions r
     JOIN (
       SELECT u.id,
              COALESCE(u.referred_by_region_id, c.region_id) AS zone_id,
              COALESCE(SUM(pl.points), 0)::int AS points
       FROM users u
       LEFT JOIN captains cap ON cap.user_id = u.id AND cap.status = 'active'
       LEFT JOIN captains c ON c.user_id = u.captain_id
       LEFT JOIN points_ledger pl ON pl.user_id = u.id AND pl.season_id = $1
       WHERE cap.user_id IS NULL
         AND u.fully_paid_at IS NOT NULL
         AND u.fully_paid_at <= (SELECT race_cutoff_at FROM points_settings WHERE id = 1)
       GROUP BY u.id, zone_id
     ) sub ON sub.zone_id = r.id
     GROUP BY r.id, r.name
     HAVING COUNT(DISTINCT u.id) >= (SELECT zone_of_year_min_members FROM points_settings WHERE id = 1)
     ORDER BY avg_points DESC
     LIMIT 20`,
    [season.id]
  )

  const referrers = await query(
    `SELECT u.id, u.name, u.avatar_url, r.name AS zone_name, COUNT(*)::int AS referrals
     FROM member_referrals mr
     JOIN users u ON u.id = mr.referrer_id
     LEFT JOIN captains c ON c.user_id = u.captain_id
     LEFT JOIN regions r ON r.id = COALESCE(u.referred_by_region_id, c.region_id)
     WHERE mr.status = 'cleared'
     GROUP BY u.id, u.name, u.avatar_url, r.name
     ORDER BY referrals DESC, MIN(mr.cleared_at) ASC
     LIMIT 10`
  )

  return {
    overall,
    month: monthRows.rows.map((row, i) => ({
      rank: i + 1,
      userId: row.id,
      name: displayName(row.name),
      photoUrl: row.avatar_url,
      zoneName: row.zone_name,
      points: Number(row.points),
      saturdays: Number(row.saturdays),
    })),
    zones: zones.rows.map((row, i) => ({
      rank: i + 1,
      zoneId: row.id,
      zoneName: row.name,
      members: Number(row.members),
      avgPoints: Math.round(Number(row.avg_points) * 10) / 10,
    })),
    referrers: referrers.rows.map((row, i) => ({
      rank: i + 1,
      userId: row.id,
      name: displayName(row.name),
      photoUrl: row.avatar_url,
      zoneName: row.zone_name,
      referrals: Number(row.referrals),
    })),
  }
}

export async function reportMissingScan(userId: string, eventId: string, note?: string) {
  const settings = await getPointsSettings()
  const event = await query(
    `SELECT id, event_date, cancelled_at FROM events WHERE id = $1`,
    [eventId]
  )
  const ev = event.rows[0]
  if (!ev || ev.cancelled_at) throw Object.assign(new Error('Event not found'), { status: 404 })
  const ageMs = Date.now() - new Date(ev.event_date).getTime()
  if (ageMs > settings.missingScanReportDays * 24 * 60 * 60 * 1000) {
    throw Object.assign(new Error('The report window for this event has closed'), { status: 400 })
  }
  const existing = await query(
    `SELECT 1 FROM event_checkins WHERE event_id = $1 AND user_id = $2`,
    [eventId, userId]
  )
  if (existing.rows[0]) throw Object.assign(new Error('You were already scanned for this event'), { status: 409 })

  const inserted = await query(
    `INSERT INTO missing_scan_reports (user_id, event_id, note)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, event_id) DO NOTHING
     RETURNING id, status, created_at`,
    [userId, eventId, note ?? null]
  )
  if (!inserted.rows[0]) {
    throw Object.assign(new Error('You already reported this event'), { status: 409 })
  }
  return inserted.rows[0]
}

export { saturdaysAttended }
