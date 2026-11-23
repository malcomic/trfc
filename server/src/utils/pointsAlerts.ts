import { query } from '../config/db.js'
import { sendEmail } from './emailService.js'
import {
  buildPointsAdminDigestEmailHTML,
  buildPointsAdminDigestEmailText,
  buildPointsRankEmailHTML,
  buildPointsRankEmailText,
  buildPointsWeeklySummaryEmailHTML,
  buildPointsWeeklySummaryEmailText,
  buildPointsWithin10EmailHTML,
  buildPointsWithin10EmailText,
} from './emailTemplates.js'
import { getCurrentSeason } from './pointsEligibility.js'
import { getPointsSettings } from './pointsSettings.js'
import { getMyPointsSummary, rankedMembers } from './pointsService.js'
import { getStreakCard, nairobiDateString } from './pointsStreak.js'

export type PointsAlertKind = 'rank_after_scan' | 'within_10' | 'weekly_summary' | 'admin_digest'

export async function claimAlert(userId: string, kind: string, periodKey: string): Promise<boolean> {
  const result = await query(
    `INSERT INTO points_alert_claims (user_id, kind, period_key)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING
     RETURNING user_id`,
    [userId, kind, periodKey]
  )
  return result.rows.length > 0
}

async function publishPersonalAnnouncement(userId: string, title: string, body: string) {
  await query(
    `INSERT INTO announcements (title, body, link_url, link_label, kind, audience, send_email, created_by, target_user_id)
     VALUES ($1, $2, '/dashboard/points', 'View points', 'important', 'members', false, NULL, $3)`,
    [title.slice(0, 150), body.slice(0, 5000), userId]
  )
}

export async function notifyPointsAlert(
  userId: string,
  kind: PointsAlertKind,
  payload: Record<string, unknown>
) {
  const user = await query(`SELECT name, email FROM users WHERE id = $1`, [userId])
  const row = user.rows[0]
  if (!row) return

  let subject = 'TRFC points'
  let html = ''
  let text = ''
  let announce: { title: string; body: string } | null = null

  if (kind === 'rank_after_scan') {
    const data = {
      name: row.name as string | null,
      rank: Number(payload.rank),
      points: Number(payload.points),
      eventTitle: (payload.eventTitle as string) || null,
    }
    subject = 'Your TRFC points rank'
    html = buildPointsRankEmailHTML(data)
    text = buildPointsRankEmailText(data)
    announce = {
      title: `You are rank #${data.rank}`,
      body: `You have ${data.points} season points${data.eventTitle ? ` after ${data.eventTitle}` : ''}.`,
    }
  } else if (kind === 'within_10') {
    const data = {
      name: row.name as string | null,
      rank: Number(payload.rank),
      gap: Number(payload.gap),
      pointsAbove: Number(payload.pointsAbove),
    }
    subject = 'You are close on the TRFC board'
    html = buildPointsWithin10EmailHTML(data)
    text = buildPointsWithin10EmailText(data)
    announce = {
      title: `Only ${data.gap} points behind`,
      body: `You are rank #${data.rank}. The runner above you has ${data.pointsAbove} points.`,
    }
  } else if (kind === 'weekly_summary') {
    const data = {
      name: row.name as string | null,
      weekPoints: Number(payload.weekPoints),
      streakProgress: Number(payload.streakProgress),
      streakLength: Number(payload.streakLength),
      total: Number(payload.total),
      rank: payload.rank == null ? null : Number(payload.rank),
    }
    subject = 'Your TRFC week in points'
    html = buildPointsWeeklySummaryEmailHTML(data)
    text = buildPointsWeeklySummaryEmailText(data)
  }

  if (row.email?.trim() && html) {
    await sendEmail({ to: row.email.trim(), subject, html, text }).catch((err: Error) => {
      console.error('Points alert email failed:', err.message)
    })
  }
  if (announce && (kind === 'rank_after_scan' || kind === 'within_10')) {
    await publishPersonalAnnouncement(userId, announce.title, announce.body).catch((err: Error) => {
      console.error('Points alert announcement failed:', err.message)
    })
  }
}

export async function notifyRankAfterScan(userId: string, eventTitle?: string | null) {
  const summary = await getMyPointsSummary(userId)
  if (!summary || summary.isCaptain || summary.overallRank == null) return
  await notifyPointsAlert(userId, 'rank_after_scan', {
    rank: summary.overallRank,
    points: summary.total,
    eventTitle: eventTitle ?? null,
  })
}

export async function runDailyWithin10Alerts(now = new Date()) {
  const season = await getCurrentSeason()
  if (!season) return 0
  const settings = await getPointsSettings()
  const dayKey = nairobiDateString(now)
  const ranked = await rankedMembers(season.id, { inRaceOnly: true })
  let n = 0
  for (let i = 1; i < ranked.length; i++) {
    const me = ranked[i]
    const above = ranked[i - 1]
    const gap = above.points - me.points
    if (gap <= 0 || gap > settings.rankAlertGap) continue
    const claimed = await claimAlert(me.userId, 'within_10', dayKey)
    if (!claimed) continue
    await notifyPointsAlert(me.userId, 'within_10', {
      rank: me.rank,
      gap,
      pointsAbove: above.points,
    })
    n++
  }
  return n
}

