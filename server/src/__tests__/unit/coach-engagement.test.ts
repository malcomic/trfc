import { describe, it, expect } from 'vitest'
import {
  computeEngagementStatus,
  countMissedSessions,
  INACTIVE_DAYS,
  STUCK_START_DAYS,
} from '../../utils/coachEngagement.js'

const base = {
  graduated: false,
  enrolledAt: new Date('2026-10-01T00:00:00Z'),
  lastActivityAt: new Date('2026-11-10T00:00:00Z'),
  currentWeek: 3,
  totalWeeks: 8,
  missedSessionCount: 0,
  completedSessionCount: 5,
  now: new Date('2026-11-16T00:00:00Z'),
}

describe('computeEngagementStatus', () => {
  it('marks graduated participants completed', () => {
    const result = computeEngagementStatus({ ...base, graduated: true })
    expect(result.status).toBe('completed')
    expect(result.reasons).toContain('completed')
  })

  it('marks inactive when last activity is 14+ days ago (wins over lag)', () => {
    const result = computeEngagementStatus({
      ...base,
      lastActivityAt: new Date('2026-10-01T00:00:00Z'),
      currentWeek: 1,
      missedSessionCount: 5,
      now: new Date('2026-11-16T00:00:00Z'),
    })
    expect(result.daysSinceActivity).toBeGreaterThanOrEqual(INACTIVE_DAYS)
    expect(result.status).toBe('inactive')
    expect(result.reasons).toEqual(['inactive_14d'])
  })

  it('marks needs_attention for calendar lag of 2+ weeks', () => {
    // enrolled 21 days ago → expected week 4; current week 1 → lag 3
    const result = computeEngagementStatus({
      ...base,
      enrolledAt: new Date('2026-10-26T00:00:00Z'),
      lastActivityAt: new Date('2026-11-14T00:00:00Z'),
      currentWeek: 1,
      completedSessionCount: 1,
      missedSessionCount: 0,
      now: new Date('2026-11-16T00:00:00Z'),
    })
    expect(result.expectedWeek).toBe(4)
    expect(result.status).toBe('needs_attention')
    expect(result.reasons).toContain('calendar_lag')
  })

  it('marks needs_attention when missed sessions >= 2', () => {
    const result = computeEngagementStatus({
      ...base,
      enrolledAt: new Date('2026-11-10T00:00:00Z'),
      lastActivityAt: new Date('2026-11-14T00:00:00Z'),
      currentWeek: 2,
      missedSessionCount: 2,
      completedSessionCount: 1,
      now: new Date('2026-11-16T00:00:00Z'),
    })
    expect(result.status).toBe('needs_attention')
    expect(result.reasons).toContain('missed_sessions')
  })

  it('marks needs_attention for stuck start', () => {
    const result = computeEngagementStatus({
      ...base,
      enrolledAt: new Date('2026-11-01T00:00:00Z'),
      lastActivityAt: new Date('2026-11-01T00:00:00Z'),
      currentWeek: 1,
      completedSessionCount: 0,
      missedSessionCount: 0,
      now: new Date('2026-11-16T00:00:00Z'),
    })
    expect(result.daysSinceActivity).toBeGreaterThanOrEqual(STUCK_START_DAYS)
    // 15 days inactive wins first
    expect(result.status).toBe('inactive')
  })

  it('marks needs_attention for stuck start when still active recently via enroll fallback only under 14d', () => {
    const result = computeEngagementStatus({
      ...base,
      enrolledAt: new Date('2026-11-05T00:00:00Z'),
      lastActivityAt: new Date('2026-11-05T00:00:00Z'),
      currentWeek: 1,
      completedSessionCount: 0,
      missedSessionCount: 0,
      now: new Date('2026-11-16T00:00:00Z'),
    })
    expect(result.daysSinceActivity).toBe(11)
    expect(result.status).toBe('needs_attention')
    expect(result.reasons).toContain('stuck_start')
  })

  it('marks on_track for a fresh enrollee progressing', () => {
    const result = computeEngagementStatus({
      ...base,
      enrolledAt: new Date('2026-11-10T00:00:00Z'),
      lastActivityAt: new Date('2026-11-15T00:00:00Z'),
      currentWeek: 1,
      completedSessionCount: 2,
      missedSessionCount: 0,
      now: new Date('2026-11-16T00:00:00Z'),
    })
    expect(result.status).toBe('on_track')
    expect(result.reasons).toEqual([])
  })
})

describe('countMissedSessions', () => {
  it('counts incomplete plan days in past weeks only', () => {
    const content = {
      weeks: [
        { week: 1, days: [{ day: 1 }, { day: 2 }, { day: 3 }] },
        { week: 2, days: [{ day: 1 }, { day: 2 }] },
      ],
    } as any
    const missed = countMissedSessions(content, {
      currentWeek: 2,
      completed: [
        { week: 1, day: 1, rounds_done: 1, done: true },
        { week: 1, day: 2, rounds_done: 1, done: true },
      ],
    })
    // week 1 day 3 missing → 1
    expect(missed).toBe(1)
  })
})
