import crypto from 'crypto'

// Mock M-Pesa Service
export const mockMpesaService = {
  initiateSTKPush: async (phone: string, amount: number) => {
    return {
      ResponseCode: '0',
      ResponseDescription: 'Success. Request accepted for processing',
      MerchantRequestID: `test-${Date.now()}`,
      CheckoutRequestID: `test-checkout-${Date.now()}`,
    }
  },

  queryPaymentStatus: async (checkoutRequestId: string) => {
    return {
      ResponseCode: '0',
      MerchantRequestID: `test-${Date.now()}`,
      CheckoutRequestID: checkoutRequestId,
      ResultCode: '0',
      ResultDesc: 'The service request has been processed successfully.',
      Amount: 1000,
      MpesaReceiptNumber: 'SIL12345678',
      TransactionDate: new Date().toISOString(),
      PhoneNumber: '254700000000',
    }
  },
}

// Mock Database
export const mockDatabase = {
  query: async (sql: string, params?: any[]) => {
    return { rows: [], rowCount: 0 }
  },
  connect: async () => ({ release: () => {} }),
}

// Test Utilities
export const generateTestCheckoutRequestId = (prefix = 'test'): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export const generateTestMpesaReceipt = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let receipt = ''
  for (let i = 0; i < 10; i++) {
    receipt += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return receipt
}

export const generateTestHMAC = (data: string, secret: string): string => {
  return crypto.createHmac('sha256', secret).update(data).digest('base64')
}

export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Test Data Builders
export class TestDataBuilder {
  static createPaymentCallback(overrides = {}) {
    return {
      Body: {
        stkCallback: {
          MerchantRequestID: 'test-merchant-123',
          CheckoutRequestID: generateTestCheckoutRequestId(),
          ResultCode: 0,
          ResultDesc: 'The service request has been processed successfully.',
          CallbackMetadata: {
            Item: [
              { Name: 'Amount', Value: 1000 },
              { Name: 'MpesaReceiptNumber', Value: generateTestMpesaReceipt() },
              { Name: 'TransactionDate', Value: new Date().getTime() },
              { Name: 'PhoneNumber', Value: '254700000000' },
            ],
          },
          ...overrides,
        },
      },
    }
  }

  static createOrder(overrides = {}) {
    return {
      id: `order-${Date.now()}`,
      user_id: 'user-123',
      total_amount: 1000,
      payment_status: 'pending',
      delivery_address: 'Test Address, Nairobi',
      created_at: new Date().toISOString(),
      ...overrides,
    }
  }

  static createProduct(overrides = {}) {
    return {
      id: `product-${Date.now()}`,
      name: 'Test Product',
      description: 'Test Description',
      price: 500,
      stock: 10,
      category: 'fitness',
      image_url: 'https://example.com/image.jpg',
      created_at: new Date().toISOString(),
      ...overrides,
    }
  }

  static createUser(overrides = {}) {
    return {
      id: `user-${Date.now()}`,
      email: `test-${Date.now()}@trfc.test`,
      phone: '254700000000',
      name: 'Test User',
      password_hash: 'hashed_password',
      is_admin: false,
      created_at: new Date().toISOString(),
      ...overrides,
    }
  }

  static createEvent(overrides = {}) {
    return {
      id: `event-${Date.now()}`,
      name: 'Test Event',
      description: 'Test Event Description',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Test Location',
      capacity: 100,
      price: 500,
      image_url: 'https://example.com/event.jpg',
      created_at: new Date().toISOString(),
      ...overrides,
    }
  }

  static createEquipment(overrides = {}) {
    return {
      id: `equipment-${Date.now()}`,
      name: 'Test Equipment',
      description: 'Test Equipment Description',
      daily_price: 1000,
      hourly_price: 200,
      available: true,
      image_url: 'https://example.com/equipment.jpg',
      created_at: new Date().toISOString(),
      ...overrides,
    }
  }
}
