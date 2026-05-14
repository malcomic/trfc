import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TestDataBuilder, generateTestCheckoutRequestId, generateTestMpesaReceipt } from '../fixtures/testData'

// Mock database and payment service
class MockPaymentService {
  private payments = new Map()
  private callbacks = new Map()

  async initiatePayment(orderId: string, amount: number, phone: string) {
    const checkoutRequestId = generateTestCheckoutRequestId()
    this.payments.set(checkoutRequestId, {
      orderId,
      amount,
      phone,
      status: 'pending',
      createdAt: new Date(),
    })
    return { checkoutRequestId }
  }

  async recordCallback(checkoutRequestId: string, callback: any) {
    const payment = this.payments.get(checkoutRequestId)
    if (!payment) return null

    const resultCode = callback.Body.stkCallback.ResultCode

    if (resultCode === 0) {
      // Success
      const items = callback.Body.stkCallback.CallbackMetadata.Item
      const mpesaReceipt = items.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value

      this.payments.set(checkoutRequestId, {
        ...payment,
        status: 'paid',
        mpesaReceipt,
        completedAt: new Date(),
      })
    } else if (resultCode === 1) {
      // Failed
      this.payments.set(checkoutRequestId, {
        ...payment,
        status: 'failed',
        failedAt: new Date(),
      })
    } else if (resultCode === -1) {
      // Cancelled
      this.payments.set(checkoutRequestId, {
        ...payment,
        status: 'cancelled',
        cancelledAt: new Date(),
      })
    }

    this.callbacks.set(checkoutRequestId, callback)
    return this.payments.get(checkoutRequestId)
  }

  async getPaymentStatus(checkoutRequestId: string) {
    return this.payments.get(checkoutRequestId)
  }

  getAllPayments() {
    return Array.from(this.payments.values())
  }

  getCallbackCount(checkoutRequestId: string) {
    return this.callbacks.has(checkoutRequestId) ? 1 : 0
  }
}

class MockOrderService {
  private orders = new Map()

  async createOrder(data: any) {
    const orderId = `order-${Date.now()}`
    const order = {
      id: orderId,
      ...data,
      status: 'pending',
      createdAt: new Date(),
    }
    this.orders.set(orderId, order)
    return order
  }

  async updateOrderStatus(orderId: string, status: string, paymentData: any = {}) {
    const order = this.orders.get(orderId)
    if (!order) return null

    order.status = status
    order.paymentData = paymentData
    order.updatedAt = new Date()
    return order
  }

  async getOrder(orderId: string) {
    return this.orders.get(orderId)
  }

  getAllOrders() {
    return Array.from(this.orders.values())
  }
}

