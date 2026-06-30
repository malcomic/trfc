import { describe, expect, it, vi, beforeEach } from 'vitest'
import { validateCallbackBody } from '../../middleware/webhookSecurity.js'

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null as unknown,
    status(code: number) {
      res.statusCode = code
      return res
    },
    json(payload: unknown) {
      res.body = payload
      return res
    },
  }
  return res
}

describe('validateCallbackBody', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('allows successful callbacks where ResultCode is 0', () => {
    const req = {
      body: {
        Body: {
          stkCallback: {
            MerchantRequestID: '16813-123',
            CheckoutRequestID: 'ws_CO_123',
            ResultCode: 0,
            ResultDesc: 'Success',
          },
        },
      },
    } as any
    const res = createMockRes()
    const next = vi.fn()

    validateCallbackBody(req, res as any, next)

    expect(next).toHaveBeenCalled()
    expect(res.statusCode).toBe(200)
  })

  it('rejects callbacks missing ResultCode', () => {
    const req = {
      body: {
        Body: {
          stkCallback: {
            MerchantRequestID: '16813-123',
            CheckoutRequestID: 'ws_CO_123',
            ResultDesc: 'Success',
          },
        },
      },
    } as any
    const res = createMockRes()
    const next = vi.fn()

    validateCallbackBody(req, res as any, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(400)
  })
})
