import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))

import { query, getClient } from '../../config/db.js'
import {
  ProductOptionsError,
  parseDistanceOptions,
  parseVariantsInput,
  resolveSelectedOptions,
} from '../../utils/productVariants.js'
import { decrementOrderStock } from '../../utils/orderStock.js'
import { createOrder } from '../../controllers/ordersController.js'

const VARIANTS = [
  { id: 'v-m', size: 'M', stock: 3 },
  { id: 'v-l', size: 'L', stock: 0 },
]

describe('resolveSelectedOptions', () => {
  it('passes through products without sizes or distances', () => {
    expect(resolveSelectedOptions('Bottle', [], [], {})).toEqual({ variant: null, distance: null })
  })

  it('requires a size when the product has sizes', () => {
    expect(() => resolveSelectedOptions('Tee', VARIANTS, [], {})).toThrow('Please choose a size for Tee')
  })

  it('rejects a size from another product', () => {
    expect(() => resolveSelectedOptions('Tee', VARIANTS, [], { variant_id: 'other' })).toThrow(
      'no longer available'
    )
  })

  it('rejects a size for a product without sizes', () => {
    expect(() => resolveSelectedOptions('Bottle', [], [], { variant_id: 'v-m' })).toThrow(
      'does not come in sizes'
    )
  })

  it('requires a listed distance and returns its canonical spelling', () => {
    expect(() => resolveSelectedOptions('Tee', [], ['5K', '10K'], {})).toThrow('choose a distance')
    expect(() => resolveSelectedOptions('Tee', [], ['5K', '10K'], { distance: '21K' })).toThrow(
      'not available'
    )
    expect(resolveSelectedOptions('Tee', VARIANTS, ['5K', '10K'], { variant_id: 'v-m', distance: '10k' })).toEqual({
      variant: VARIANTS[0],
      distance: '10K',
    })
  })
})

describe('parseVariantsInput / parseDistanceOptions', () => {
  it('returns null when variants were not sent', () => {
    expect(parseVariantsInput(undefined)).toBeNull()
  })

  it('trims sizes and assigns sort order', () => {
    expect(parseVariantsInput([{ size: ' S ', stock: 2 }, { size: 'M', stock: '0' }])).toEqual([
      { size: 'S', stock: 2, sort_order: 0 },
      { size: 'M', stock: 0, sort_order: 1 },
    ])
  })

  it('rejects duplicate sizes and invalid stock', () => {
    expect(() => parseVariantsInput([{ size: 'M', stock: 1 }, { size: 'm', stock: 1 }])).toThrow(ProductOptionsError)
    expect(() => parseVariantsInput([{ size: 'M', stock: -1 }])).toThrow(ProductOptionsError)
    expect(() => parseVariantsInput([{ size: 'M', stock: 1.5 }])).toThrow(ProductOptionsError)
  })

  it('dedupes distances and drops blanks', () => {
    expect(parseDistanceOptions(['5K', ' ', '5k', '10K'])).toEqual(['5K', '10K'])
  })
})

describe('decrementOrderStock', () => {
  beforeEach(() => vi.clearAllMocks())

  it('decrements the size row for sized lines and the product for others, then syncs totals', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [{ id: 'order-1' }] } as any)
      .mockResolvedValueOnce({
        rows: [
          { product_id: 'tee', variant_id: 'v-m', quantity: 2 },
          { product_id: 'bottle', variant_id: null, quantity: 1 },
        ],
      } as any)
      .mockResolvedValue({ rows: [] } as any)

    await decrementOrderStock('order-1')

    const calls = vi.mocked(query).mock.calls.map(([sql, params]) => [String(sql).replace(/\s+/g, ' ').trim(), params])
    expect(calls[2]).toEqual(['UPDATE product_variants SET stock = GREATEST(0, stock - $1) WHERE id = $2', [2, 'v-m']])
    expect(calls[3]).toEqual(['UPDATE products SET stock = GREATEST(0, stock - $1) WHERE id = $2', [1, 'bottle']])
    expect(calls[4][0]).toContain('UPDATE products p SET stock = totals.total')
    expect(calls[4][1]).toEqual(['tee'])
    expect(calls).toHaveLength(5)
  })

  it('does nothing when the order was already claimed', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rows: [] } as any)
    await decrementOrderStock('order-1')
    expect(query).toHaveBeenCalledTimes(1)
  })
})

describe('createOrder size and distance validation', () => {
  const products: Record<string, any> = {
    tee: { id: 'tee', price: 1000, stock: 3, is_active: true, name: 'Tee', distance_options: ['5K', '10K'] },
    bottle: { id: 'bottle', price: 500, stock: 10, is_active: true, name: 'Bottle', distance_options: [] },
  }
  const variants: Record<string, any[]> = {
    tee: [{ id: 'v-m', size: 'M', stock: 3 }],
    bottle: [],
  }
  let inserted: any[][]

  function mockClient() {
    inserted = []
    const client = {
      query: vi.fn(async (sql: string, params: any[] = []) => {
        if (sql.includes('FROM products WHERE id')) return { rows: products[params[0]] ? [products[params[0]]] : [] }
        if (sql.includes('FROM product_variants')) return { rows: variants[params[0]] ?? [] }
        if (sql.includes('INSERT INTO orders')) return { rows: [{ id: 'order-1' }] }
        if (sql.includes('INSERT INTO order_items')) inserted.push(params)
        return { rows: [] }
      }),
      release: vi.fn(),
    }
    vi.mocked(getClient).mockResolvedValue(client as any)
    return client
  }

  function run(items: any[], total: number) {
    const req = { body: { items, total_amount: total, phone: '0712345678', email: 'a@b.co' } } as any
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any
    return createOrder(req, res).then(() => res)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockClient()
  })

  it('rejects a sized product without a size', async () => {
    const res = await run([{ product_id: 'tee', quantity: 1, unit_price: 1000, distance: '5K' }], 1000)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Please choose a size for Tee' })
  })

  it('rejects a missing distance', async () => {
    const res = await run([{ product_id: 'tee', quantity: 1, unit_price: 1000, variant_id: 'v-m' }], 1000)
    expect(res.json).toHaveBeenCalledWith({ error: 'Please choose a distance for Tee' })
  })

  it('checks size stock across lines', async () => {
    const res = await run(
      [
        { product_id: 'tee', quantity: 2, unit_price: 1000, variant_id: 'v-m', distance: '5K' },
        { product_id: 'tee', quantity: 2, unit_price: 1000, variant_id: 'v-m', distance: '10K' },
      ],
      4000
    )
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Only 3 left in size M for Tee' })
  })

  it('saves size and distance on the order line, and leaves plain products unchanged', async () => {
    const res = await run(
      [
        { product_id: 'tee', quantity: 1, unit_price: 1000, variant_id: 'v-m', distance: '10K' },
        { product_id: 'bottle', quantity: 2, unit_price: 500 },
      ],
      2000
    )
    expect(res.status).toHaveBeenCalledWith(201)
    expect(inserted).toEqual([
      ['order-1', 'tee', 1, 1000, null, 'v-m', 'M', '10K'],
      ['order-1', 'bottle', 2, 500, null, null, null, null],
    ])
  })
})
