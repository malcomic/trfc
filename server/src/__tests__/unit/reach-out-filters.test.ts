import { describe, it, expect, vi } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))

import { buildReachOutWhere, formatAnswer, parseReachOutFilters, toCsv } from '../../utils/reachOut.js'

const REGION = '44444444-4444-4444-8444-444444444444'

describe('parseReachOutFilters', () => {
  it('drops unknown values and keeps valid ones', () => {
    const filters = parseReachOutFilters({
      hardest_now: 'start_then_stop',
      goal_3m: 'fly_to_mars',
      zone: 'juja; DROP TABLE users',
      status: 'replied',
      inactive_days: '14',
      has_other: 'true',
      search: '  Jane  ',
    })
    expect(filters).toEqual({ hardest_now: 'start_then_stop', status: 'replied', inactive_days: 14, has_other: true, search: 'Jane' })
  })

  it('accepts region ids, zone extras and "none"', () => {
    expect(parseReachOutFilters({ zone: REGION }).zone).toBe(REGION)
    expect(parseReachOutFilters({ zone: 'outside' }).zone).toBe('outside')
    expect(parseReachOutFilters({ zone: 'none' }).zone).toBe('none')
    expect(parseReachOutFilters({ inactive_days: '9' }).inactive_days).toBeUndefined()
  })
})

describe('buildReachOutWhere', () => {
  it('only lists members, never admins or scanners', () => {
    const { where, params } = buildReachOutWhere({})
    expect(where).toBe("WHERE u.role NOT IN ('admin', 'scanner')")
    expect(params).toEqual([])
  })

  it('combines filters with bound parameters', () => {
    const { where, params } = buildReachOutWhere({ zone: REGION, hardest_now: 'start_then_stop', status: 'not_contacted', inactive_days: 14 })
    expect(where).toContain('ma.hardest_now = $1')
    expect(where).toContain('= $2::uuid')
    expect(where).toContain("COALESCE(ma.outreach_status, 'not_contacted') = $3")
    expect(where).toContain('make_interval(days => $4::int)')
    expect(where).toContain('u.last_active_at IS NULL OR')
    expect(params).toEqual(['start_then_stop', REGION, 'not_contacted', 14])
  })

  it('treats "none" as no answer', () => {
    const { where, params } = buildReachOutWhere({ goal_3m: 'none' })
    expect(where).toContain('ma.goal_3m IS NULL')
    expect(params).toEqual([])
  })

  it('filters members who typed an Other answer or answered nothing', () => {
    expect(buildReachOutWhere({ has_other: true }).where).toContain('ma.hardest_now_other IS NOT NULL')
    expect(buildReachOutWhere({ unanswered: true }).where).toContain('NOT COALESCE(ma.hardest_now IS NOT NULL OR')
  })

  it('binds search text instead of pasting it into SQL', () => {
    const { where, params } = buildReachOutWhere({ search: "0712' OR 1=1 --" })
    expect(where).not.toContain('OR 1=1')
    expect(where).toContain('u.name ILIKE $1')
    expect(where).toContain('u.phone_normalized LIKE $2')
    expect(params).toEqual(["%0712' OR 1=1 --%", '%71211%'])
  })

  it('escapes LIKE wildcards in search', () => {
    expect(buildReachOutWhere({ search: '50%_off' }).params[0]).toBe('%50\\%\\_off%')
  })

  it('limits to a zone when a captain scope is given', () => {
    const { where, params } = buildReachOutWhere({}, { regionId: REGION })
    expect(where).toContain('ELSE u.referred_by_region_id END) = $1::uuid')
    expect(params).toEqual([REGION])
  })
})

describe('CSV helpers', () => {
  it('shows a dash for blank answers and "Prefer not to say"', () => {
    expect(formatAnswer(null)).toBe('-')
    expect(formatAnswer('prefer_not_to_say')).toBe('-')
    expect(formatAnswer('no_time')).toBe('no_time')
  })

  it('quotes cells and blocks spreadsheet formulas', () => {
    const csv = toCsv([{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }], [{ a: '=HYPERLINK("x")', b: 'He said "hi", ok' }])
    const lines = csv.replace('\uFEFF', '').trim().split('\r\n')
    expect(lines[0]).toBe('"A","B"')
    expect(lines[1]).toBe('"\'=HYPERLINK(""x"")","He said ""hi"", ok"')
  })
})
