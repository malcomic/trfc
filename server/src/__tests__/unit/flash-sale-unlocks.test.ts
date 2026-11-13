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
import { findEligibleTicket, findGuestAccess, resolveFlashAccess } from '../../utils/flashAccess.js'
import {
  createFlashSale,
  flashSaleUnlockedSql,
  getLiveFlashSales,
  parseFlashSaleUnlocks,
} from '../../controllers/flashSalesController.js'
import { createOrder } from '../../controllers/ordersController.js'

const EVENT_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const EVENT_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const TYPE_VIP = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const TYPE_GA = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const PRODUCT_ID = '33333333-3333-4333-8333-333333333333'
const SALE_ID = '44444444-4444-4444-8444-444444444444'

type Handler = (sql: string, params: any[]) => { rows: any[] } | undefined

function routeQueries(handler: Handler) {
  vi.mocked(query).mockImplementation((async (sql: string, params: any[] = []) => handler(sql, params) ?? { rows: [] }) as any)
}

const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as any

interface Unlock {
  event_id: string
  ticket_type_id: string | null
}

/** Mirrors flashSaleUnlockedSql so each visibility rule can be checked without a database. */
function isUnlocked(unlocks: Unlock[], eventIds: string[], ticketTypeIds: string[]): boolean {
  if (unlocks.length === 0) return true
  return unlocks.some((u) =>
    u.ticket_type_id === null ? eventIds.includes(u.event_id) : ticketTypeIds.includes(u.ticket_type_id)
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('flashSaleUnlockedSql', () => {
  it('lets sales without unlocks through and matches whole-event rows by event, others by ticket type', () => {
    const sql = flashSaleUnlockedSql('fs', '$2', '$3')
    expect(sql).toContain('NOT EXISTS (SELECT 1 FROM flash_sale_unlocks u WHERE u.flash_sale_id = fs.id)')
    expect(sql).toContain('u.ticket_type_id IS NULL AND u.event_id = ANY($2::uuid[])')
    expect(sql).toContain('u.ticket_type_id = ANY($3::uuid[])')
  })
})

describe('unlock rules', () => {
  const openSale: Unlock[] = []
  const eventASale: Unlock[] = [{ event_id: EVENT_A, ticket_type_id: null }]
  const vipSale: Unlock[] = [{ event_id: EVENT_A, ticket_type_id: TYPE_VIP }]

  it('shows a sale with no unlocks to any ticket holder and to share-link guests', () => {
    expect(isUnlocked(openSale, [EVENT_B], [TYPE_GA])).toBe(true)
    expect(isUnlocked(openSale, [], [])).toBe(true)
  })

  it('shows an event-locked sale only to holders of that event', () => {
    expect(isUnlocked(eventASale, [EVENT_A], [TYPE_GA])).toBe(true)
    expect(isUnlocked(eventASale, [EVENT_B], [])).toBe(false)
  })

  it('hides a ticket-type-locked sale from other ticket types of the same event', () => {
    expect(isUnlocked(vipSale, [EVENT_A], [TYPE_GA])).toBe(false)
    expect(isUnlocked(vipSale, [EVENT_A], [TYPE_VIP])).toBe(true)
  })

  it('shows both events deals to a buyer holding tickets for both', () => {
    const eventBSale: Unlock[] = [{ event_id: EVENT_B, ticket_type_id: null }]
    expect(isUnlocked(eventASale, [EVENT_A, EVENT_B], [])).toBe(true)
    expect(isUnlocked(eventBSale, [EVENT_A, EVENT_B], [])).toBe(true)
  })

  it('never shows an event-locked sale to a share-link guest', () => {
    expect(isUnlocked(eventASale, [], [])).toBe(false)
    expect(isUnlocked(vipSale, [], [])).toBe(false)
  })
})

describe('buyer unlocks', () => {
  it('collects every event and ticket type from the buyer open tickets', async () => {
    routeQueries((sql) => {
      if (sql.includes('FROM tickets t1')) {
        expect(sql).toContain('t2.user_id = t1.user_id')
        expect(sql).toContain('AS event_ids')
        expect(sql).toContain('AS ticket_type_ids')
        return { rows: [{ zone_id: null, zone_name: null, event_ids: [EVENT_A, EVENT_B], ticket_type_ids: [TYPE_GA] }] }
      }
      if (sql.includes('FROM tickets')) return { rows: [{ id: 't1', expires_at: new Date(Date.now() + 3600_000) }] }
      return undefined
    })

    expect(await findEligibleTicket({ userId: 'u1' })).toMatchObject({
      ticketId: 't1',
      eventIds: [EVENT_A, EVENT_B],
      ticketTypeIds: [TYPE_GA],
    })
  })

  it('gives share-link guests no event unlocks', async () => {
    routeQueries(() => ({
      rows: [{ phone: '254712345678', email: 'g@x.com', expires_at: new Date(Date.now() + 3600_000), zone_id: null }],
    }))

    expect(await findGuestAccess('link-1', 'redemption-1')).toMatchObject({ eventIds: [], ticketTypeIds: [] })
  })
})

describe('getLiveFlashSales', () => {
  it('filters offers by the buyer events and ticket types', async () => {
    vi.mocked(resolveFlashAccess).mockResolvedValue({
      ticketId: 't1',
      expiresAt: new Date(Date.now() + 3600_000),
      zoneId: null,
      zoneName: null,
      eventIds: [EVENT_A],
      ticketTypeIds: [TYPE_VIP],
    })
    routeQueries(() => ({ rows: [] }))

    await getLiveFlashSales({} as any, makeRes())

    const [sql, params] = vi.mocked(query).mock.calls[0]
    expect(String(sql)).toContain(flashSaleUnlockedSql('fs', '$2', '$3'))
    expect(String(sql)).toContain('AS unlock_labels')
    expect(params).toEqual([null, [EVENT_A], [TYPE_VIP]])
  })
})

describe('createOrder unlock check', () => {
  function mockOrderClient(unlocked: boolean) {
    const client = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes('SELECT p.id, p.price, p.stock')) {
          return { rows: [{ id: PRODUCT_ID, price: 2000, stock: 10, is_active: true, name: 'Jersey', distance_options: [] }] }
        }
        if (sql.includes('FROM product_variants')) return { rows: [] }
        if (sql.includes('FROM flash_sales fs') && sql.includes('FOR UPDATE')) {
          return {
            rows: [
              { id: SALE_ID, product_id: PRODUCT_ID, sale_price: 1000, quantity_limit: null, is_live: true, in_zone: true, unlocked },
            ],
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
      zoneId: null,
      zoneName: null,
      eventIds: [EVENT_B],
      ticketTypeIds: [TYPE_GA],
    })
  })

  it('rejects a locked flash deal the buyer has no qualifying ticket for', async () => {
    const client = mockOrderClient(false)
    const res = makeRes()

    await createOrder(orderReq, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      error: 'The flash deal for Jersey is only for ticket holders of selected events',
    })
    const lockCall = client.query.mock.calls.find(([sql]) => String(sql).includes('FOR UPDATE OF fs'))!
    expect(lockCall[1]).toEqual([SALE_ID, null, [EVENT_B], [TYPE_GA]])
    expect(client.query).toHaveBeenCalledWith('ROLLBACK')
  })

  it('accepts a flash deal the buyer has unlocked', async () => {
    mockOrderClient(true)
    const res = makeRes()

    await createOrder(orderReq, res)

    expect(res.status).not.toHaveBeenCalledWith(403)
  })
})

