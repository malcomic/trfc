import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))

import { query, getClient } from '../../config/db.js'
import { buyTicket } from '../../controllers/ticketsController.js'
import { getEventTicketTypes } from '../../utils/eventTicketTypes.js'

const ZONE = '11111111-1111-4111-8111-111111111111'

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

function mockDb(member: boolean) {
  vi.mocked(getClient).mockResolvedValue({ query, release: vi.fn() } as any)
  vi.mocked(query).mockImplementation((async (sql: string) => {
    if (sql.includes('FROM regions')) return { rows: [{ id: ZONE, name: 'Nairobi', code: 'NRB' }] }
    if (sql.includes('member_until > NOW()')) return { rows: [{ active: member }] }
    if (sql.includes('SELECT id FROM users')) return { rows: [{ id: 'user-1' }] }
    if (sql.includes('FROM events')) return { rows: [{ id: 'ev-1', title: 'Fit Fest', event_date: '2026-12-01' }] }
    if (sql.includes('FROM event_ticket_types')) {
      return {
        rows: [{ id: 'type-1', event_id: 'ev-1', name: 'Member early bird', price: 1000, capacity: null, is_active: true, members_only: true }],
      }
    }
    if (sql.includes('INSERT INTO tickets')) return { rows: [{ id: 'ticket-1' }] }
    return { rows: [] }
  }) as any)
}

beforeEach(() => vi.clearAllMocks())

describe('members-only ticket types', () => {
  it('refuses a non-member', async () => {
    mockDb(false)
    const res = makeRes()
    await buyTicket({ params: { eventId: 'ev-1' }, body, user: { id: 'user-1' } } as any, res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'This ticket is for TRFC members. Become a member to book it.' })
    )
    expect(vi.mocked(query).mock.calls.some(([sql]) => String(sql).includes('INSERT INTO tickets'))).toBe(false)
  })

  it('refuses a guest checkout', async () => {
    mockDb(true)
    const res = makeRes()
    await buyTicket({ params: { eventId: 'ev-1' }, body } as any, res)
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('lets a member buy', async () => {
    mockDb(true)
    const res = makeRes()
    await buyTicket({ params: { eventId: 'ev-1' }, body, user: { id: 'user-1' } } as any, res)
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('returns members_only on ticket types', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [{ id: 't', event_id: 'e', name: 'VIP', price: '100', capacity: null, sort_order: 0, is_active: true, members_only: true, sold_count: 0 }],
    } as any)
    const [type] = await getEventTicketTypes('e')
    expect(type.members_only).toBe(true)
    expect(String(vi.mocked(query).mock.calls[0][0])).toContain('ett.members_only')
  })
})
