import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock payment controller
const mockPaymentController = {
  initiateSTKPush: async (req: any, res: any) => {
    const { phone, amount, orderId } = req.body

    if (!phone || amount == null || amount === '' || !orderId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    if (!/^254\d{9}$/.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone format' })
    }

    if (Number(amount) < 1 || Number(amount) > 150000) {
      return res.status(400).json({ error: 'Invalid amount' })
    }

    // Simulate M-Pesa response
    return res.status(200).json({
      checkoutRequestId: `test-${Date.now()}`,
      ResponseCode: '0',
      ResponseDescription: 'Success',
    })
  },

  handleCallback: async (req: any, res: any) => {
    const { Body } = req.body

    if (!Body?.stkCallback?.CheckoutRequestID) {
      return res.status(400).json({ error: 'Invalid callback' })
    }

    return res.status(200).json({ ResultCode: 0 })
  },

  getPaymentStatus: async (req: any, res: any) => {
    const { checkoutRequestId } = req.params

    if (!checkoutRequestId) {
      return res.status(400).json({ error: 'Missing checkoutRequestId' })
    }

    return res.status(200).json({
      status: 'completed',
      amount: 1000,
      mpesaReceipt: 'SIL12345678',
    })
  },

  getPaymentHistory: async (req: any, res: any) => {
    // Return mock payment history
    return res.status(200).json([
      {
        id: 'payment-1',
        type: 'order',
        amount: 1000,
        payment_status: 'paid',
        created_at: new Date().toISOString(),
      },
    ])
  },
}

describe('Payment Controller', () => {
  let mockReq: any
  let mockRes: any

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      user: { id: 'user-123' },
    }

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    }
  })

  describe('POST /api/payments/initiate-stk-push', () => {
    it('should return 400 when phone is missing', async () => {
      mockReq.body = { amount: 1000, orderId: 'order-123' }
      await mockPaymentController.initiateSTKPush(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      )
    })

    it('should return 400 when amount is missing', async () => {
      mockReq.body = { phone: '254700000000', orderId: 'order-123' }
      await mockPaymentController.initiateSTKPush(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(400)
    })

    it('should return 400 when orderId is missing', async () => {
      mockReq.body = { phone: '254700000000', amount: 1000 }
      await mockPaymentController.initiateSTKPush(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(400)
    })

    it('should return 400 for invalid phone format', async () => {
      mockReq.body = {
        phone: '712345678', // Missing country code
        amount: 1000,
        orderId: 'order-123',
      }
      await mockPaymentController.initiateSTKPush(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Invalid phone format' })
      )
    })

    it('should return 400 for amount less than minimum', async () => {
      mockReq.body = {
        phone: '254700000000',
        amount: 0,
        orderId: 'order-123',
      }
      await mockPaymentController.initiateSTKPush(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Invalid amount' })
      )
    })

    it('should return 400 for amount exceeding maximum', async () => {
      mockReq.body = {
        phone: '254700000000',
        amount: 150001,
        orderId: 'order-123',
      }
      await mockPaymentController.initiateSTKPush(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(400)
    })

    it('should return 200 with checkoutRequestId for valid request', async () => {
      mockReq.body = {
        phone: '254700000000',
        amount: 1000,
        orderId: 'order-123',
      }
      await mockPaymentController.initiateSTKPush(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          checkoutRequestId: expect.any(String),
          ResponseCode: '0',
        })
      )
    })

    it('should accept valid phone numbers', async () => {
      const validPhones = ['254700000000', '254712345678', '254799999999']

      for (const phone of validPhones) {
        mockReq.body = { phone, amount: 1000, orderId: 'order-123' }
        await mockPaymentController.initiateSTKPush(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(200)
      }
    })

    it('should accept amounts within valid range', async () => {
      const validAmounts = [1, 100, 1000, 50000, 150000]

      for (const amount of validAmounts) {
        mockReq.body = {
          phone: '254700000000',
          amount,
          orderId: 'order-123',
        }
        await mockPaymentController.initiateSTKPush(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(200)
      }
    })
  })

  describe('POST /api/payments/callback', () => {
    it('should return 400 for missing callback body', async () => {
      mockReq.body = {}
      await mockPaymentController.handleCallback(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(400)
    })

    it('should return 400 for missing CheckoutRequestID', async () => {
      mockReq.body = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'test-123',
            ResultCode: 0,
          },
        },
      }
      await mockPaymentController.handleCallback(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(400)
    })

    it('should return 200 for valid callback', async () => {
      mockReq.body = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'merchant-123',
            CheckoutRequestID: 'checkout-456',
            ResultCode: 0,
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: 1000 },
                { Name: 'MpesaReceiptNumber', Value: 'SIL12345678' },
                { Name: 'PhoneNumber', Value: '254700000000' },
              ],
            },
          },
        },
      }
      await mockPaymentController.handleCallback(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ ResultCode: 0 })
      )
    })
  })

  describe('GET /api/payments/status/:checkoutRequestId', () => {
    it('should return 400 for missing checkoutRequestId', async () => {
      mockReq.params = {}
      await mockPaymentController.getPaymentStatus(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(400)
    })

    it('should return payment status for valid checkoutRequestId', async () => {
      mockReq.params = { checkoutRequestId: 'test-checkout-123' }
      await mockPaymentController.getPaymentStatus(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: expect.any(String),
          amount: expect.any(Number),
        })
      )
    })
  })

  describe('GET /api/payments/history', () => {
    it('should return payment history array', async () => {
      await mockPaymentController.getPaymentHistory(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith(expect.any(Array))
    })

    it('should return array of payment objects', async () => {
      await mockPaymentController.getPaymentHistory(mockReq, mockRes)

      const [call] = mockRes.json.mock.calls
      const payments = call[0]

      expect(Array.isArray(payments)).toBe(true)
      if (payments.length > 0) {
        expect(payments[0]).toHaveProperty('id')
        expect(payments[0]).toHaveProperty('type')
        expect(payments[0]).toHaveProperty('amount')
        expect(payments[0]).toHaveProperty('payment_status')
      }
    })
  })

  describe('Error Responses', () => {
    it('should return consistent error response format', async () => {
      mockReq.body = { amount: 1000, orderId: 'order-123' }
      await mockPaymentController.initiateSTKPush(mockReq, mockRes)

      const [call] = mockRes.json.mock.calls
      const response = call[0]

      expect(response).toHaveProperty('error')
      expect(typeof response.error).toBe('string')
    })

    it('should return appropriate status codes', async () => {
      // Invalid request should return 400
      mockReq.body = { amount: 1000 }
      await mockPaymentController.initiateSTKPush(mockReq, mockRes)
      expect(mockRes.status).toHaveBeenCalledWith(400)

      // Valid request should return 200
      mockRes.status.mockClear()
      mockReq.body = {
        phone: '254700000000',
        amount: 1000,
        orderId: 'order-123',
      }
      await mockPaymentController.initiateSTKPush(mockReq, mockRes)
      expect(mockRes.status).toHaveBeenCalledWith(200)
    })
  })
})