describe('parseFlashSaleUnlocks', () => {
  it('keeps current unlocks when missing and clears them for null or an empty list', async () => {
    expect(await parseFlashSaleUnlocks(undefined)).toEqual({})
    expect(await parseFlashSaleUnlocks(null)).toEqual({ unlocks: [] })
    expect(await parseFlashSaleUnlocks([])).toEqual({ unlocks: [] })
    expect(query).not.toHaveBeenCalled()
  })

  it('rejects malformed input', async () => {
    expect(await parseFlashSaleUnlocks('event')).toEqual({ error: 'Unlocks must be a list' })
    expect(await parseFlashSaleUnlocks([{ event_id: 'nope' }])).toEqual({ error: 'Invalid event selected' })
    expect(await parseFlashSaleUnlocks([{ event_id: EVENT_A, ticket_type_id: 'nope' }])).toEqual({
      error: 'Invalid ticket type selected',
    })
  })

  it('rejects an unknown event', async () => {
    routeQueries((sql) => (sql.includes('FROM events') ? { rows: [{ id: EVENT_A }] } : undefined))
    expect(await parseFlashSaleUnlocks([{ event_id: EVENT_A }, { event_id: EVENT_B }])).toEqual({
      error: 'Event not found',
    })
  })

  it('rejects a ticket type that belongs to another event', async () => {
    routeQueries((sql) => {
      if (sql.includes('FROM events')) return { rows: [{ id: EVENT_A }] }
      if (sql.includes('FROM event_ticket_types')) return { rows: [{ id: TYPE_VIP, event_id: EVENT_B }] }
      return undefined
    })
    expect(await parseFlashSaleUnlocks([{ event_id: EVENT_A, ticket_type_id: TYPE_VIP }])).toEqual({
      error: 'Ticket type does not belong to the selected event',
    })
  })

  it('removes duplicates and drops ticket types of events selected as a whole', async () => {
    routeQueries((sql) => {
      if (sql.includes('FROM events')) return { rows: [{ id: EVENT_A }, { id: EVENT_B }] }
      if (sql.includes('FROM event_ticket_types')) return { rows: [{ id: TYPE_GA, event_id: EVENT_B }] }
      return undefined
    })

    const result = await parseFlashSaleUnlocks([
      { event_id: EVENT_A },
      { event_id: EVENT_A, ticket_type_id: TYPE_VIP },
      { event_id: EVENT_A, ticket_type_id: null },
      { event_id: EVENT_B, ticket_type_id: TYPE_GA },
      { event_id: EVENT_B, ticket_type_id: TYPE_GA },
    ])

    expect(result).toEqual({
      unlocks: [
        { event_id: EVENT_A, ticket_type_id: null },
        { event_id: EVENT_B, ticket_type_id: TYPE_GA },
      ],
    })
  })
})

