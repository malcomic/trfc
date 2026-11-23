import { query } from '../config/db.js'
import {
  computeCaptainScores,
  freezeSeason,
  lockZonesForSeason,
  memberOfTheMonth,
  openSeason2,
} from '../utils/pointsAwards.js'
import {
  runDailyWithin10Alerts,
  runMondayAdminDigest,
  runMondayMemberSummaries,
} from '../utils/pointsAlerts.js'
import { getCurrentSeason } from '../utils/pointsEligibility.js'
import { getPointsSettings } from '../utils/pointsSettings.js'
import { nairobiDateString } from '../utils/pointsStreak.js'
import { expireRewardPoints } from '../utils/rewardLedger.js'

const TICK_MS = 60 * 60 * 1000
let timer: ReturnType<typeof setInterval> | null = null
let isRunning = false
let lastMondayKey = ''
let lastMonthKey = ''
let lastDailyKey = ''

async function raiseHeadcountFlags() {
  const rows = await query(
    `SELECT e.id AS event_id, eh.count AS headcount, eh.entered_by,
            (SELECT COUNT(*)::int FROM event_checkins ec WHERE ec.event_id = e.id) AS scanned
     FROM event_headcounts eh
     JOIN events e ON e.id = eh.event_id
     WHERE e.event_date >= NOW() - INTERVAL '3 days'
       AND e.event_date < NOW()`
  )
  for (const row of rows.rows) {
    const scanned = Number(row.scanned)
    const headcount = Number(row.headcount)
    if (scanned === headcount) continue
    const type = scanned > headcount ? 'scan_over_headcount' : 'headcount_gap'
    const exists = await query(
      `SELECT 1 FROM points_flags
       WHERE event_id = $1 AND type = $2 AND resolved_at IS NULL
         AND created_at > NOW() - INTERVAL '2 days'
       LIMIT 1`,
      [row.event_id, type]
    )
    if (exists.rows[0]) continue
    await query(
      `INSERT INTO points_flags (type, event_id, captain_id, detail)
       VALUES ($1, $2, $3, $4)`,
      [
        type,
        row.event_id,
        row.entered_by,
        `Scans ${scanned} vs headcount ${headcount}`,
      ]
    )
  }
}

async function expireMissingScanReports() {
  const settings = await getPointsSettings()
  await query(
    `UPDATE missing_scan_reports
     SET status = 'expired', decided_at = NOW(), note = COALESCE(note, '') || E'\\nAuto-expired'
     WHERE status = 'pending'
       AND created_at < NOW() - make_interval(days => $1)`,
    [settings.missingScanDecideDays]
  )
}

async function runCalendarActions(now: Date) {
  const season = await getCurrentSeason()
  if (!season) return
  const settings = await getPointsSettings()
  const nairobi = now.toLocaleString('en-CA', { timeZone: 'Africa/Nairobi' })
  const day = nairobi.slice(0, 10)

  if (now.getTime() >= settings.raceCutoffAt.getTime()) {
    const locked = await query(`SELECT 1 FROM regions WHERE locked_at IS NOT NULL LIMIT 1`)
    if (!locked.rows[0]) await lockZonesForSeason(season.id)
  }

  if (day === '2027-06-30') {
    // Transformation entries close — no-op marker; entries simply stop accepting via API date checks
  }

  if (day === '2027-07-31' || now.getTime() >= new Date(season.ends_at).getTime()) {
    if (season.status === 'active') await freezeSeason(season.id)
  }

  if (day >= '2027-08-01' && day <= '2027-08-07') {
    await openSeason2()
  }
}

export async function runPointsTick(now = new Date()) {
  const expired = await expireRewardPoints(now)
  await expireMissingScanReports()
  await raiseHeadcountFlags()
  await runCalendarActions(now)

  const dayKey = nairobiDateString(now)
  if (dayKey !== lastDailyKey) {
    lastDailyKey = dayKey
    await runDailyWithin10Alerts(now).catch((err: Error) =>
      console.error('Within-10 alerts failed:', err?.message || err)
    )
  }

  const dow = now.toLocaleDateString('en-US', { timeZone: 'Africa/Nairobi', weekday: 'short' })
  if (dow === 'Mon' && lastMondayKey !== dayKey) {
    lastMondayKey = dayKey
    await raiseHeadcountFlags()
    await runMondayMemberSummaries(now).catch((err: Error) =>
      console.error('Monday member summaries failed:', err?.message || err)
    )
    await runMondayAdminDigest(now).catch((err: Error) =>
      console.error('Monday admin digest failed:', err?.message || err)
    )
  }

  const monthKey = dayKey.slice(0, 7)
  if (lastMonthKey && lastMonthKey !== monthKey) {
    const [y, m] = lastMonthKey.split('-').map(Number)
    await memberOfTheMonth(y, m)
    const season = await getCurrentSeason()
    if (season) await computeCaptainScores(season.id, lastMonthKey)
  }
  lastMonthKey = monthKey

  return { expired }
}

export function startPointsScheduler() {
  if (process.env.POINTS_JOBS_ENABLED === 'false' || process.env.NODE_ENV === 'test') return
  if (timer) return
  const tick = async () => {
    if (isRunning) return
    isRunning = true
    try {
      await runPointsTick()
    } catch (error: any) {
      console.error('⚠️  Points job failed:', error?.message || error)
    } finally {
      isRunning = false
    }
  }
  void tick()
  timer = setInterval(tick, TICK_MS)
  console.log('✓ Points scheduler started')
}

export function stopPointsScheduler() {
  if (timer) clearInterval(timer)
  timer = null
}
