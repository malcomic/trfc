import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))
vi.mock('../../utils/wallet.js', () => ({
  addCredit: vi.fn().mockResolvedValue({ id: 'credit-1' }),
  voidCredit: vi.fn().mockResolvedValue(0),
  withWallet: vi.fn(async (_userId: string, fn: (db: unknown) => unknown) => fn({ query: vi.fn().mockResolvedValue({ rows: [] }) })),
  poolDb: { query: vi.fn().mockResolvedValue({ rows: [] }) },
}))
vi.mock('../../utils/installments.js', () => ({
  closePlanToCredit: vi.fn().mockResolvedValue(undefined),
}))

import { getClient, query } from '../../config/db.js'
import { addCredit, withWallet } from '../../utils/wallet.js'
import { cancelEventByTrfc, confirmScanList } from '../../utils/attendance.js'

const EVENT_ID = 'ev-1'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('confirmScanList', () => {
  it('records unscanned paid tickets as no-shows without giving any ticket credit', async () => {
    const calls: string[] = []
    vi.mocked(query).mockImplementation((async (sql: string) => {
      calls.push(sql)
      if (sql.includes('FROM events e CROSS JOIN ticket_rules_settings')) {
        return {
          rows: [
            {
              id: EVENT_ID,
              title: 'Ngong Hills Hike',
              cancelled_at: null,
              event_day: '2026-12-12',
              starts_at: '2026-12-12T03:00:00.000Z',
              after_launch: true,
            },
          ],
        }
      }
      if (sql.includes("attendance_status = 'attended'")) return { rows: [], rowCount: 5 }
      if (sql.includes("attendance_status = 'no_show'")) return { rows: [], rowCount: 2 }
      return { rows: [], rowCount: 0 }
    }) as any)

    const result = await confirmScanList(EVENT_ID, 'admin-1', new Date('2026-12-13T03:00:00Z'))

    expect(result).toEqual({ attended: 5, noShows: 2, credited: 0 })
    expect(addCredit).not.toHaveBeenCalled()
    expect(withWallet).not.toHaveBeenCalled()
    expect(calls.some((sql) => sql.includes('ticket_credits'))).toBe(false)
  })
})

describe('cancelEventByTrfc', () => {
  it('still turns every paid ticket into ticket credit straight away', async () => {
    const client = { query: vi.fn(), release: vi.fn() }
    client.query.mockImplementation(async (sql: string) => {
      if (sql.includes('UPDATE events SET cancelled_at')) {
        return { rows: [{ title: 'Ngong Hills Hike', event_day: '2026-12-12' }] }
      }
      return { rows: [] }
    })
    vi.mocked(getClient).mockResolvedValue(client as any)
    vi.mocked(query).mockImplementation((async (sql: string) => {
      if (sql.includes('FROM ticket_payment_plans')) return { rows: [] }
      if (sql.includes("t.payment_status = 'paid'")) {
        return {
          rows: [
            { id: 't-1', user_id: 'user-1', email: null, referral_region_id: 'zone-1', price: 1497 },
            { id: 't-2', user_id: 'user-2', email: null, referral_region_id: null, price: 999 },
          ],
        }
      }
      return { rows: [] }
    }) as any)

    const result = await cancelEventByTrfc(EVENT_ID, 'Heavy rain', 'admin-1')

    expect(result).toEqual({ plansClosed: 0, ticketsCredited: 2, guestTickets: 0 })
    expect(addCredit).toHaveBeenCalledTimes(2)
    expect(vi.mocked(addCredit).mock.calls[0][1]).toBe('user-1')
    expect(vi.mocked(addCredit).mock.calls[0][2]).toMatchObject({ amount: 1497, reason: 'event_cancelled', eventDay: '2026-12-12' })
  })
})
