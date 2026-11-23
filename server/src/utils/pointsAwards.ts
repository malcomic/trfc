import { query } from '../config/db.js'
import { getCurrentSeason } from './pointsEligibility.js'
import { getPointsSettings } from './pointsSettings.js'
import { rankedMembers, saturdaysAttended } from './pointsService.js'
import { appendRewardPoints } from './rewardLedger.js'

export async function seasonChampion(seasonId: string) {
  const ranked = await rankedMembers(seasonId, { inRaceOnly: true })
  return ranked[0] ?? null
}

export async function mombasaDrawList(seasonId: string) {
  const settings = await getPointsSettings()
  const champion = await seasonChampion(seasonId)
  const ranked = await rankedMembers(seasonId, { inRaceOnly: true })
  const list = []
  for (const row of ranked) {
    if (champion && row.userId === champion.userId) continue
    const sats = await saturdaysAttended(row.userId, seasonId)
    if (sats >= settings.mombasaMinSaturdays) list.push({ ...row, saturdays: sats })
  }
  return list
}

export async function mostConsistent(seasonId: string) {
  const settings = await getPointsSettings()
  const result = await query(
    `SELECT u.id, u.name, u.fully_paid_at,
            COALESCE(u.referred_by_region_id, c.region_id) AS zone_id
     FROM users u
     LEFT JOIN captains cap ON cap.user_id = u.id AND cap.status = 'active'
     LEFT JOIN captains c ON c.user_id = u.captain_id
     WHERE cap.user_id IS NULL AND u.member_until > NOW() AND u.fully_paid_at IS NOT NULL`
  )
  const scored: { userId: string; name: string; share: number; attended: number; fullyPaidAt: string }[] = []
  for (const row of result.rows) {
    const paidAt = row.fully_paid_at
    const firstSat = await query(
      `SELECT MIN((e.event_date AT TIME ZONE 'Africa/Nairobi')::date) AS d
       FROM events e
       WHERE e.season_id = $1 AND e.cancelled_at IS NULL
         AND EXTRACT(DOW FROM e.event_date AT TIME ZONE 'Africa/Nairobi') = 6
         AND (e.event_date AT TIME ZONE 'Africa/Nairobi')::date
             > (($2::timestamptz AT TIME ZONE 'Africa/Nairobi')::date)`,
      [seasonId, paidAt]
    )
    if (!firstSat.rows[0]?.d) continue
    const official = await query(
      `SELECT COUNT(DISTINCT (e.event_date AT TIME ZONE 'Africa/Nairobi')::date)::int AS n
       FROM events e
       WHERE e.season_id = $1 AND e.cancelled_at IS NULL
         AND EXTRACT(DOW FROM e.event_date AT TIME ZONE 'Africa/Nairobi') = 6
         AND (e.event_date AT TIME ZONE 'Africa/Nairobi')::date >= $2::date
         AND e.points_kind IN ('zone_run', 'common_run', 'hike', 'fit_fest')`,
      [seasonId, firstSat.rows[0].d]
    )
    const attended = await saturdaysAttended(row.id, seasonId)
    const off = Number(official.rows[0]?.n ?? 0)
    if (attended < settings.consistentMinSaturdays || off === 0) continue
    scored.push({
      userId: row.id,
      name: row.name,
      share: attended / off,
      attended,
      fullyPaidAt: paidAt,
    })
  }
  scored.sort((a, b) => b.share - a.share || b.attended - a.attended || a.fullyPaidAt.localeCompare(b.fullyPaidAt))
  return scored[0] ?? null
}

