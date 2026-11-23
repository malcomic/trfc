import { query } from '../config/db.js'

export interface PointsSettings {
  zoneRunPoints: number
  commonRunPoints: number
  hikeFitfestPoints: number
  marathonPoints: number
  streakBonusPoints: number
  streakLength: number
  scanGraceHours: number
  raceCutoffAt: Date
  momRewardPoints: number
  mombasaMinSaturdays: number
  consistentMinSaturdays: number
  zoneOfYearMinMembers: number
  topReferrerMin: number
  mostImprovedMinFinishes: number
  commonRunDistanceKm: number
  spendKesPerPoint: number
  redeemKesPerPoint: number
  referralRewardPoints: number
  rewardExpiryMonths: number
  rankAlertGap: number
  missingScanReportDays: number
  missingScanDecideDays: number
  captainWeightAttendance: number
  captainWeightNewMembers: number
  captainWeightFeedback: number
  captainWeightCleanScans: number
  captainSupportThreshold: number
  tripFeeSetAsideKes: number
  updatedAt: Date | null
}

export const DEFAULT_POINTS_SETTINGS: PointsSettings = {
  zoneRunPoints: 10,
  commonRunPoints: 15,
  hikeFitfestPoints: 30,
  marathonPoints: 30,
  streakBonusPoints: 10,
  streakLength: 4,
  scanGraceHours: 2,
  raceCutoffAt: new Date('2027-03-31T20:59:59.000Z'),
  momRewardPoints: 100,
  mombasaMinSaturdays: 10,
  consistentMinSaturdays: 8,
  zoneOfYearMinMembers: 10,
  topReferrerMin: 3,
  mostImprovedMinFinishes: 10,
  commonRunDistanceKm: 10,
  spendKesPerPoint: 50,
  redeemKesPerPoint: 2,
  referralRewardPoints: 100,
  rewardExpiryMonths: 12,
  rankAlertGap: 10,
  missingScanReportDays: 7,
  missingScanDecideDays: 7,
  captainWeightAttendance: 40,
  captainWeightNewMembers: 30,
  captainWeightFeedback: 20,
  captainWeightCleanScans: 10,
  captainSupportThreshold: 50,
  tripFeeSetAsideKes: 0,
  updatedAt: null,
}

export type PointsKind = 'zone_run' | 'common_run' | 'hike' | 'fit_fest' | 'marathon' | 'none'

const CACHE_TTL_MS = 60_000
let cached: { value: PointsSettings; expiresAt: number } | null = null

function settingsFromRow(row: Record<string, unknown> | undefined): PointsSettings {
  if (!row) return { ...DEFAULT_POINTS_SETTINGS }
  return {
    zoneRunPoints: Number(row.zone_run_points),
    commonRunPoints: Number(row.common_run_points),
    hikeFitfestPoints: Number(row.hike_fitfest_points),
    marathonPoints: Number(row.marathon_points),
    streakBonusPoints: Number(row.streak_bonus_points),
    streakLength: Number(row.streak_length),
    scanGraceHours: Number(row.scan_grace_hours),
    raceCutoffAt: new Date(String(row.race_cutoff_at)),
    momRewardPoints: Number(row.mom_reward_points),
    mombasaMinSaturdays: Number(row.mombasa_min_saturdays),
    consistentMinSaturdays: Number(row.consistent_min_saturdays),
    zoneOfYearMinMembers: Number(row.zone_of_year_min_members),
    topReferrerMin: Number(row.top_referrer_min),
    mostImprovedMinFinishes: Number(row.most_improved_min_finishes),
    commonRunDistanceKm: Number(row.common_run_distance_km),
    spendKesPerPoint: Number(row.spend_kes_per_point),
    redeemKesPerPoint: Number(row.redeem_kes_per_point),
    referralRewardPoints: Number(row.referral_reward_points),
    rewardExpiryMonths: Number(row.reward_expiry_months),
    rankAlertGap: Number(row.rank_alert_gap),
    missingScanReportDays: Number(row.missing_scan_report_days),
    missingScanDecideDays: Number(row.missing_scan_decide_days),
    captainWeightAttendance: Number(row.captain_weight_attendance),
    captainWeightNewMembers: Number(row.captain_weight_new_members),
    captainWeightFeedback: Number(row.captain_weight_feedback),
    captainWeightCleanScans: Number(row.captain_weight_clean_scans),
    captainSupportThreshold: Number(row.captain_support_threshold),
    tripFeeSetAsideKes: Number(row.trip_fee_set_aside_kes),
    updatedAt: row.updated_at ? new Date(String(row.updated_at)) : null,
  }
}

export async function getPointsSettings({ fresh = false }: { fresh?: boolean } = {}): Promise<PointsSettings> {
  if (!fresh && cached && cached.expiresAt > Date.now()) return cached.value
  const result = await query(`SELECT * FROM points_settings WHERE id = 1`)
  const value = settingsFromRow(result.rows[0])
  cached = { value, expiresAt: Date.now() + CACHE_TTL_MS }
  return value
}

export function clearPointsSettingsCache() {
  cached = null
}