export async function runMondayMemberSummaries(now = new Date()) {
  const season = await getCurrentSeason()
  if (!season) return 0
  const weekKey = nairobiDateString(now)
  const members = await query(
    `SELECT u.id, u.name, u.email
     FROM users u
     LEFT JOIN captains cap ON cap.user_id = u.id AND cap.status = 'active'
     WHERE u.member_until > NOW() AND u.fully_paid_at IS NOT NULL AND cap.user_id IS NULL
       AND u.email IS NOT NULL AND TRIM(u.email) <> ''`
  )
  let n = 0
  for (const m of members.rows) {
    const claimed = await claimAlert(m.id, 'weekly_summary', weekKey)
    if (!claimed) continue
    const week = await query(
      `SELECT COALESCE(SUM(points), 0)::int AS pts
       FROM points_ledger
       WHERE user_id = $1 AND season_id = $2
         AND created_at >= (NOW() AT TIME ZONE 'Africa/Nairobi')::date - INTERVAL '7 days'`,
      [m.id, season.id]
    )
    const summary = await getMyPointsSummary(m.id)
    const streak = await getStreakCard(m.id, season.id)
    await notifyPointsAlert(m.id, 'weekly_summary', {
      weekPoints: Number(week.rows[0]?.pts ?? 0),
      streakProgress: streak.progress,
      streakLength: streak.streakLength,
      total: summary?.total ?? 0,
      rank: summary?.overallRank ?? null,
    })
    n++
  }
  return n
}

async function adminAlertEmails(): Promise<string[]> {
  const fromEnv = (process.env.ADMIN_ALERT_EMAILS || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)
  if (fromEnv.length) return fromEnv
  const admins = await query(
    `SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL AND TRIM(email) <> ''`
  )
  return admins.rows.map((r) => r.email as string)
}

export async function runMondayAdminDigest(now = new Date()) {
  const weekKey = nairobiDateString(now)
  const admin = await query(`SELECT id FROM users WHERE role = 'admin' ORDER BY created_at LIMIT 1`)
  if (!admin.rows[0]) return 0
  const claimed = await claimAlert(admin.rows[0].id, 'admin_digest', weekKey)
  if (!claimed) return 0

  const flags = await query(`SELECT COUNT(*)::int AS n FROM points_flags WHERE resolved_at IS NULL`)
  const gaps = await query(
    `SELECT e.title, eh.count AS headcount,
            (SELECT COUNT(*)::int FROM event_checkins ec WHERE ec.event_id = e.id) AS scanned
     FROM event_headcounts eh
     JOIN events e ON e.id = eh.event_id
     WHERE e.event_date >= NOW() - INTERVAL '10 days'
     ORDER BY e.event_date DESC
     LIMIT 40`
  )
  const scanGaps = gaps.rows
    .filter((r) => Number(r.scanned) !== Number(r.headcount))
    .map((r) => `${r.title}: scans ${r.scanned} vs headcount ${r.headcount}`)

  const doubles = await query(
    `SELECT u.name, e1.title AS t1, e2.title AS t2
     FROM event_checkins c1
     JOIN event_checkins c2 ON c2.user_id = c1.user_id AND c2.event_id > c1.event_id
     JOIN events e1 ON e1.id = c1.event_id
     JOIN events e2 ON e2.id = c2.event_id
     JOIN users u ON u.id = c1.user_id
     WHERE e1.event_date >= NOW() - INTERVAL '10 days'
       AND e2.event_date >= NOW() - INTERVAL '10 days'
       AND e1.event_date::date = e2.event_date::date
       AND e1.id <> e2.id
     LIMIT 20`
  )
  const doubleScans = doubles.rows.map((r) => `${r.name}: ${r.t1} + ${r.t2}`)

  const hot = await query(
    `WITH week AS (
       SELECT scanned_by AS captain_id, COUNT(*)::float AS n
       FROM event_checkins
       WHERE scanned_at >= NOW() - INTERVAL '7 days' AND scanned_by IS NOT NULL
       GROUP BY scanned_by
     ),
     avg4 AS (
       SELECT scanned_by AS captain_id, COUNT(*)::float / 4.0 AS avg_n
       FROM event_checkins
       WHERE scanned_at >= NOW() - INTERVAL '28 days' AND scanned_by IS NOT NULL
       GROUP BY scanned_by
     )
     SELECT u.name, w.n, a.avg_n
     FROM week w
     JOIN avg4 a ON a.captain_id = w.captain_id
     JOIN users u ON u.id = w.captain_id
     WHERE a.avg_n > 0 AND w.n > 2 * a.avg_n
     LIMIT 20`
  )
  const hotCaptains = hot.rows.map(
    (r) => `${r.name}: ${Math.round(r.n)} this week vs avg ${Math.round(Number(r.avg_n))}`
  )

  const data = {
    openFlags: Number(flags.rows[0]?.n ?? 0),
    scanGaps,
    doubleScans,
    hotCaptains,
  }
  const emails = await adminAlertEmails()
  for (const to of emails) {
    await sendEmail({
      to,
      subject: 'TRFC points Monday digest',
      html: buildPointsAdminDigestEmailHTML(data),
      text: buildPointsAdminDigestEmailText(data),
    }).catch((err: Error) => console.error('Admin digest email failed:', err.message))
  }
  return emails.length
}
