import { query } from '../config/db.js'
import type { ProgramContent } from '../types/programContent.js'
import type { ProgramProgress } from './programProgress.js'

export const INACTIVE_DAYS = 14
export const LAG_WEEKS = 2
export const MISSED_SESSION_THRESHOLD = 2
export const STUCK_START_DAYS = 7
export const ENGAGEMENT_ATTENTION_LIMIT = 50

export type EngagementStatus = 'on_track' | 'needs_attention' | 'inactive' | 'completed'

export const ENGAGEMENT_REASON = {
  completed: 'completed',
  inactive_14d: 'inactive_14d',
  calendar_lag: 'calendar_lag',
  missed_sessions: 'missed_sessions',
  stuck_start: 'stuck_start',
} as const

export interface EngagementResult {
  status: EngagementStatus
  reasons: string[]
  daysSinceActivity: number
  expectedWeek: number
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime()
  return Math.floor(ms / (24 * 60 * 60 * 1000))
}

export function countMissedSessions(
  content: ProgramContent | null | undefined,
  progress: Pick<ProgramProgress, 'currentWeek' | 'completed'>
): number {
  const completedKeys = new Set(
    progress.completed.filter((c) => c.done).map((c) => `${c.week}:${c.day}`)
  )
  let missed = 0
  for (const week of content?.weeks ?? []) {
    if (week.week >= progress.currentWeek) continue
    for (const day of week.days ?? []) {
      if (!completedKeys.has(`${week.week}:${day.day}`)) missed += 1
    }
  }
  return missed
}

export function computeEngagementStatus(input: {
  graduated: boolean
  enrolledAt: Date
  lastActivityAt: Date
  currentWeek: number
  totalWeeks: number
  missedSessionCount: number
  completedSessionCount: number
  now?: Date
}): EngagementResult {
  const now = input.now ?? new Date()
  const enrolledAt = new Date(input.enrolledAt)
  const lastActivityAt = new Date(input.lastActivityAt)
  const daysSinceActivity = Math.max(0, daysBetween(lastActivityAt, now))
  const daysSinceEnroll = Math.max(0, daysBetween(enrolledAt, now))
  const totalWeeks = Math.max(0, input.totalWeeks)
  const expectedWeek =
    totalWeeks <= 0 ? 1 : Math.min(totalWeeks, Math.floor(daysSinceEnroll / 7) + 1)

  if (input.graduated) {
    return {
      status: 'completed',
      reasons: [ENGAGEMENT_REASON.completed],
      daysSinceActivity,
      expectedWeek,
    }
  }

  if (daysSinceActivity >= INACTIVE_DAYS) {
    return {
      status: 'inactive',
      reasons: [ENGAGEMENT_REASON.inactive_14d],
      daysSinceActivity,
      expectedWeek,
    }
  }

  const reasons: string[] = []
  if (expectedWeek - input.currentWeek >= LAG_WEEKS) {
    reasons.push(ENGAGEMENT_REASON.calendar_lag)
  }
  if (input.missedSessionCount >= MISSED_SESSION_THRESHOLD) {
    reasons.push(ENGAGEMENT_REASON.missed_sessions)
  }
  if (
    daysSinceEnroll >= STUCK_START_DAYS &&
    input.currentWeek === 1 &&
    input.completedSessionCount === 0
  ) {
    reasons.push(ENGAGEMENT_REASON.stuck_start)
  }

  if (reasons.length > 0) {
    return {
      status: 'needs_attention',
      reasons,
      daysSinceActivity,
      expectedWeek,
    }
  }

  return {
    status: 'on_track',
    reasons: [],
    daysSinceActivity,
    expectedWeek,
  }
}

/** Latest session/check-in activity per user for a program; falls back to enrolled_at in the caller. */
export async function loadLastActivityByUser(
  programId: string,
  userIds: string[]
): Promise<Map<string, Date>> {
  const map = new Map<string, Date>()
  if (userIds.length === 0) return map

  const result = await query(
    `SELECT user_id, MAX(at) AS last_at FROM (
       SELECT user_id, completed_at AS at
       FROM program_session_progress
       WHERE program = $1 AND user_id = ANY($2::uuid[]) AND completed_at IS NOT NULL
       UNION ALL
       SELECT user_id, submitted_at AS at
       FROM program_checkins
       WHERE program = $1 AND user_id = ANY($2::uuid[])
     ) x
     GROUP BY user_id`,
    [programId, userIds]
  )
  for (const row of result.rows) {
    if (row.last_at) map.set(row.user_id, new Date(row.last_at))
  }
  return map
}

export function engagementPayload(
  engagement: EngagementResult,
  lastActivityAt: Date
) {
  return {
    engagementStatus: engagement.status,
    daysSinceActivity: engagement.daysSinceActivity,
    expectedWeek: engagement.expectedWeek,
    lastActivityAt: lastActivityAt.toISOString(),
    engagementReasons: engagement.reasons,
  }
}