export async function mostImproved(seasonId: string) {
  const settings = await getPointsSettings()
  const result = await query(
    `SELECT ft.user_id, u.name,
            array_agg(ft.seconds ORDER BY e.event_date) AS times
     FROM finish_times ft
     JOIN events e ON e.id = ft.event_id
     JOIN users u ON u.id = ft.user_id
     LEFT JOIN captains cap ON cap.user_id = u.id AND cap.status = 'active'
     WHERE e.season_id = $1 AND e.points_kind = 'common_run' AND cap.user_id IS NULL
     GROUP BY ft.user_id, u.name
     HAVING COUNT(*) >= $2`,
    [seasonId, settings.mostImprovedMinFinishes]
  )
  let best: { userId: string; name: string; improvementPct: number } | null = null
  for (const row of result.rows) {
    const times = (row.times as number[]).map(Number)
    if (times.length < 6) continue
    const first3 = (times[0] + times[1] + times[2]) / 3
    const last3 = (times[times.length - 3] + times[times.length - 2] + times[times.length - 1]) / 3
    if (first3 <= 0) continue
    const improvementPct = ((first3 - last3) / first3) * 100
    if (!best || improvementPct > best.improvementPct) {
      best = { userId: row.user_id, name: row.name, improvementPct }
    }
  }
  return best
}

export async function topReferrer() {
  const settings = await getPointsSettings()
  const result = await query(
    `SELECT u.id, u.name, COUNT(*)::int AS referrals, MIN(mr.cleared_at) AS first_at
     FROM member_referrals mr
     JOIN users u ON u.id = mr.referrer_id
     WHERE mr.status = 'cleared' AND mr.cleared_at <= (SELECT ends_at FROM seasons WHERE status IN ('active','frozen') ORDER BY starts_at DESC LIMIT 1)
     GROUP BY u.id, u.name
     HAVING COUNT(*) >= $1
     ORDER BY referrals DESC, first_at ASC
     LIMIT 1`,
    [settings.topReferrerMin]
  )
  return result.rows[0]
    ? { userId: result.rows[0].id, name: result.rows[0].name, referrals: Number(result.rows[0].referrals) }
    : null
}

export async function memberOfTheMonth(year: number, month: number) {
  const season = await getCurrentSeason()
  if (!season) return null
  const settings = await getPointsSettings()
  const result = await query(
    `SELECT u.id, u.name, COALESCE(SUM(pl.points), 0)::int AS points,
            COUNT(DISTINCT CASE WHEN EXTRACT(DOW FROM e.event_date AT TIME ZONE 'Africa/Nairobi') = 6
              THEN (e.event_date AT TIME ZONE 'Africa/Nairobi')::date END)::int AS saturdays
     FROM points_ledger pl
     JOIN users u ON u.id = pl.user_id
     LEFT JOIN captains cap ON cap.user_id = u.id AND cap.status = 'active'
     LEFT JOIN events e ON e.id = pl.event_id
     WHERE pl.season_id = $1 AND cap.user_id IS NULL
       AND pl.created_at >= make_timestamptz($2, $3, 1, 0, 0, 0, 'Africa/Nairobi')
       AND pl.created_at < make_timestamptz($2, $3, 1, 0, 0, 0, 'Africa/Nairobi') + INTERVAL '1 month'
     GROUP BY u.id, u.name
     ORDER BY points DESC, saturdays DESC
     LIMIT 1`,
    [season.id, year, month]
  )
  const winner = result.rows[0]
  if (!winner) return null
  if (settings.momRewardPoints > 0) {
    const expires = new Date()
    expires.setMonth(expires.getMonth() + settings.rewardExpiryMonths)
    await appendRewardPoints({
      userId: winner.id,
      points: settings.momRewardPoints,
      kind: 'mom_prize',
      sourceRef: `mom:${year}-${String(month).padStart(2, '0')}`,
      expiresAt: expires,
      reason: 'Member of the Month',
    })
  }
  return { userId: winner.id, name: winner.name, points: Number(winner.points) }
}

export async function freezeSeason(seasonId: string) {
  await query(
    `UPDATE seasons SET status = 'frozen', frozen_at = NOW()
     WHERE id = $1 AND status = 'active'`,
    [seasonId]
  )
}

