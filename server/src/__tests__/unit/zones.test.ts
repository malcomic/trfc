import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))

vi.mock('../../utils/flashAccess.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/flashAccess.js')>()
  return { ...actual, resolveFlashAccess: vi.fn() }
})

import { query, getClient } from '../../config/db.js'
import { findEligibleTicket, resolveFlashAccess } from '../../utils/flashAccess.js'
import { parseZoneIds, productInZoneSql, findActiveZone } from '../../utils/zones.js'
import { buyTicket } from '../../controllers/ticketsController.js'
import { getLiveFlashSales } from '../../controllers/flashSalesController.js'
import { createOrder } from '../../controllers/ordersController.js'

const ZONE_A = '11111111-1111-4111-8111-111111111111'
const ZONE_B = '22222222-2222-4222-8222-222222222222'

type Handler = (sql: string, params: any[]) => { rows: any[] } | undefined

function routeQueries(handler: Handler) {
  vi.mocked(query).mockImplementation((async (sql: string, params: any[] = []) => handler(sql, params) ?? { rows: [] }) as any)
}

const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as any

beforeEach(() => {
  vi.clearAllMocks()
})

describe('productInZoneSql', () => {
  it('lets products without zones through, and zoned products only for a matching non-null zone', () => {
    const sql = productInZoneSql('p', '$1')
    expect(sql).toContain('NOT EXISTS (SELECT 1 FROM product_zones pz WHERE pz.product_id = p.id)')
    expect(sql).toContain('$1::uuid IS NOT NULL AND EXISTS')
    expect(sql).toContain('pz.zone_id = $1::uuid')
  })
})

describe('parseZoneIds', () => {
  it('keeps current zones when the field is missing and clears them for an empty list', async () => {
    expect(await parseZoneIds(undefined)).toBeUndefined()
    expect(await parseZoneIds([])).toEqual([])
    expect(await parseZoneIds(null)).toEqual([])
    expect(query).not.toHaveBeenCalled()
  })

  it('deduplicates and accepts active zones', async () => {
    routeQueries(() => ({ rows: [{ id: ZONE_A }, { id: ZONE_B }] }))
    expect(await parseZoneIds([ZONE_A, ZONE_B, ZONE_A])).toEqual([ZONE_A, ZONE_B])
  })

  it('rejects malformed ids and inactive or missing zones', async () => {
    await expect(parseZoneIds('nairobi')).rejects.toThrow('Zones must be a list')
    await expect(parseZoneIds(['not-a-uuid'])).rejects.toThrow('Invalid zone selected')

    routeQueries(() => ({ rows: [{ id: ZONE_A }] }))
    await expect(parseZoneIds([ZONE_A, ZONE_B])).rejects.toThrow('inactive or missing')
  })

  it('findActiveZone ignores non-uuid input without querying', async () => {
    expect(await findActiveZone('nairobi')).toBeNull()
    expect(await findActiveZone(undefined)).toBeNull()
    expect(query).not.toHaveBeenCalled()
  })
})

