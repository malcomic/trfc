import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/env.js', () => ({
  config: {
    jwtSecret: 'test-secret',
    frontendUrl: 'https://trfc.example.com/',
    contact: { email: 'support@example.com', phone: '+254 700 000000' },
  },
}))
vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))

import { query } from '../../config/db.js'
import {
  parseScanPayload,
  receiptVerifyUrl,
  signReceipt,
  verifyReceiptSignature,
} from '../../utils/qrCodeGenerator.js'
import { downloadOrderReceipt, verifyOrderReceipt } from '../../controllers/ordersController.js'
import { admitScan, lookupScan } from '../../controllers/scanController.js'

const ORDER_ID = '3f2b8c1e-4d5a-4b6c-9d7e-8f9a0b1c2d3e'

function baseOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID,
    user_id: null,
    email: 'jane@example.com',
    phone: '254712345678',
    delivery_address: 'Roysambu, Nairobi',
    delivery_date: '2026-11-18',
    total_amount: 2100,
    member_discount_amount: 300,
    payment_status: 'paid',
    mpesa_receipt: 'QX12345678',
    created_at: '2026-11-11T10:00:00Z',
    collected_at: null,
    ...overrides,
  }
}

const ITEMS = [
  { name: 'Club Tee', quantity: 2, unit_price: 1200, flash_sale_id: null, size: 'M', distance: null },
]

function mockOrderQueries(order: Record<string, unknown> | null) {
  vi.mocked(query).mockImplementation((async (sql: string) => {
    if (sql.includes('FROM order_items')) return { rows: order ? ITEMS : [] }
    if (sql.includes('FROM orders')) return { rows: order ? [order] : [] }
    return { rows: [] }
  }) as any)
}

function mockRes() {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  res.send = vi.fn().mockReturnValue(res)
  res.setHeader = vi.fn()
  return res
}

describe('receipt signatures', () => {
  it('round-trips and rejects tampering', () => {
    const sig = signReceipt(ORDER_ID)
    expect(sig).toMatch(/^[0-9a-f]{16}$/)
    expect(verifyReceiptSignature(ORDER_ID, sig)).toBe(true)
    expect(verifyReceiptSignature(ORDER_ID, sig.toUpperCase())).toBe(true)
    expect(verifyReceiptSignature(ORDER_ID, `${sig.slice(0, -1)}${sig.endsWith('0') ? '1' : '0'}`)).toBe(false)
    expect(verifyReceiptSignature('aaaaaaaa-0000-4000-8000-000000000000', sig)).toBe(false)
    expect(verifyReceiptSignature(ORDER_ID, undefined)).toBe(false)
    expect(verifyReceiptSignature(ORDER_ID, 'short')).toBe(false)
  })

  it('builds the verify URL on the frontend without a double slash', () => {
    expect(receiptVerifyUrl(ORDER_ID)).toBe(
      `https://trfc.example.com/receipt/${ORDER_ID}?t=${signReceipt(ORDER_ID)}`
    )
  })
})

describe('parseScanPayload for receipts', () => {
  it('recognises a receipt URL with its signature', () => {
    expect(parseScanPayload(receiptVerifyUrl(ORDER_ID))).toEqual({
      kind: 'order',
      orderId: ORDER_ID,
      sig: signReceipt(ORDER_ID),
    })
  })

  it('accepts order:<uuid>', () => {
    expect(parseScanPayload(`order:${ORDER_ID}`)).toEqual({ kind: 'order', orderId: ORDER_ID })
  })

  it('rejects malformed receipt payloads and leaves tickets alone', () => {
    expect(parseScanPayload('order:not-a-uuid')).toBeNull()
    expect(parseScanPayload(`${ORDER_ID}:${ORDER_ID}`)).toMatchObject({ kind: 'ticket' })
  })
})

