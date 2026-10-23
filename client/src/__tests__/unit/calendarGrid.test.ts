import { describe, it, expect } from 'vitest'
import {
  buildMonthGrid,
  eventDayKey,
  groupByDay,
  monthRange,
  nairobiToday,
  shiftMonth,
} from '../../utils/calendarGrid'

describe('eventDayKey', () => {
  it('keeps a late-evening Kenya time on its own day', () => {
    expect(eventDayKey('2026-11-20T21:30:00Z')).toBe('2026-11-20')
    expect(eventDayKey('2026-11-20T00:00:00.000Z')).toBe('2026-11-20')
  })
})

describe('shiftMonth and monthRange', () => {
  it('crosses year boundaries', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2027-01', -1)).toBe('2026-12')
    expect(shiftMonth('2026-11', -13)).toBe('2025-10')
  })

  it('covers the whole month including leap-year February', () => {
    expect(monthRange('2026-12')).toEqual({ from: '2026-12-01', to: '2026-12-31' })
    expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' })
    expect(monthRange('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
  })
})

describe('buildMonthGrid', () => {
  it('returns 42 cells starting on a Monday', () => {
    const cells = buildMonthGrid('2026-11', '2026-11-15')
    expect(cells).toHaveLength(42)
    // 1 Nov 2026 is a Sunday, so the grid starts on Monday 26 Oct.
    expect(cells[0]).toMatchObject({ day: '2026-10-26', inMonth: false })
    expect(cells[6]).toMatchObject({ day: '2026-11-01', inMonth: true })
    expect(new Date(`${cells[0].day}T00:00:00Z`).getUTCDay()).toBe(1)
  })

  it('marks today and past days', () => {
    const cells = buildMonthGrid('2026-11', '2026-11-15')
    const today = cells.find((c) => c.isToday)!
    expect(today.day).toBe('2026-11-15')
    expect(today.isPast).toBe(false)
    expect(cells.find((c) => c.day === '2026-11-14')!.isPast).toBe(true)
  })

  it('handles December into January', () => {
    const cells = buildMonthGrid('2026-12', '2026-12-01')
    expect(cells.filter((c) => c.inMonth)).toHaveLength(31)
    expect(cells[41].day).toBe('2027-01-10')
  })

  it('handles leap-year February', () => {
    const cells = buildMonthGrid('2028-02', '2028-02-01')
    const inMonth = cells.filter((c) => c.inMonth)
    expect(inMonth).toHaveLength(29)
    expect(inMonth[28].day).toBe('2028-02-29')
  })
})

describe('groupByDay', () => {
  it('groups by event day and sorts by time', () => {
    const groups = groupByDay([
      { id: 'b', event_date: '2026-11-20T18:00:00Z' },
      { id: 'a', event_date: '2026-11-20T06:00:00Z' },
      { id: 'c', event_date: '2026-11-21T07:00:00Z' },
    ])
    expect(groups.get('2026-11-20')!.map((e) => e.id)).toEqual(['a', 'b'])
    expect(groups.get('2026-11-21')!.map((e) => e.id)).toEqual(['c'])
  })
})

describe('nairobiToday', () => {
  it('uses UTC+3', () => {
    expect(nairobiToday(new Date('2026-12-31T21:30:00Z'))).toBe('2027-01-01')
  })
})
