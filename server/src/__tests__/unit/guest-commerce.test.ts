import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getOrderById } from '../../controllers/ordersController.js'
import { buyTicket } from '../../controllers/ticketsController.js'
import { initiateSTKPush } from '../../controllers/paymentsController.js'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))

vi.mock('../../utils/mpesa.js', () => ({
  getMPesaToken: vi.fn().mockResolvedValue('token'),
  initiateStkPush: vi.fn().mockResolvedValue({
    CheckoutRequestID: 'chk-1',
    MerchantRequestID: 'mrc-1',
    ResponseCode: '0',
    CustomerMessage: 'Success',
  }),
  queryPaymentStatus: vi.fn(),
  parseCallbackResponse: vi.fn(),
}))

vi.mock('../../utils/paymentLogger.js', () => ({
  logSTKInitiation: vi.fn(),
  logCallbackProcessing: vi.fn(),
  logPaymentStatusQuery: vi.fn(),
  logError: vi.fn(),
  logDuplicateCallback: vi.fn(),
}))

import { query } from '../../config/db.js'

describe('guest commerce', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(query).mockReset()
  })

  it('getOrderById returns limited fields without phone verification', async () => {
    vi.mocked(query).mockResolvedValueOnce({
      rows: [
        {
          id: 'order-1',
          payment_status: 'pending',
          total_amount: 100,
          created_at: '2026-01-01',
          phone: '254712345678',
        },
      ],
    } as any)

    const req = { params: { id: 'order-1' }, user: undefined, query: {} } as any
    const res = { json: vi.fn(), status: vi.fn().mockReturnThis() } as any

    await getOrderById(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'order-1', status: 'pending', total: 100 })
    )
  })

  it('buyTicket works without authenticated user', async () => {
    vi.mocked(query).mockImplementation(async (sql: string) => {
      if (sql.includes('FROM events WHERE')) {
        return {
          rows: [
            {
              id: 'ev-1',
              title: 'Run',
              event_date: '2026-08-01',
              price: 500,
              capacity: null,
            },
          ],
        } as any
      }
      if (sql.includes('INSERT INTO tickets')) {
        return { rows: [{ id: 'ticket-1' }] } as any
      }
      return { rows: [] } as any
    })

    const req = {
      params: { eventId: 'ev-1' },
      user: undefined,
      body: { quantity: 1, email: 'guest@example.com', phone: '254712345678' },
    } as any
    const res = { json: vi.fn(), status: vi.fn().mockReturnThis() } as any

    await buyTicket(req, res)

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO tickets'),
      [null, 'ev-1', expect.any(String), '254712345678', 'guest@example.com', 'mpesa', 'pending']
    )
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketIds: ['ticket-1'],
        eventTitle: 'Run',
        totalPrice: 500,
      })
    )
  })

  it('initiateSTKPush works for guest with valid order', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [{ id: 'order-1', total_amount: 100, phone: '254712345678' }] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)

    const req = {
      user: undefined,
      body: { phone: '254712345678', amount: 100, orderId: 'order-1' },
    } as any
    const res = { json: vi.fn(), status: vi.fn().mockReturnThis() } as any

    await initiateSTKPush(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ checkoutRequestId: 'chk-1' })
    )
  })

  it('initiateSTKPush works for guest ticket batch', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce({
        rows: [
          { id: 'ticket-1', phone: '254712345678', price: 500, payment_status: 'pending' },
          { id: 'ticket-2', phone: '254712345678', price: 500, payment_status: 'pending' },
        ],
      } as any)
      .mockResolvedValueOnce({ rows: [] } as any)

    const req = {
      user: undefined,
      body: {
        phone: '254712345678',
        amount: 1000,
        ticketBatchId: 'batch-1',
      },
    } as any
    const res = { json: vi.fn(), status: vi.fn().mockReturnThis() } as any

    await initiateSTKPush(req, res)

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE tickets SET checkout_request_id'),
      ['chk-1', 'mpesa', 'batch-1']
    )
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ checkoutRequestId: 'chk-1' })
    )
  })
})