describe('createFlashSale unlocks', () => {
  it('saves the sale and its unlocks in one transaction', async () => {
    routeQueries((sql) => {
      if (sql.includes('SELECT price FROM products')) return { rows: [{ price: 2000 }] }
      if (sql.includes('FROM events')) return { rows: [{ id: EVENT_A }] }
      return undefined
    })
    const client = {
      query: vi.fn(async (sql: string) =>
        sql.includes('INSERT INTO flash_sales') ? { rows: [{ id: SALE_ID }] } : { rows: [] }
      ),
      release: vi.fn(),
    }
    vi.mocked(getClient).mockResolvedValue(client as any)
    const res = makeRes()

    await createFlashSale(
      { body: { product_id: PRODUCT_ID, sale_price: 1000, unlocks: [{ event_id: EVENT_A, ticket_type_id: null }] } } as any,
      res
    )

    expect(res.status).toHaveBeenCalledWith(201)
    const statements = client.query.mock.calls.map(([sql]) => String(sql).trim().split(/\s+/).slice(0, 3).join(' '))
    expect(statements).toEqual([
      'BEGIN',
      'INSERT INTO flash_sales',
      'DELETE FROM flash_sale_unlocks',
      'INSERT INTO flash_sale_unlocks',
      'COMMIT',
    ])
    const insertUnlocks = client.query.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO flash_sale_unlocks'))!
    expect(insertUnlocks[1]).toEqual([SALE_ID, [EVENT_A], [null]])
    expect(client.release).toHaveBeenCalled()
  })

  it('rejects invalid unlocks before touching the database', async () => {
    routeQueries((sql) => (sql.includes('SELECT price FROM products') ? { rows: [{ price: 2000 }] } : undefined))
    const res = makeRes()

    await createFlashSale({ body: { product_id: PRODUCT_ID, sale_price: 1000, unlocks: [{ event_id: 'x' }] } } as any, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid event selected' })
    expect(getClient).not.toHaveBeenCalled()
  })
})
