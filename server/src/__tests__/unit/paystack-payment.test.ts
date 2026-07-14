import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  initializePaystackPayment,
  verifyPaystackPayment,
  initiateSTKPush,
} from '../../controllers/paymentsController.js'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
}))

vi.mock('../../utils/mpesa.js', () => ({
  getMPesaToken: vi.fn().mockResolvedValue('token'),
  initiateStkPush: vi.fn(),
  queryPaymentStatus: vi.fn(),
  parseCallbackResponse: vi.fn(),
}))

vi.mock('../../utils/paystack.js', () => ({
  initializeTransaction: vi.fn().mockResolvedValue({
    access_code: 'access_test',
    reference: 'paystack_ref_1',
    authorization_url: 'https://checkout.paystack.com/test',
  }),
  verifyTransaction: vi.fn().mockResolvedValue({
    id: 99,
    status: 'success',
    reference: 'paystack_ref_1',
    amount: 100000,
    currency: 'KES',
    paid_at: '2026-07-14T10:00:00.000Z',
    channel: 'card',
    metadata: { ticketBatchId: 'batch-1' },
  }),
  verifyWebhookSignature: vi.fn().mockReturnValue(true),
}))

vi.mock('../../utils/paymentLogger.js', () => ({
  logSTKInitiation: vi.fn(),
  logCallbackProcessing: vi.fn(),
  logPaymentStatusQuery: vi.fn(),
  logError: vi.fn(),
  logDuplicateCallback: vi.fn(),
}))

vi.mock('../../utils/emailService.js', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('../../utils/emailTemplates.js', () => ({
  buildTicketEmailHTML: vi.fn().mockReturnValue('<html></html>'),
}))

vi.mock('../../utils/qrCodeGenerator.js', () => ({
  generateQRCodeBase64: vi.fn().mockResolvedValue('base64'),
  generateQRCodeBuffer: vi.fn().mockResolvedValue(Buffer.from('qr')),
}))

vi.mock('../../utils/ticketPDFGenerator.js', () => ({
  generateTicketPDF: vi.fn().mockResolvedValue(Buffer.from('pdf')),
}))

vi.mock('../../utils/paymentStatus.js', () => ({
  getLocalPaymentStatus: vi.fn().mockResolvedValue({
    payment_status: 'pending',
    mpesa_receipt: null,
    source: 'ticket',
  }),
  toStatusResponse: vi.fn(),
}))

import { query } from '../../config/db.js'
import { initializeTransaction, verifyTransaction } from '../../utils/paystack.js'

describe('Paystack ticket payments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects ticketBatchId on M-Pesa STK push', async () => {
    const req = {
      body: {
        phone: '254712345678',
        amount: 1000,
        ticketBatchId: 'batch-1',
      },
    } as any
    const res = { json: vi.fn(), status: vi.fn().mockReturnThis() } as any

    await initiateSTKPush(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('Paystack'),
      })
    )
  })

  it('initializes Paystack for a ticket batch', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce({
        rows: [
          { id: 't1', purchase_batch_id: 'batch-1', price: 500, payment_status: 'pending' },
          { id: 't2', purchase_batch_id: 'batch-1', price: 500, payment_status: 'pending' },
        ],
      } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 2 } as any)

    const req = {
      body: {
        email: 'buyer@example.com',
        amount: 1000,
        ticketBatchId: 'batch-1',
      },
    } as any
    const res = { json: vi.fn(), status: vi.fn().mockReturnThis() } as any

    await initializePaystackPayment(req, res)

    expect(initializeTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'buyer@example.com',
        amountKes: 1000,
        metadata: expect.objectContaining({ ticketBatchId: 'batch-1' }),
      })
    )
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        accessCode: 'access_test',
        reference: 'paystack_ref_1',
      })
    )
  })

  it('verifies Paystack payment and marks tickets paid', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [], rowCount: 2 } as any)
      .mockResolvedValueOnce({ rows: [{ id: 't1' }, { id: 't2' }] } as any)
      .mockResolvedValue({ rows: [] } as any)

    const req = { params: { reference: 'paystack_ref_1' } } as any
    const res = { json: vi.fn(), status: vi.fn().mockReturnThis() } as any

    await verifyPaystackPayment(req, res)

    expect(verifyTransaction).toHaveBeenCalledWith('paystack_ref_1')
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        payment_status: 'paid',
        reference: 'paystack_ref_1',
      })
    )
  })
})
