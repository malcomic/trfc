import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))

import { query, getClient } from '../../config/db.js'
import { buyTicket } from '../../controllers/ticketsController.js'
import { earlyUntil, earlyWindowOpen } from '../../utils/memberEarly.js'

const ZONE = '11111111-1111-4111-8111-111111111111'
const HOUR = 60 * 60 * 1000

const body = {
  ticketTypeId: 'type-1',
  quantity: 1,
  email: 'runner@example.com',
  phone: '254712345678',
  attendeeName: 'Runner One',
  termsAccepted: true,
  zoneId: ZONE,
}

const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as any

function mockDb(opts: { early: boolean; createdHoursAgo: number; member: boolean; perk?: 'on' | 'coming_soon' }) {
  vi.mocked(getClient).mockResolvedValue({ query, release: vi.fn() } as any)
  vi.mocked(query).mockImplementation((async (sql: string) => {
    if (sql.includes('FROM regions')) return { rows: [{ id: ZONE, name: 'Nairobi', code: 'NRB' }] }
    if (sql.includes('FROM member_perks')) return { rows: [{ status: opts.perk ?? 'on', settings: { hours: 48 } }] }
    if (sql.includes('member_until > NOW()')) return { rows: [{ active: opts.member }] }
    if (sql.includes('SELECT id FROM users')) return { rows: [{ id: 'user-1' }] }
    if (sql.includes('FROM events')) {
      return {
        rows: [
          {
            id: 'ev-1',
            title: 'Hike',
            event_date: '2026-12-01',
            member_early_booking: opts.early,
            created_at: new Date(Date.now() - opts.createdHoursAgo * HOUR),
          },
        ],
      }
    }
    if (sql.includes('FROM event_ticket_types')) {
      return { rows: [{ id: 'type-1', event_id: 'ev-1', name: 'GA', price: 500, capacity: null, is_active: true }] }
    }
    if (sql.includes('INSERT INTO tickets')) return { rows: [{ id: 'ticket-1' }] }
    return { rows: [] }
  }) as any)
}

const buy = async () => {
  const res = makeRes()
  await buyTicket({ params: { eventId: 'ev-1' }, body, user: { id: 'user-1' } } as any, res)
  return res
}

beforeEach(() => vi.clearAllMocks())

describe('earlyUntil', () => {
  it('counts the window from when the event was created', () => {
    const created = new Date('2026-11-10T09:00:00Z')
    expect(earlyUntil({ member_early_booking: true, created_at: created }, 48)?.toISOString()).toBe('2026-11-12T09:00:00.000Z')
    expect(earlyUntil({ member_early_booking: false, created_at: created }, 48)).toBeNull()
    expect(earlyWindowOpen({ member_early_booking: true, created_at: created }, 48, new Date('2026-11-12T08:59:00Z'))).toBe(true)
    expect(earlyWindowOpen({ member_early_booking: true, created_at: created }, 48, new Date('2026-11-12T09:00:00Z'))).toBe(false)
  })
})

describe('buyTicket early booking', () => {
  it('rejects a non-member inside the window', async () => {
    mockDb({ early: true, createdHoursAgo: 10, member: false })
    const res = await buy()
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json.mock.calls[0][0].error).toMatch(/^Members book first/)
  })

  it('lets a member book inside the window', async () => {
    mockDb({ early: true, createdHoursAgo: 10, member: true })
    const res = await buy()
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('opens to everyone after the window', async () => {
    mockDb({ early: true, createdHoursAgo: 49, member: false })
    const res = await buy()
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('does not restrict when the event switch is off', async () => {
    mockDb({ early: false, createdHoursAgo: 1, member: false })
    const res = await buy()
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('does not restrict when the perk is off', async () => {
    mockDb({ early: true, createdHoursAgo: 1, member: false, perk: 'coming_soon' })
    const res = await buy()
    expect(res.status).toHaveBeenCalledWith(201)
  })
})
