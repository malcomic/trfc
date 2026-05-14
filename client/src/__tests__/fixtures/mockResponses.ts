import { vi } from 'vitest'

// Mock API responses
export const mockPaymentResponses = {
  initiateSTKPush: {
    checkoutRequestId: 'test-checkout-123',
    ResponseCode: '0',
    ResponseDescription: 'Success. Request accepted for processing',
  },

  paymentStatus: {
    status: 'completed',
    amount: 1000,
    mpesaReceipt: 'SIL12345678',
    checkoutRequestId: 'test-checkout-123',
  },

  paymentHistory: [
    {
      id: 'payment-1',
      type: 'order',
      amount: 1000,
      payment_status: 'paid',
      mpesa_receipt: 'SIL12345678',
      created_at: new Date().toISOString(),
    },
    {
      id: 'payment-2',
      type: 'ticket',
      amount: 500,
      payment_status: 'paid',
      mpesa_receipt: 'SIL87654321',
      created_at: new Date().toISOString(),
    },
  ],
}

export const mockOrderResponses = {
  createOrder: {
    id: 'order-123',
    user_id: 'user-1',
    total_amount: 1000,
    payment_status: 'pending',
    delivery_address: '123 Test St',
    created_at: new Date().toISOString(),
  },

  getOrder: {
    id: 'order-123',
    user_id: 'user-1',
    items: [
      {
        product_id: 'prod-1',
        quantity: 2,
        unit_price: 500,
      },
    ],
    total_amount: 1000,
    payment_status: 'paid',
    delivery_address: '123 Test St',
    created_at: new Date().toISOString(),
  },
}

export const mockAuthResponses = {
  login: {
    token: 'test-jwt-token-123',
    user: {
      id: 'user-1',
      email: 'test@trfc.com',
      name: 'Test User',
      phone: '254700000000',
    },
  },

  register: {
    id: 'user-1',
    email: 'test@trfc.com',
    name: 'Test User',
    phone: '254700000000',
  },
}

// Mock Axios instance
export const mockAxios = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  create: vi.fn(),
}

// Create mock API client functions
export const createMockApiClient = () => {
  return {
    payments: {
      initiateSTKPush: vi.fn().mockResolvedValue(mockPaymentResponses.initiateSTKPush),
      getPaymentStatus: vi.fn().mockResolvedValue(mockPaymentResponses.paymentStatus),
      getPaymentHistory: vi.fn().mockResolvedValue(mockPaymentResponses.paymentHistory),
    },
    orders: {
      createOrder: vi.fn().mockResolvedValue(mockOrderResponses.createOrder),
      getOrder: vi.fn().mockResolvedValue(mockOrderResponses.getOrder),
    },
    auth: {
      login: vi.fn().mockResolvedValue(mockAuthResponses.login),
      register: vi.fn().mockResolvedValue(mockAuthResponses.register),
    },
  }
}

// Mock cart store
export const mockCartStore = {
  items: [],
  getTotal: vi.fn(() => 1000),
  addItem: vi.fn(),
  removeItem: vi.fn(),
  clearCart: vi.fn(),
  updateQuantity: vi.fn(),
}

// Mock auth store
export const mockAuthStore = {
  user: null,
  token: null,
  isAuthenticated: false,
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
}

// Test utilities
export const waitFor = async (callback: () => void, options = {}) => {
  const { timeout = 3000, interval = 50 } = options
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    try {
      callback()
      return
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, interval))
    }
  }

  throw new Error('waitFor timeout exceeded')
}

export const mockNavigate = vi.fn()

export const renderWithProviders = async (component: any) => {
  // Placeholder for rendering with Redux/Context providers
  return component
}
