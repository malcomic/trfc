import { describe, it, expect, vi } from 'vitest'
import { validatePaymentRequest, validatePhoneNumber } from '../../middleware/paymentValidation.js'
import { MPESA_PHONE_ERROR } from '../../utils/phone.js'

const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as any

describe('M-Pesa phone validation middleware', () => {
  it.each([
    ['0712345678', '254712345678'],
    ['0712 345 678', '254712345678'],
    ['+254712345678', '254712345678'],
    ['254712345678', '254712345678'],
    ['0112345678', '254112345678'],
  ])('rewrites %s to %s', (input, expected) => {
    const req = { body: { phone: input, amount: '100', orderId: 'order-1' } } as any
    const next = vi.fn()
    validatePaymentRequest(req, makeRes(), next)

    expect(next).toHaveBeenCalled()
    expect(req.body.phone).toBe(expected)
    expect(req.body.amount).toBe(100)
  })

  it('rejects a number that is not a Kenyan mobile number', () => {
    const req = { body: { phone: '0812345678', amount: 100, orderId: 'order-1' } } as any
    const res = makeRes()
    const next = vi.fn()
    validatePaymentRequest(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: MPESA_PHONE_ERROR })
  })

  it('requires a phone number', () => {
    const res = makeRes()
    const next = vi.fn()
    validatePhoneNumber({ body: {} } as any, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ error: 'Phone number is required' })
  })

  it('validatePhoneNumber also rewrites 07 numbers', () => {
    const req = { body: { phone: '0712345678' } } as any
    const next = vi.fn()
    validatePhoneNumber(req, makeRes(), next)

    expect(next).toHaveBeenCalled()
    expect(req.body.phone).toBe('254712345678')
  })
})