describe('downloadOrderReceipt', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns a PDF for a guest who verifies with the checkout phone', async () => {
    mockOrderQueries(baseOrder())
    const res = mockRes()
    await downloadOrderReceipt({ params: { id: ORDER_ID }, query: { phone: '0712345678' } } as any, res)

    expect(res.status).not.toHaveBeenCalled()
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf')
    const pdf = res.send.mock.calls[0][0] as Buffer
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF')
  })

  it('refuses a wrong phone number', async () => {
    mockOrderQueries(baseOrder())
    const res = mockRes()
    await downloadOrderReceipt({ params: { id: ORDER_ID }, query: { phone: '0799999999' } } as any, res)
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('returns 409 for an unpaid order', async () => {
    mockOrderQueries(baseOrder({ payment_status: 'pending' }))
    const res = mockRes()
    await downloadOrderReceipt({ params: { id: ORDER_ID }, query: { phone: '254712345678' } } as any, res)
    expect(res.status).toHaveBeenCalledWith(409)
  })

  it('returns 404 for an unknown or malformed id', async () => {
    mockOrderQueries(null)
    const res = mockRes()
    await downloadOrderReceipt({ params: { id: 'nope' }, query: {} } as any, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })
})

describe('verifyOrderReceipt', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns a redacted receipt for a valid signature', async () => {
    mockOrderQueries(baseOrder())
    const res = mockRes()
    await verifyOrderReceipt({ params: { id: ORDER_ID }, query: { t: signReceipt(ORDER_ID) } } as any, res)

    const body = res.json.mock.calls[0][0]
    expect(body.valid).toBe(true)
    expect(body.receipt).toMatchObject({
      receipt_number: ORDER_ID.slice(0, 8).toUpperCase(),
      subtotal: 2400,
      member_discount: 300,
      delivery_fee: 0,
      total_amount: 2100,
      mpesa_receipt: '******5678',
    })
    const json = JSON.stringify(body)
    expect(json).not.toContain('jane@example.com')
    expect(json).not.toContain('254712345678')
    expect(json).not.toContain('Roysambu')
  })

  it('rejects a bad signature without touching the database', async () => {
    const res = mockRes()
    await verifyOrderReceipt({ params: { id: ORDER_ID }, query: { t: '0000000000000000' } } as any, res)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(query).not.toHaveBeenCalled()
  })
})

describe('order scanning', () => {
  beforeEach(() => vi.clearAllMocks())

  it('looks up a scanned receipt URL', async () => {
    mockOrderQueries(baseOrder())
    const res = mockRes()
    await lookupScan({ body: { payload: receiptVerifyUrl(ORDER_ID) } } as any, res)
    expect(res.json.mock.calls[0][0]).toMatchObject({ kind: 'order', status: 'valid' })
  })

  it('flags a receipt URL with a forged signature', async () => {
    mockOrderQueries(baseOrder())
    const res = mockRes()
    await lookupScan({ body: { payload: `https://x.test/receipt/${ORDER_ID}?t=0000000000000000` } } as any, res)
    expect(res.json.mock.calls[0][0]).toMatchObject({ kind: 'order', status: 'invalid_signature' })
  })

  it('marks an order collected once and reports repeats', async () => {
    let collectedAt: string | null = null
    vi.mocked(query).mockImplementation((async (sql: string) => {
      if (sql.includes('SET collected_at = NOW()')) {
        if (collectedAt) return { rows: [] }
        collectedAt = '2026-11-12T09:00:00Z'
        return { rows: [{ id: ORDER_ID }] }
      }
      if (sql.includes('FROM order_items')) return { rows: ITEMS }
      if (sql.includes('FROM orders')) return { rows: [baseOrder({ collected_at: collectedAt })] }
      return { rows: [] }
    }) as any)

    const req = { user: { id: 'staff-1' }, body: { kind: 'order', id: ORDER_ID } } as any
    const first = mockRes()
    await admitScan(req, first)
    expect(first.status).not.toHaveBeenCalled()
    expect(first.json.mock.calls[0][0]).toMatchObject({
      kind: 'order',
      status: 'already_collected',
      order: { collectedAt: '2026-11-12T09:00:00Z' },
    })

    const second = mockRes()
    await admitScan(req, second)
    expect(second.status).toHaveBeenCalledWith(409)
  })

  it('will not collect an unpaid order', async () => {
    mockOrderQueries(baseOrder({ payment_status: 'pending' }))
    const res = mockRes()
    await admitScan({ user: { id: 'staff-1' }, body: { kind: 'order', id: ORDER_ID } } as any, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })
})