export async function lockZonesForSeason(seasonId: string) {
  await query(`UPDATE regions SET locked_at = COALESCE(locked_at, NOW())`)
  await query(
    `INSERT INTO zone_lock_snapshots (season_id, user_id, zone_id, captain_id, locked_at)
     SELECT $1, u.id, COALESCE(u.referred_by_region_id, c.region_id), u.captain_id, NOW()
     FROM users u
     LEFT JOIN captains cap ON cap.user_id = u.id AND cap.status = 'active'
     LEFT JOIN captains c ON c.user_id = u.captain_id
     WHERE cap.user_id IS NULL
       AND u.fully_paid_at IS NOT NULL
       AND u.fully_paid_at <= (SELECT race_cutoff_at FROM points_settings WHERE id = 1)
       AND COALESCE(u.referred_by_region_id, c.region_id) IS NOT NULL
     ON CONFLICT (season_id, user_id) DO NOTHING`,
    [seasonId]
  )
}

export async function openSeason2() {
  const existing = await query(`SELECT id FROM seasons WHERE name = 'Season 2' LIMIT 1`)
  if (existing.rows[0]) return existing.rows[0].id as string
  await query(`UPDATE seasons SET status = 'closed' WHERE status IN ('active', 'frozen')`)
  const inserted = await query(
    `INSERT INTO seasons (name, starts_at, ends_at, status)
     VALUES (
       'Season 2',
       '2027-08-01 00:00:00+03'::timestamptz,
       '2028-07-31 23:59:59+03'::timestamptz,
       'active'
     )
     RETURNING id`
  )
  return inserted.rows[0].id as string
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n * 10) / 10))
}

/** Map scan-rate delta (this − prior) onto 0–100. Flat = 50; ±20pp → 0/100. */
export function attendanceGrowthScore(thisRate: number, priorRate: number): number {
  const delta = thisRate - priorRate
  return clampScore(50 + delta * 250)
}

/** New paid members in month / zone size → 0–100 (10% of zone size = 100). */
export function newMembersScore(newCount: number, zonePaidSize: number): number {
  if (zonePaidSize <= 0) return newCount > 0 ? 100 : 0
  return clampScore((newCount / zonePaidSize) * 1000)
}

