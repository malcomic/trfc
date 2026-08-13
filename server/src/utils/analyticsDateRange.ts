import { Request } from 'express'

export type DateRangeMode = 'days' | 'absolute'

export interface AnalyticsDateRange {
  mode: DateRangeMode
  /** Number of days looking back from now (when mode === 'days') */
  days: number
  startDate?: string
  endDate?: string
  /** Previous period of equal length for trend comparison */
  prevDays?: number
  prevStartDate?: string
  prevEndDate?: string
}

/**
 * Parse days | startDate+endDate from query.
 * Default: last 30 days.
 */
export function parseAnalyticsDateRange(query: Request['query']): AnalyticsDateRange {
  const daysRaw = query.days
  const startDate = typeof query.startDate === 'string' ? query.startDate : undefined
  const endDate = typeof query.endDate === 'string' ? query.endDate : undefined

  if (startDate && endDate) {
    // Normalize to full calendar days so endDate is inclusive
    const startIso = startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`
    const endIso = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`
    const start = new Date(startIso)
    const end = new Date(endIso)
    const ms = Math.max(end.getTime() - start.getTime(), 24 * 60 * 60 * 1000)
    const prevEnd = new Date(start.getTime() - 1)
    const prevStart = new Date(prevEnd.getTime() - ms)
    return {
      mode: 'absolute',
      days: 0,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      prevStartDate: prevStart.toISOString(),
      prevEndDate: prevEnd.toISOString(),
    }
  }

  const days = Math.max(1, parseInt(String(daysRaw || '30'), 10) || 30)
  return {
    mode: 'days',
    days,
    prevDays: days,
  }
}

/**
 * Build SQL filter for a timestamp column.
 * @param column - e.g. "created_at" or "t.created_at" or "o.created_at"
 * @param startParamIndex - next $N index to use
 * @returns { clause, params, nextIndex } — clause includes leading AND
 */
export function dateRangeSql(
  column: string,
  range: AnalyticsDateRange,
  startParamIndex: number,
  options?: { previous?: boolean }
): { clause: string; params: (string | number)[]; nextIndex: number } {
  const previous = options?.previous === true

  if (range.mode === 'absolute') {
    const start = previous ? range.prevStartDate! : range.startDate!
    const end = previous ? range.prevEndDate! : range.endDate!
    return {
      clause: ` AND ${column} >= $${startParamIndex} AND ${column} <= $${startParamIndex + 1}`,
      params: [start, end],
      nextIndex: startParamIndex + 2,
    }
  }

  const days = previous ? range.prevDays! : range.days
  if (previous) {
    // Previous window: [NOW - 2*days, NOW - days)
    return {
      clause: ` AND ${column} >= NOW() - INTERVAL '1 days' * $${startParamIndex} AND ${column} < NOW() - INTERVAL '1 days' * $${startParamIndex + 1}`,
      params: [days * 2, days],
      nextIndex: startParamIndex + 2,
    }
  }

  return {
    clause: ` AND ${column} >= NOW() - INTERVAL '1 days' * $${startParamIndex}`,
    params: [days],
    nextIndex: startParamIndex + 1,
  }
}
