import { beforeAll, afterEach, afterAll, vi } from 'vitest'
import dotenv from 'dotenv'

// Load test environment variables
dotenv.config({ path: '.env.test' })

// Global test setup
beforeAll(() => {
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:Mkb606605@localhost:5432/trfc_test'
})

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks()
})

// Global cleanup
afterAll(() => {
  // Close any open connections
})

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}