describe('buyTicket zone', () => {
  const body = {
    ticketTypeId: 'type-1',
    quantity: 2,
    email: 'runner@example.com',
    phone: '254712345678',
    attendeeName: 'Runner One',
  }

  function mockTicketDb(zoneActive: boolean) {
    routeQueries((sql) => {
      if (sql.includes('FROM regions')) return { rows: zoneActive ? [{ id: ZONE_A, name: 'Nairobi', code: 'NRB' }] : [] }
      if (sql.includes('FROM events')) return { rows: [{ id: 'ev-1', title: 'Run', event_date: '2026-11-01' }] }
      if (sql.includes('FROM event_ticket_types')) {
        return { rows: [{ id: 'type-1', event_id: 'ev-1', name: 'GA', price: 500, capacity: null, is_active: true }] }
      }
      if (sql.includes('INSERT INTO tickets')) return { rows: [{ id: `ticket-${Math.random()}` }] }
      return undefined
    })
  }

  it('requires a zone', async () => {
    mockTicketDb(true)
    const res = makeRes()
    await buyTicket({ params: { eventId: 'ev-1' }, body } as any, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Please choose your zone' })
  })

  it('rejects an inactive zone', async () => {
    mockTicketDb(false)
    const res = makeRes()
    await buyTicket({ params: { eventId: 'ev-1' }, body: { ...body, zoneId: ZONE_A } } as any, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('stores the zone on every ticket in the batch', async () => {
    mockTicketDb(true)
    const res = makeRes()
    await buyTicket({ params: { eventId: 'ev-1' }, body: { ...body, zoneId: ZONE_A } } as any, res)

    const inserts = vi.mocked(query).mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO tickets'))
    expect(inserts).toHaveLength(2)
    for (const [, params] of inserts) expect((params as unknown[]).at(-1)).toBe(ZONE_A)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ zoneId: ZONE_A, zoneName: 'Nairobi' }))
  })
})

describe('flash access zone', () => {
  it("uses the zone of the buyer's most recent open ticket, even through an older ticket", async () => {
    routeQueries((sql) => {
      if (sql.includes('FROM tickets t1')) {
        expect(sql).toContain('ORDER BY t2.paid_at DESC')
        expect(sql).toContain('t2.user_id = t1.user_id')
        expect(sql).toContain('LOWER(t2.email) = LOWER(t1.email)')
        return { rows: [{ zone_id: ZONE_B, zone_name: 'Mombasa' }] }
      }
      if (sql.includes('FROM tickets')) return { rows: [{ id: 'old-ticket', expires_at: new Date(Date.now() + 3600_000) }] }
      return undefined
    })

    const access = await findEligibleTicket({ ticketId: 'old-ticket' })
    expect(access).toMatchObject({ ticketId: 'old-ticket', zoneId: ZONE_B, zoneName: 'Mombasa' })
  })

  it('has no zone when the latest ticket has none', async () => {
    routeQueries((sql) => {
      if (sql.includes('FROM tickets t1')) return { rows: [{ zone_id: null, zone_name: null }] }
      if (sql.includes('FROM tickets')) return { rows: [{ id: 't', expires_at: new Date(Date.now() + 3600_000) }] }
      return undefined
    })
    expect(await findEligibleTicket({ userId: 'u1' })).toMatchObject({ zoneId: null, zoneName: null })
  })
})

describe('getLiveFlashSales', () => {
  it('filters offers by the access zone and reports the zone', async () => {
    vi.mocked(resolveFlashAccess).mockResolvedValue({
      ticketId: 't1',
      expiresAt: new Date('2026-10-10T00:00:00Z'),
      zoneId: ZONE_A,
      zoneName: 'Nairobi',
    })
    routeQueries(() => ({ rows: [] }))
    const res = makeRes()

    await getLiveFlashSales({} as any, res)

    const [sql, params] = vi.mocked(query).mock.calls[0]
    expect(String(sql)).toContain('pz.zone_id = $1::uuid')
    expect(params).toEqual([ZONE_A])
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ zone: { id: ZONE_A, name: 'Nairobi' }, offers: [] }))
  })
})

describe('createOrder flash zone check', () => {
  const PRODUCT_ID = '33333333-3333-4333-8333-333333333333'
  const SALE_ID = '44444444-4444-4444-8444-444444444444'

  function mockOrderClient(inZone: boolean) {
    const client = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes('FROM products WHERE id')) {
          return { rows: [{ id: PRODUCT_ID, price: 2000, stock: 10, is_active: true, name: 'Jersey', distance_options: [] }] }
        }
        if (sql.includes('FROM product_variants')) return { rows: [] }
        if (sql.includes('FROM flash_sales fs') && sql.includes('FOR UPDATE')) {
          return {
            rows: [{ id: SALE_ID, product_id: PRODUCT_ID, sale_price: 1000, quantity_limit: null, is_live: true, in_zone: inZone }],
          }
        }
        return { rows: [{ id: 'order-1' }] }
      }),
      release: vi.fn(),
    }
    vi.mocked(getClient).mockResolvedValue(client as any)
    return client
  }

  const orderReq = {
    body: {
      phone: '254712345678',
      email: 'runner@example.com',
      delivery_address: 'Nairobi',
      total_amount: 1000,
      items: [{ product_id: PRODUCT_ID, quantity: 1, unit_price: 1000, flash_sale_id: SALE_ID }],
    },
  } as any

  beforeEach(() => {
    vi.mocked(resolveFlashAccess).mockResolvedValue({
      ticketId: 't1',
      expiresAt: new Date(Date.now() + 3600_000),
      zoneId: ZONE_A,
      zoneName: 'Nairobi',
    })
  })

  it('rejects a flash deal that is not available in the buyer zone', async () => {
    const client = mockOrderClient(false)
    const res = makeRes()

    await createOrder(orderReq, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'The flash deal for Jersey is not available in your zone' })
    const lockCall = client.query.mock.calls.find(([sql]) => String(sql).includes('FOR UPDATE OF fs'))!
    expect(lockCall[1]).toEqual([SALE_ID, ZONE_A])
    expect(client.query).toHaveBeenCalledWith('ROLLBACK')
  })

  it('accepts a flash deal visible in the buyer zone', async () => {
    mockOrderClient(true)
    const res = makeRes()

    await createOrder(orderReq, res)

    expect(res.status).not.toHaveBeenCalledWith(403)
  })
})
