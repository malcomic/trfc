import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
}))
vi.mock('../../utils/captainSummary.js', () => ({
  findCaptainSummary: vi.fn(),
}))

import { query } from '../../config/db.js'
import {
  deriveCalendarStatus,
  getMyCalendar,
  nairobiToday,
  type CalendarRow,
} from '../../controllers/usersController.js'

const USER_ID = '22222222-2222-4222-8222-222222222222'

type Handler = (sql: string, params: any[]) => { rows: any[] } | undefined

function routeQueries(handler: Handler) {
  vi.mocked(query).mockImplementation((async (sql: string, params: any[] = []) => {
    return handler(sql, params) ?? { rows: [] }
  }) as any)
}

const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as any
const makeReq = (q: Record<string, string> = {}) =>
  ({ query: q, user: { id: USER_ID, email: 'jane@example.com', role: 'member' } }) as any

const eventsCall = () => vi.mocked(query).mock.calls.find(([sql]) => String(sql).includes('FROM events e'))

const row = (overrides: Partial<CalendarRow> = {}): CalendarRow => ({
  event_day: '2026-11-20',
  paid_count: 0,
  reserved_count: 0,
  pending_count: 0,
  checked_in: false,
  ...overrides,
})

describe('nairobiToday', () => {
  it('rolls over to the next day after 21:00 UTC', () => {
    expect(nairobiToday(new Date('2026-10-23T20:59:00Z'))).toBe('2026-10-23')
    expect(nairobiToday(new Date('2026-10-23T21:00:00Z'))).toBe('2026-10-24')
  })
})

describe('deriveCalendarStatus', () => {
  const today = '2026-11-15'

  it('marks upcoming paid tickets as going', () => {
    expect(deriveCalendarStatus(row({ paid_count: 2 }), today)).toBe('going')
  })

  it('treats an event later today as upcoming', () => {
    expect(deriveCalendarStatus(row({ event_day: today, paid_count: 1 }), today)).toBe('going')
  })

  it('splits past paid tickets into attended and missed by check-in', () => {
    const past = { event_day: '2026-11-01', paid_count: 1 }
    expect(deriveCalendarStatus(row({ ...past, checked_in: true }), today)).toBe('attended')
    expect(deriveCalendarStatus(row(past), today)).toBe('missed')
  })

  it('shows reserved and pending only for upcoming events', () => {
    expect(deriveCalendarStatus(row({ reserved_count: 1 }), today)).toBe('reserved')
    expect(deriveCalendarStatus(row({ pending_count: 1 }), today)).toBe('pending')
    expect(deriveCalendarStatus(row({ event_day: '2026-11-01', reserved_count: 1 }), today)).toBe('none')
    expect(deriveCalendarStatus(row({ event_day: '2026-11-01', pending_count: 1 }), today)).toBe('none')
  })

  it('prefers paid over reserved and pending', () => {
    expect(deriveCalendarStatus(row({ paid_count: 1, reserved_count: 1, pending_count: 1 }), today)).toBe('going')
  })

  it('returns none without tickets', () => {
    expect(deriveCalendarStatus(row(), today)).toBe('none')
  })
})

describe('getMyCalendar', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset()
    routeQueries((sql) => {
      if (sql.includes('MIN(event_date)')) return { rows: [{ earliest: '2025-02-01', latest: '2027-01-10' }] }
      return { rows: [] }
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('defaults to the current Nairobi month', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-31T22:00:00Z'))
    const res = makeRes()
    await getMyCalendar(makeReq(), res)

    expect(eventsCall()![1]).toEqual([USER_ID, '2026-11-01', '2026-11-30'])
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ from: '2026-11-01', to: '2026-11-30', today: '2026-11-01', earliest: '2025-02-01' })
    )
  })

  it.each([
    [{ from: '2026-11-01' }],
    [{ from: '2026/11/01', to: '2026-11-30' }],
    [{ from: '2026-02-30', to: '2026-03-01' }],
    [{ from: '2026-11-30', to: '2026-11-01' }],
    [{ from: '2026-01-01', to: '2027-03-01' }],
  ])('rejects invalid range %o', async (params) => {
    const res = makeRes()
    await getMyCalendar(makeReq(params), res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(eventsCall()).toBeUndefined()
  })

  it('filters on the wall-clock date without time zone conversion', async () => {
    const res = makeRes()
    await getMyCalendar(makeReq({ from: '2026-12-01', to: '2026-12-31' }), res)
    const [sql, params] = eventsCall()!
    expect(sql).toContain('e.event_date >= $2::date')
    expect(sql).toContain('e.event_date < ($3::date + 1)')
    expect(sql).not.toMatch(/event_date AT TIME ZONE/)
    expect(params).toEqual([USER_ID, '2026-12-01', '2026-12-31'])
  })

  it('maps rows to calendar events with the member status', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-15T09:00:00Z'))
    routeQueries((sql) => {
      if (sql.includes('MIN(event_date)')) return { rows: [{ earliest: '2025-02-01', latest: '2027-01-10' }] }
      if (sql.includes('FROM events e')) {
        return {
          rows: [
            {
              id: 'e1', title: 'Night Run', event_date: '2026-11-20T21:30:00.000Z', event_day: '2026-11-20',
              location: 'Karura', image_url: null, min_price: 1500, sold_out: false,
              paid_count: 0, reserved_count: 2, pending_count: 0, checked_in: false, plan_remaining: 2000,
            },
            {
              id: 'e2', title: 'Hill Repeats', event_date: '2026-11-02T06:00:00.000Z', event_day: '2026-11-02',
              location: null, image_url: null, min_price: 1000, sold_out: true,
              paid_count: 1, reserved_count: 0, pending_count: 0, checked_in: true, plan_remaining: null,
            },
          ],
        }
      }
      return { rows: [] }
    })
    const res = makeRes()
    await getMyCalendar(makeReq({ from: '2026-11-01', to: '2026-11-30' }), res)
    const { events } = res.json.mock.calls[0][0]
    expect(events[0]).toMatchObject({ id: 'e1', is_past: false, my_status: 'reserved', my_ticket_count: 2, plan_remaining: 2000 })
    expect(events[1]).toMatchObject({ id: 'e2', is_past: true, my_status: 'attended', sold_out: true, plan_remaining: null })
  })
})
