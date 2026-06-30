import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getOrders } from '../../controllers/ordersController.js'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
}))

import { query } from '../../config/db.js'

describe('getOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns orders with line items including product names', async () => {
    const order = {
      id: 'order-1',
      total_amount: 100,
      payment_status: 'paid',
      created_at: '2026-01-01',
    }
    const items = [
      {
        product_id: 'prod-1',
        product_name: 'Jersey',
        quantity: 2,
        unit_price: 50,
      },
    ]

    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [order] } as any)
      .mockResolvedValueOnce({ rows: items } as any)

    const req = {} as any
    const res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as any

    await getOrders(req, res)

    expect(res.json).toHaveBeenCalledWith([{ ...order, items }])
  })
})