export function pointsForKind(settings: PointsSettings, kind: PointsKind): number {
  switch (kind) {
    case 'zone_run':
      return settings.zoneRunPoints
    case 'common_run':
      return settings.commonRunPoints
    case 'hike':
    case 'fit_fest':
      return settings.hikeFitfestPoints
    case 'marathon':
      return settings.marathonPoints
    default:
      return 0
  }
}

const INT_FIELDS: Partial<Record<keyof PointsSettings, [number, number]>> = {
  zoneRunPoints: [0, 500],
  commonRunPoints: [0, 500],
  hikeFitfestPoints: [0, 500],
  marathonPoints: [0, 500],
  streakBonusPoints: [0, 500],
  streakLength: [2, 20],
  scanGraceHours: [0, 24],
  momRewardPoints: [0, 10_000],
  mombasaMinSaturdays: [0, 50],
  consistentMinSaturdays: [0, 50],
  zoneOfYearMinMembers: [1, 500],
  topReferrerMin: [1, 100],
  mostImprovedMinFinishes: [3, 100],
  spendKesPerPoint: [1, 10_000],
  redeemKesPerPoint: [1, 1000],
  referralRewardPoints: [0, 10_000],
  rewardExpiryMonths: [1, 60],
  rankAlertGap: [1, 100],
  missingScanReportDays: [1, 30],
  missingScanDecideDays: [1, 30],
}

/** Validates an admin update. Returns an error message, or the merged settings. */
export function parsePointsSettings(body: any, current: PointsSettings): PointsSettings | string {
  const next: PointsSettings = { ...current }
  for (const [key, [min, max]] of Object.entries(INT_FIELDS) as [keyof PointsSettings, [number, number]][]) {
    if (body?.[key] === undefined) continue
    const value = Number(body[key])
    if (!Number.isInteger(value) || value < min || value > max) {
      return `${key} must be a whole number from ${min} to ${max}`
    }
    ;(next as any)[key] = value
  }
  for (const key of [
    'commonRunDistanceKm',
    'captainWeightAttendance',
    'captainWeightNewMembers',
    'captainWeightFeedback',
    'captainWeightCleanScans',
    'captainSupportThreshold',
    'tripFeeSetAsideKes',
  ] as const) {
    if (body?.[key] === undefined) continue
    const value = Number(body[key])
    if (!Number.isFinite(value) || value < 0) return `${key} must be a number >= 0`
    next[key] = value
  }
  if (body?.raceCutoffAt !== undefined) {
    const date = new Date(body.raceCutoffAt)
    if (Number.isNaN(date.getTime())) return 'raceCutoffAt must be a valid date'
    next.raceCutoffAt = date
  }
  const weightSum =
    next.captainWeightAttendance +
    next.captainWeightNewMembers +
    next.captainWeightFeedback +
    next.captainWeightCleanScans
  if (Math.abs(weightSum - 100) > 0.01) return 'Captain scorecard weights must add up to 100'
  return next
}

export async function updatePointsSettings(settings: PointsSettings, updatedBy: string): Promise<void> {
  await query(
    `UPDATE points_settings SET
       zone_run_points = $1, common_run_points = $2, hike_fitfest_points = $3, marathon_points = $4,
       streak_bonus_points = $5, streak_length = $6, scan_grace_hours = $7, race_cutoff_at = $8,
       mom_reward_points = $9, mombasa_min_saturdays = $10, consistent_min_saturdays = $11,
       zone_of_year_min_members = $12, top_referrer_min = $13, most_improved_min_finishes = $14,
       common_run_distance_km = $15, spend_kes_per_point = $16, redeem_kes_per_point = $17,
       referral_reward_points = $18, reward_expiry_months = $19, rank_alert_gap = $20,
       missing_scan_report_days = $21, missing_scan_decide_days = $22,
       captain_weight_attendance = $23, captain_weight_new_members = $24,
       captain_weight_feedback = $25, captain_weight_clean_scans = $26,
       captain_support_threshold = $27, trip_fee_set_aside_kes = $28,
       updated_at = NOW(), updated_by = $29
     WHERE id = 1`,
    [
      settings.zoneRunPoints,
      settings.commonRunPoints,
      settings.hikeFitfestPoints,
      settings.marathonPoints,
      settings.streakBonusPoints,
      settings.streakLength,
      settings.scanGraceHours,
      settings.raceCutoffAt,
      settings.momRewardPoints,
      settings.mombasaMinSaturdays,
      settings.consistentMinSaturdays,
      settings.zoneOfYearMinMembers,
      settings.topReferrerMin,
      settings.mostImprovedMinFinishes,
      settings.commonRunDistanceKm,
      settings.spendKesPerPoint,
      settings.redeemKesPerPoint,
      settings.referralRewardPoints,
      settings.rewardExpiryMonths,
      settings.rankAlertGap,
      settings.missingScanReportDays,
      settings.missingScanDecideDays,
      settings.captainWeightAttendance,
      settings.captainWeightNewMembers,
      settings.captainWeightFeedback,
      settings.captainWeightCleanScans,
      settings.captainSupportThreshold,
      settings.tripFeeSetAsideKes,
      updatedBy,
    ]
  )
  clearPointsSettingsCache()
}