export async function computeCaptainScores(seasonId: string, month: string) {
  const settings = await getPointsSettings()
  const [y, m] = month.split('-').map(Number)
  const priorDate = new Date(Date.UTC(y, m - 2, 1))
  const priorMonth = `${priorDate.getUTCFullYear()}-${String(priorDate.getUTCMonth() + 1).padStart(2, '0')}`

  const zones = await query(`SELECT id FROM regions WHERE is_active = true`)
  for (const zone of zones.rows) {
    const paidSize = await query(
      `SELECT COUNT(*)::int AS n FROM users u
       LEFT JOIN captains c ON c.user_id = u.captain_id
       WHERE u.member_until > NOW() AND u.fully_paid_at IS NOT NULL
         AND COALESCE(u.referred_by_region_id, c.region_id) = $1`,
      [zone.id]
    )
    const zonePaid = Number(paidSize.rows[0]?.n ?? 0)

    const rateFor = async (ym: string) => {
      const [yy, mm] = ym.split('-').map(Number)
      const attended = await query(
        `SELECT COUNT(DISTINCT ec.user_id)::float AS n
         FROM event_checkins ec
         JOIN events e ON e.id = ec.event_id
         JOIN users u ON u.id = ec.user_id
         LEFT JOIN captains c ON c.user_id = u.captain_id
         WHERE e.cancelled_at IS NULL
           AND COALESCE(u.referred_by_region_id, c.region_id) = $1
           AND u.fully_paid_at IS NOT NULL
           AND (e.event_date AT TIME ZONE 'Africa/Nairobi') >= make_date($2, $3, 1)
           AND (e.event_date AT TIME ZONE 'Africa/Nairobi') < make_date($2, $3, 1) + INTERVAL '1 month'`,
        [zone.id, yy, mm]
      )
      const n = Number(attended.rows[0]?.n ?? 0)
      return zonePaid > 0 ? n / zonePaid : 0
    }
    const attendance = attendanceGrowthScore(await rateFor(month), await rateFor(priorMonth))

    const newcomers = await query(
      `SELECT COUNT(*)::int AS n FROM users u
       LEFT JOIN captains c ON c.user_id = u.captain_id
       WHERE COALESCE(u.referred_by_region_id, c.region_id) = $1
         AND u.fully_paid_at IS NOT NULL
         AND to_char(u.fully_paid_at AT TIME ZONE 'Africa/Nairobi', 'YYYY-MM') = $2`,
      [zone.id, month]
    )
    const newMembers = newMembersScore(Number(newcomers.rows[0]?.n ?? 0), zonePaid)

    const feedback = await query(
      `SELECT AVG((rating_1 + rating_2) / 2.0) AS avg, COUNT(*)::int AS n
       FROM captain_feedback cf
       JOIN captains c ON c.user_id = cf.captain_id
       WHERE c.region_id = $1 AND cf.month = $2`,
      [zone.id, month]
    )
    const feedbackScore =
      Number(feedback.rows[0]?.n ?? 0) >= 5
        ? (Number(feedback.rows[0]?.avg ?? 0) / 5) * 100
        : 0

    const cleanRows = await query(
      `SELECT e.id,
              eh.count AS headcount,
              (SELECT COUNT(*)::int FROM event_checkins ec WHERE ec.event_id = e.id) AS scanned
       FROM events e
       JOIN event_zones ez ON ez.event_id = e.id AND ez.zone_id = $1
       JOIN event_headcounts eh ON eh.event_id = e.id
       WHERE e.cancelled_at IS NULL
         AND to_char(e.event_date AT TIME ZONE 'Africa/Nairobi', 'YYYY-MM') = $2`,
      [zone.id, month]
    )
    const withHeadcount = cleanRows.rows.length
    const cleanCount = cleanRows.rows.filter((r) => Number(r.scanned) === Number(r.headcount)).length
    const clean = withHeadcount > 0 ? clampScore((cleanCount / withHeadcount) * 100) : 0

    const total =
      (attendance * settings.captainWeightAttendance +
        newMembers * settings.captainWeightNewMembers +
        feedbackScore * settings.captainWeightFeedback +
        clean * settings.captainWeightCleanScans) /
      100
    await query(
      `INSERT INTO captain_scores
         (season_id, zone_id, month, attendance_growth, new_members, feedback, clean_scans, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (season_id, zone_id, month) DO UPDATE SET
         attendance_growth = EXCLUDED.attendance_growth,
         new_members = EXCLUDED.new_members,
         feedback = EXCLUDED.feedback,
         clean_scans = EXCLUDED.clean_scans,
         total = EXCLUDED.total`,
      [seasonId, zone.id, month, attendance, newMembers, feedbackScore, clean, total]
    )
  }
}

/** Average of monthly captain_scores.total for Jan–Jul in the season year. */
export async function captainOfTheYear(seasonId: string) {
  const season = await query(`SELECT starts_at FROM seasons WHERE id = $1`, [seasonId])
  if (!season.rows[0]) return null
  const year = new Date(season.rows[0].starts_at).getFullYear()
  const months = Array.from({ length: 7 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`)
  const result = await query(
    `SELECT cs.zone_id, r.name AS zone_name, AVG(cs.total)::float AS avg
     FROM captain_scores cs
     JOIN regions r ON r.id = cs.zone_id
     WHERE cs.season_id = $1 AND cs.month = ANY($2::text[])
     GROUP BY cs.zone_id, r.name
     HAVING COUNT(*) >= 1
     ORDER BY avg DESC
     LIMIT 1`,
    [seasonId, months]
  )
  const row = result.rows[0]
  if (!row) return null
  return { zoneId: row.zone_id as string, zoneName: row.zone_name as string, avg: Math.round(Number(row.avg) * 10) / 10 }
}
