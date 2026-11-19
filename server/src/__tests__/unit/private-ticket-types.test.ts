import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))

vi.mock('../../config/env.js', () => ({
  config: {
    frontendUrl: 'https://example.com/',
  },
}))

import { query, getClient } from '../../config/db.js'
import { buyTicket } from '../../controllers/ticketsController.js'
import {
  getPrivateTicketTypeByToken,
  regeneratePrivateTicketLink,
} from '../../controllers/eventsController.js'
import {
  attachTicketTypesToEvents,
  getEventTicketTypes,
} from '../../utils/eventTicketTypes.js'
import { buildPrivateTicketUrl, generatePrivateToken } from '../../utils/privateTicketLinks.js'

const ZONE = '11111111-1111-4111-8111-111111111111'
const TOKEN = 'private-token-abc'

const baseBody = {
  ticketTypeId: 'type-1',
  quantity: 1,
  email: 'runner@example.com',
  phone: '254712345678',
  attendeeName: 'Runner One',
  termsAccepted: true,
  zoneId: ZONE,
}

const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as any

function mockBuyDb(opts: {
  isPrivate?: boolean
  membersOnly?: boolean
  member?: boolean
  privateToken?: string | null
}) {
  const {
    isPrivate = true,
    membersOnly = false,
    member = true,
    privateToken = TOKEN,
  } = opts
  vi.mocked(getClient).mockResolvedValue({ query, release: vi.fn() } as any)
  vi.mocked(query).mockImplementation((async (sql: string) => {
    if (sql.includes('FROM regions')) return { rows: [{ id: ZONE, name: 'Nairobi', code: 'NRB' }] }
    if (sql.includes('member_until > NOW()')) return { rows: [{ active: member }] }
    if (sql.includes('SELECT id FROM users')) return { rows: [{ id: 'user-1' }] }
    if (sql.includes('FROM events')) {
      return { rows: [{ id: 'ev-1', title: 'Fit Fest', event_date: '2026-12-01', cancelled_at: null }] }
    }
    if (sql.includes('FROM event_ticket_types')) {
      return {
        rows: [
          {
            id: 'type-1',
            event_id: 'ev-1',
            name: 'Invite only',
            price: 1500,
            capacity: null,
            is_active: true,
            members_only: membersOnly,
            is_private: isPrivate,
            private_token: privateToken,
          },
        ],
      }
    }
    if (sql.includes('INSERT INTO tickets')) return { rows: [{ id: 'ticket-1' }] }
    return { rows: [] }
  }) as any)
}

beforeEach(() => vi.clearAllMocks())

describe('private ticket link helpers', () => {
  it('builds a stable /t/:token URL', () => {
    expect(buildPrivateTicketUrl('abc123')).toBe('https://example.com/t/abc123')
  })

  it('generates unguessable tokens', () => {
    const a = generatePrivateToken()
    const b = generatePrivateToken()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThan(10)
  })
})

describe('public listing hides private types', () => {
  it('filters private types out of public queries', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as any)
    await getEventTicketTypes('e', true)
    const sql = String(vi.mocked(query).mock.calls[0][0])
    expect(sql).toContain('ett.is_private = false')
  })

  it('includes private types with private_url for admin', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [
        {
          id: 't',
          event_id: 'e',
          name: 'VIP invite',
          price: '5000',
          capacity: null,
          sort_order: 0,
          is_active: true,
          members_only: false,
          is_private: true,
          private_token: TOKEN,
          sold_count: 0,
        },
      ],
    } as any)
    const [type] = await getEventTicketTypes('e', false)
    expect(type.is_private).toBe(true)
    expect(type.private_url).toBe(`https://example.com/t/${TOKEN}`)
  })

  it('excludes private types from public min_price', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [
        {
          id: 'public',
          event_id: 'e',
          name: 'General',
          price: '1000',
          capacity: null,
          sort_order: 0,
          is_active: true,
          members_only: false,
          is_private: false,
          private_token: null,
          sold_count: 0,
        },
        {
          id: 'priv',
          event_id: 'e',
          name: 'VIP',
          price: '100',
          capacity: null,
          sort_order: 1,
          is_active: true,
          members_only: false,
          is_private: true,
          private_token: TOKEN,
          sold_count: 0,
        },
      ],
    } as any)
    const [event] = await attachTicketTypesToEvents([{ id: 'e' }], false)
    expect(event.min_price).toBe(1000)
    expect(event.ticket_types).toHaveLength(2)
  })
})