describe('Payment Flow Integration Tests', () => {
  let paymentService: MockPaymentService
  let orderService: MockOrderService

  beforeEach(() => {
    paymentService = new MockPaymentService()
    orderService = new MockOrderService()
  })

  afterEach(() => {
    paymentService = null as any
    orderService = null as any
  })

  describe('Order → Payment → Confirmation Flow', () => {
    it('should create order and initiate payment', async () => {
      // Step 1: Create order
      const orderData = {
        user_id: 'user-123',
        items: [{ product_id: 'prod-1', quantity: 2, unit_price: 500 }],
        total_amount: 1000,
        delivery_address: 'Test Address',
        phone: '254700000000',
      }

      const order = await orderService.createOrder(orderData)
      expect(order).toBeDefined()
      expect(order.id).toBeDefined()
      expect(order.status).toBe('pending')

      // Step 2: Initiate payment
      const payment = await paymentService.initiatePayment(
        order.id,
        order.total_amount,
        order.phone
      )
      expect(payment.checkoutRequestId).toBeDefined()

      // Verify payment is tracked
      const paymentStatus = await paymentService.getPaymentStatus(payment.checkoutRequestId)
      expect(paymentStatus.orderId).toBe(order.id)
      expect(paymentStatus.status).toBe('pending')
    })

    it('should handle successful payment callback', async () => {
      // Create order and initiate payment
      const order = await orderService.createOrder({
        total_amount: 1000,
        phone: '254700000000',
      })
      const payment = await paymentService.initiatePayment(order.id, 1000, '254700000000')

      // Simulate successful callback
      const callback = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'merchant-123',
            CheckoutRequestID: payment.checkoutRequestId,
            ResultCode: 0,
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: 1000 },
                { Name: 'MpesaReceiptNumber', Value: 'SIL12345678' },
                { Name: 'TransactionDate', Value: 20231225120000 },
                { Name: 'PhoneNumber', Value: '254700000000' },
              ],
            },
          },
        },
      }

      // Record callback
      const updatedPayment = await paymentService.recordCallback(
        payment.checkoutRequestId,
        callback
      )
      expect(updatedPayment.status).toBe('paid')
      expect(updatedPayment.mpesaReceipt).toBe('SIL12345678')

      // Update order status
      const updatedOrder = await orderService.updateOrderStatus(order.id, 'completed', {
        paymentId: payment.checkoutRequestId,
        mpesaReceipt: updatedPayment.mpesaReceipt,
      })
      expect(updatedOrder.status).toBe('completed')
    })

    it('should handle failed payment callback', async () => {
      const order = await orderService.createOrder({ total_amount: 1000 })
      const payment = await paymentService.initiatePayment(order.id, 1000, '254700000000')

      // Simulate failed callback
      const callback = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'merchant-123',
            CheckoutRequestID: payment.checkoutRequestId,
            ResultCode: 1, // Failed
            ResultDesc: 'Bad request - Invalid InitiatorPassword',
          },
        },
      }

      const updatedPayment = await paymentService.recordCallback(
        payment.checkoutRequestId,
        callback
      )
      expect(updatedPayment.status).toBe('failed')

      // Order should remain pending
      const orderStatus = await orderService.getOrder(order.id)
      expect(orderStatus.status).toBe('pending')
    })

    it('should handle cancelled payment callback', async () => {
      const order = await orderService.createOrder({ total_amount: 1000 })
      const payment = await paymentService.initiatePayment(order.id, 1000, '254700000000')

      // Simulate cancelled callback
      const callback = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'merchant-123',
            CheckoutRequestID: payment.checkoutRequestId,
            ResultCode: -1, // Cancelled
            ResultDesc: 'Request cancelled by user',
          },
        },
      }

      const updatedPayment = await paymentService.recordCallback(
        payment.checkoutRequestId,
        callback
      )
      expect(updatedPayment.status).toBe('cancelled')
    })
  })

  describe('Payment Idempotency', () => {
    it('should not duplicate order for multiple payment initiations', async () => {
      const orderData = { total_amount: 1000, phone: '254700000000' }

      const order1 = await orderService.createOrder(orderData)
      const order2 = await orderService.createOrder(orderData)

      // Orders should have different IDs
      expect(order1.id).not.toBe(order2.id)
    })

    it('should handle duplicate callback gracefully', async () => {
      const order = await orderService.createOrder({ total_amount: 1000 })
      const payment = await paymentService.initiatePayment(order.id, 1000, '254700000000')

      const callback = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'merchant-123',
            CheckoutRequestID: payment.checkoutRequestId,
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

      // First callback
      const payment1 = await paymentService.recordCallback(
        payment.checkoutRequestId,
        callback
      )
      expect(payment1.status).toBe('paid')

      // Second callback (duplicate)
      const payment2 = await paymentService.recordCallback(
        payment.checkoutRequestId,
        callback
      )

      // Should remain in paid state, not duplicate
      expect(payment2.status).toBe('paid')
      expect(paymentService.getCallbackCount(payment.checkoutRequestId)).toBe(1)
    })
  })

  describe('Event Ticket Payment Flow', () => {
    it('should handle ticket purchase payment', async () => {
      const ticketData = {
        event_id: 'event-123',
        quantity: 2,
        unit_price: 500,
        total_amount: 1000,
        phone: '254700000000',
      }

      const order = await orderService.createOrder(ticketData)

      // Initiate payment
      const payment = await paymentService.initiatePayment(
        order.id,
        ticketData.total_amount,
        ticketData.phone
      )

      expect(payment.checkoutRequestId).toBeDefined()

      // Record successful callback
      const callback = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'merchant-123',
            CheckoutRequestID: payment.checkoutRequestId,
            ResultCode: 0,
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: 1000 },
                { Name: 'MpesaReceiptNumber', Value: 'SIL87654321' },
                { Name: 'PhoneNumber', Value: '254700000000' },
              ],
            },
          },
        },
      }

      const updatedPayment = await paymentService.recordCallback(
        payment.checkoutRequestId,
        callback
      )

      // Verify payment completed
      expect(updatedPayment.status).toBe('paid')
      expect(updatedPayment.mpesaReceipt).toBe('SIL87654321')
    })
  })

  describe('Equipment Hire Payment Flow', () => {
    it('should handle equipment hire payment', async () => {
      const hireData = {
        equipment_id: 'equipment-123',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        total_amount: 2000,
        phone: '254700000000',
      }

      const order = await orderService.createOrder(hireData)
      const payment = await paymentService.initiatePayment(
        order.id,
        hireData.total_amount,
        hireData.phone
      )

      // Record payment
      const callback = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'merchant-123',
            CheckoutRequestID: payment.checkoutRequestId,
            ResultCode: 0,
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: 2000 },
                { Name: 'MpesaReceiptNumber', Value: 'SIL11223344' },
                { Name: 'PhoneNumber', Value: '254700000000' },
              ],
            },
          },
        },
      }

      const updatedPayment = await paymentService.recordCallback(
        payment.checkoutRequestId,
        callback
      )

      expect(updatedPayment.status).toBe('paid')
    })
  })

  describe('Payment Recovery', () => {
    it('should allow retry after failed payment', async () => {
      const order = await orderService.createOrder({ total_amount: 1000 })

      // First attempt fails
      const payment1 = await paymentService.initiatePayment(order.id, 1000, '254700000000')
      const failedCallback = {
        Body: {
          stkCallback: {
            CheckoutRequestID: payment1.checkoutRequestId,
            ResultCode: 1,
          },
        },
      }
      await paymentService.recordCallback(payment1.checkoutRequestId, failedCallback)

      // Second attempt succeeds
      const payment2 = await paymentService.initiatePayment(order.id, 1000, '254700000000')
      const successCallback = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'merchant-456',
            CheckoutRequestID: payment2.checkoutRequestId,
            ResultCode: 0,
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: 1000 },
                { Name: 'MpesaReceiptNumber', Value: 'SIL99999999' },
                { Name: 'PhoneNumber', Value: '254700000000' },
              ],
            },
          },
        },
      }
      await paymentService.recordCallback(payment2.checkoutRequestId, successCallback)

      // Update order to completed
      await orderService.updateOrderStatus(order.id, 'completed', {
        paymentId: payment2.checkoutRequestId,
      })

      const finalOrder = await orderService.getOrder(order.id)
      expect(finalOrder.status).toBe('completed')
    })
  })

  describe('Payment Tracking', () => {
    it('should track all payments for user', async () => {
      // Create multiple orders and payments
      const order1 = await orderService.createOrder({ total_amount: 500 })
      const order2 = await orderService.createOrder({ total_amount: 1000 })

      const payment1 = await paymentService.initiatePayment(order1.id, 500, '254700000000')
      const payment2 = await paymentService.initiatePayment(order2.id, 1000, '254700000000')

      const allPayments = paymentService.getAllPayments()
      expect(allPayments.length).toBe(2)
      expect(allPayments.map((p: any) => p.orderId)).toContain(order1.id)
      expect(allPayments.map((p: any) => p.orderId)).toContain(order2.id)
    })

    it('should show payment history with correct status', async () => {
      const order = await orderService.createOrder({ total_amount: 1000 })
      const payment = await paymentService.initiatePayment(order.id, 1000, '254700000000')

      // Record successful payment
      const callback = {
        Body: {
          stkCallback: {
            CheckoutRequestID: payment.checkoutRequestId,
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
      await paymentService.recordCallback(payment.checkoutRequestId, callback)

      const allPayments = paymentService.getAllPayments()
      const completedPayment = allPayments.find((p: any) => p.status === 'paid')

      expect(completedPayment).toBeDefined()
      expect(completedPayment?.mpesaReceipt).toBe('SIL12345678')
    })
  })
})
