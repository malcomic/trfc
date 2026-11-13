import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))
vi.mock('../../utils/flashAccess.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/flashAccess.js')>()
  return { ...actual, resolveFlashAccess: vi.fn().mockResolvedValue({ zoneId: null, guest: null }) }
})

import { query, getClient } from '../../config/db.js'
import { createOrder } from '../../controllers/ordersController.js'
import { memberDiscountFor, shopDiscountStatus } from '../../utils/memberShopDiscount.js'

const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as any

const PRODUCTS: Record<string, any> = {
  jersey: { id: 'jersey', price: 1500, stock: 10, is_active: true, name: 'Jersey', distance_options: [], member_discount_eligible: true },
  cap: { id: 'cap', price: 200, stock: 10, is_active: true, name: 'Cap', distance_options: [], member_discount_eligible: true },
  bottle: { id: 'bottle', price: 800, stock: 10, is_active: true, name: 'Bottle', distance_options: [], member_discount_eligible: false },
}

const calls: { sql: string; params: unknown[] }[] = []

function mockDb(opts: { period?: boolean; usedOrder?: string | null; perk?: 'on' | 'coming_soon' } = {}) {
  calls.length = 0
  const handler = async (sql: string, params: unknown[] = []) => {
    calls.push({ sql, params })
    if (sql.includes('FROM member_perks')) return { rows: [{ status: opts.perk ?? 'on', settings: { amount: 300 } }] }
    if (sql.includes('FROM memberships')) {
      return { rows: opts.period === false ? [] : [{ id: 'year-1', starts_at: '2026-01-01', ends_at: '2027-01-01' }] }
    }
    if (sql.includes('WHERE member_discount_membership_id')) return { rows: opts.usedOrder ? [{ id: opts.usedOrder }] : [] }
    if (sql.includes('FROM products p')) return { rows: [PRODUCTS[String(params[0])]] }
    if (sql.includes('FROM product_variants')) return { rows: [] }
    if (sql.includes('FROM flash_sales fs') && sql.includes('FOR UPDATE')) {
      return { rows: [{ product_id: 'jersey', sale_price: 1000, is_live: true, in_zone: true, unlocked: true, quantity_limit: null }] }
    }
    if (sql.includes('INSERT INTO orders')) return { rows: [{ id: 'order-1' }] }
    return { rows: [] }
  }
  vi.mocked(query).mockImplementation(handler as any)
  vi.mocked(getClient).mockResolvedValue({ query: vi.fn(handler), release: vi.fn() } as any)
}

const order = (items: any[], total: number, extra: Record<string, unknown> = {}, userId: string | null = 'user-1') => {
  const res = makeRes()
  const req = {
    body: { items, total_amount: total, phone: '254712345678', email: 'a@example.com', delivery_address: 'Thika', ...extra },
    user: userId ? { id: userId } : undefined,
    headers: {},
  } as any
  return createOrder(req, res).then(() => res)
}

beforeEach(() => vi.clearAllMocks())

describe('memberDiscountFor', () => {
  it('never exceeds the eligible items', () => {
    expect(memberDiscountFor(1500, 300)).toBe(300)
    expect(memberDiscountFor(200, 300)).toBe(200)
    expect(memberDiscountFor(0, 300)).toBe(0)
  })
})

describe('shopDiscountStatus', () => {
  it('counts paid orders and recent pending orders as used', async () => {
    mockDb({ usedOrder: 'order-9' })
    const status = await shopDiscountStatus(undefined, 'user-1')
    expect(status).toEqual({ available: false, amount: 300, membershipId: 'year-1', usedOrderId: 'order-9' })
    const used = calls.find((c) => c.sql.includes('WHERE member_discount_membership_id'))!
    expect(used.sql).toContain("payment_status = 'paid'")
    expect(used.sql).toContain("payment_status = 'pending' AND created_at > NOW() - INTERVAL '15 minutes'")
  })

  it('is not available without a paid year or when the perk is off', async () => {
    mockDb({ period: false })
    expect((await shopDiscountStatus(undefined, 'user-1')).membershipId).toBeNull()
    mockDb({ perk: 'coming_soon' })
    expect(await shopDiscountStatus(undefined, 'user-1')).toMatchObject({ available: false, amount: 0 })
  })
})

describe('createOrder member discount', () => {
  it('takes KSh 300 off and records it against the membership year', async () => {
    mockDb()
    const res = await order(
      [
        { product_id: 'jersey', quantity: 1, unit_price: 1500 },
        { product_id: 'bottle', quantity: 1, unit_price: 800 },
      ],
      2000,
      { member_discount: true }
    )
    expect(res.status).toHaveBeenCalledWith(201)
    const insert = calls.find((c) => c.sql.includes('INSERT INTO orders'))!
    expect(insert.params[1]).toBe(2000)
    const saved = calls.find((c) => c.sql.includes('SET member_discount_amount'))!
    expect(saved.params).toEqual(['order-1', 300, 'year-1'])
    expect(calls.some((c) => c.sql.includes('FROM memberships') && c.sql.includes('FOR UPDATE'))).toBe(true)
  })

  it('caps the discount at the eligible items', async () => {
    mockDb()
    const res = await order(
      [
        { product_id: 'cap', quantity: 1, unit_price: 200 },
        { product_id: 'bottle', quantity: 1, unit_price: 800 },
      ],
      800,
      { member_discount: true }
    )
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('refuses a second use while an order holds it', async () => {
    mockDb({ usedOrder: 'order-0' })
    const res = await order([{ product_id: 'jersey', quantity: 1, unit_price: 1500 }], 1200, { member_discount: true })
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ error: 'You have already used your member discount this membership year' })
  })

  it('is available again once the earlier order failed', async () => {
    mockDb({ usedOrder: null })
    const res = await order([{ product_id: 'jersey', quantity: 1, unit_price: 1500 }], 1200, { member_discount: true })
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('does not count flash-priced lines', async () => {
    mockDb()
    const res = await order(
      [{ product_id: 'jersey', quantity: 1, unit_price: 1000, flash_sale_id: 'flash-1' }],
      700,
      { member_discount: true }
    )
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'None of these items have the member discount' })
  })

  it('rejects a total that skips the discount', async () => {
    mockDb()
    const res = await order([{ product_id: 'jersey', quantity: 1, unit_price: 1500 }], 1500, { member_discount: true })
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Order total must be KES 1200' })
  })

  it('needs a paid membership year', async () => {
    mockDb({ period: false })
    const res = await order([{ product_id: 'jersey', quantity: 1, unit_price: 1500 }], 1200, { member_discount: true })
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('leaves orders without the flag alone', async () => {
    mockDb()
    const res = await order([{ product_id: 'jersey', quantity: 1, unit_price: 1500 }], 1500)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(calls.some((c) => c.sql.includes('FROM memberships'))).toBe(false)
  })
})