describe('buyTicket private gate', () => {
  it('refuses a private type without a token', async () => {
    mockBuyDb({})
    const res = makeRes()
    await buyTicket({ params: { eventId: 'ev-1' }, body: baseBody, user: { id: 'user-1' } } as any, res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'This ticket is only available via its private link' })
    )
  })

  it('refuses a private type with the wrong token', async () => {
    mockBuyDb({})
    const res = makeRes()
    await buyTicket(
      {
        params: { eventId: 'ev-1' },
        body: { ...baseBody, privateToken: 'wrong' },
        user: { id: 'user-1' },
      } as any,
      res
    )
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('allows a private type with the correct token', async () => {
    mockBuyDb({})
    const res = makeRes()
    await buyTicket(
      {
        params: { eventId: 'ev-1' },
        body: { ...baseBody, privateToken: TOKEN },
        user: { id: 'user-1' },
      } as any,
      res
    )
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('still requires membership when private and members_only', async () => {
    mockBuyDb({ membersOnly: true, member: false })
    const res = makeRes()
    await buyTicket(
      {
        params: { eventId: 'ev-1' },
        body: { ...baseBody, privateToken: TOKEN },
        user: { id: 'user-1' },
      } as any,
      res
    )
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'This ticket is for TRFC members. Become a member to book it.' })
    )
  })
})

describe('resolve private ticket by token', () => {
  it('returns 404 for unknown or inactive tokens', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as any)
    const res = makeRes()
    await getPrivateTicketTypeByToken({ params: { token: 'missing' }, user: null } as any, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('returns the event with the private type for a valid token', async () => {
    vi.mocked(query).mockImplementation((async (sql: string) => {
      if (sql.includes('FROM event_ticket_types') && sql.includes('private_token')) {
        return {
          rows: [
            {
              id: 'type-1',
              event_id: 'ev-1',
              name: 'Invite',
              description: null,
              price: 2000,
              capacity: 10,
              sort_order: 0,
              is_active: true,
              members_only: false,
              is_private: true,
              sold_count: 1,
            },
          ],
        }
      }
      if (sql.includes('FROM events')) {
        return {
          rows: [
            {
              id: 'ev-1',
              title: 'Fit Fest',
              event_date: '2026-12-01',
              cancelled_at: null,
              payment_deadline_days: null,
              member_early_booking: false,
            },
          ],
        }
      }
      if (sql.includes('member_until')) return { rows: [{ active: false }] }
      return { rows: [] }
    }) as any)

    const res = makeRes()
    await getPrivateTicketTypeByToken({ params: { token: TOKEN }, user: null } as any, res)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'ev-1',
        ticket_types: [
          expect.objectContaining({
            id: 'type-1',
            is_private: true,
            remaining: 9,
          }),
        ],
        viewer_is_member: false,
      })
    )
  })
})

describe('regenerate private link', () => {
  it('rejects non-private types', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [{ id: 'type-1', is_private: false }],
    } as any)
    const res = makeRes()
    await regeneratePrivateTicketLink(
      { params: { eventId: 'ev-1', typeId: 'type-1' } } as any,
      res
    )
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('writes a new token for private types', async () => {
    let updatedToken: string | null = null
    vi.mocked(query).mockImplementation((async (sql: string, params?: unknown[]) => {
      if (sql.includes('SELECT id, is_private FROM event_ticket_types')) {
        return { rows: [{ id: 'type-1', is_private: true }] }
      }
      if (sql.includes('SET private_token')) {
        updatedToken = String(params?.[0])
        return { rows: [] }
      }
      if (sql.includes('FROM event_ticket_types ett')) {
        return {
          rows: [
            {
              id: 'type-1',
              event_id: 'ev-1',
              name: 'Invite',
              price: '1500',
              capacity: null,
              sort_order: 0,
              is_active: true,
              members_only: false,
              is_private: true,
              private_token: updatedToken,
              sold_count: 0,
            },
          ],
        }
      }
      return { rows: [] }
    }) as any)

    const res = makeRes()
    await regeneratePrivateTicketLink(
      { params: { eventId: 'ev-1', typeId: 'type-1' } } as any,
      res
    )
    expect(updatedToken).toBeTruthy()
    expect(updatedToken).not.toBe(TOKEN)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'type-1',
        is_private: true,
        private_url: `https://example.com/t/${updatedToken}`,
      })
    )
  })
})
