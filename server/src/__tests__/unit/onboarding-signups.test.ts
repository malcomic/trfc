import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))

vi.mock('../../utils/whatsapp.js', () => ({
  sendSignupWelcome: vi.fn().mockResolvedValue(true),
  isWhatsAppConfigured: vi.fn().mockReturnValue(true),
}))

import { query } from '../../config/db.js'
import { toKenyanMsisdn, phonesMatch } from '../../utils/phone.js'
import { priceFor, resolveProgram, PRICES } from '../../config/onboarding.js'
import { createSignup } from '../../controllers/signupsController.js'
import { validatePaymentReference } from '../../utils/paymentValidation.js'
import { activateSignup, activateSignupsByCheckoutId } from '../../utils/signupActivation.js'

const mockQuery = vi.mocked(query)

function mockRes() {
  return { json: vi.fn(), status: vi.fn().mockReturnThis() } as any
}

function sqlCalls(): string[] {
  return mockQuery.mock.calls.map((call) => String(call[0]))
}

describe('toKenyanMsisdn', () => {
  it.each([
    ['0712345678', '254712345678'],
    ['0712 345 678', '254712345678'],
    ['+254712345678', '254712345678'],
    ['254712345678', '254712345678'],
    ['712345678', '254712345678'],
    ['0112345678', '254112345678'],
  ])('normalises %s', (input, expected) => {
    expect(toKenyanMsisdn(input)).toBe(expected)
  })

  it.each(['', '12345', '0812345678', '25471234567', 'abc'])('rejects %s', (input) => {
    expect(toKenyanMsisdn(input)).toBeNull()
  })

  it('phonesMatch treats local and international forms as equal', () => {
    expect(phonesMatch('0712345678', '254712345678')).toBe(true)
    expect(phonesMatch('0712345678', '254712345679')).toBe(false)
  })
})

describe('onboarding pricing rules', () => {
  it('free never unlocks a paid program', () => {
    expect(resolveProgram('fat_loss', 'free')).toBe('foundations')
    expect(resolveProgram('endurance', 'free')).toBe('foundations')
    expect(resolveProgram('hiking', 'free')).toBe('foundations')
    expect(resolveProgram('foundations', 'free')).toBe('foundations')
  })

  it('paid tiers keep the matched program', () => {
    expect(resolveProgram('hiking', 'plus')).toBe('hiking')
    expect(resolveProgram('endurance', 'elite')).toBe('endurance')
  })

  it('prices by tier and returning status', () => {
    expect(priceFor('free', true)).toBe(0)
    expect(priceFor('plus', true)).toBe(PRICES.plusReturning)
    expect(priceFor('plus', false)).toBe(PRICES.plusNew)
    expect(priceFor('elite', false)).toBe(PRICES.elite)
    expect(priceFor('elite', true)).toBe(PRICES.elite)
  })
})

describe('createSignup', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('rejects an invalid phone number', async () => {
    const res = mockRes()
    await createSignup(
      { body: { name: 'A', phone: '123', program: 'foundations', tier: 'free' } } as any,
      res
    )
    expect(res.status).toHaveBeenCalledWith(400)
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('forces Foundations when Free is chosen for a paid program and creates a new user', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] } as any) // user lookup
      .mockResolvedValueOnce({ rows: [{ id: 'user-1' }] } as any) // user insert
      .mockResolvedValueOnce({ rows: [{ id: 'signup-1' }] } as any) // signup insert
      .mockResolvedValue({ rows: [] } as any) // welcome notification lookups

    const res = mockRes()
    await createSignup(
      {
        body: { name: 'Jane', phone: '0712345678', whatsapp: '', program: 'hiking', tier: 'free' },
      } as any,
      res
    )

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        signupId: 'signup-1',
        program: 'foundations',
        tier: 'free',
        amount: 0,
        isReturning: false,
        phone: '254712345678',
      })
    )
    const signupInsert = mockQuery.mock.calls[2]
    expect(String(signupInsert[0])).toContain('INSERT INTO signups')
    expect(signupInsert[1]).toEqual(
      expect.arrayContaining(['user-1', 'foundations', 'free', false, 0, 'n/a'])
    )
    expect(String(mockQuery.mock.calls[1][0])).toContain("'onboarding'")
  })

  it('charges the returning-member price when the phone exists in users', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'user-9', whatsapp: '254700000000' }] } as any)
      .mockResolvedValueOnce({ rows: [{ id: 'signup-2' }] } as any)

    const res = mockRes()
    await createSignup(
      { body: { name: 'Old', phone: '+254712345678', program: 'fat_loss', tier: 'plus' } } as any,
      res
    )

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 197, isReturning: true, program: 'fat_loss', tier: 'plus' })
    )
    expect(sqlCalls().some((sql) => sql.includes('INSERT INTO users'))).toBe(false)
  })

  it('charges the new-member price for an unknown phone', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [{ id: 'user-2' }] } as any)
      .mockResolvedValueOnce({ rows: [{ id: 'signup-3' }] } as any)

    const res = mockRes()
    await createSignup(
      { body: { name: 'New', phone: '0722000111', program: 'endurance', tier: 'plus' } } as any,
      res
    )

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ amount: 497, isReturning: false }))
  })
})

describe('validatePaymentReference for signups', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  const signupRow = (overrides: Record<string, unknown> = {}) => ({
    rows: [
      {
        amount: 497,
        tier: 'plus',
        payment_status: 'pending',
        phone_normalized: '254712345678',
        ...overrides,
      },
    ],
  })

  it('accepts a matching phone and amount', async () => {
    mockQuery.mockResolvedValueOnce(signupRow() as any)
    const result = await validatePaymentReference(
      undefined, undefined, undefined, undefined, '254712345678', 497, undefined, 'signup-1'
    )
    expect(result).toEqual({ ok: true })
  })

  it('rejects an amount that differs from the stored signup price', async () => {
    mockQuery.mockResolvedValueOnce(signupRow() as any)
    const result = await validatePaymentReference(
      undefined, undefined, undefined, undefined, '254712345678', 197, undefined, 'signup-1'
    )
    expect(result).toMatchObject({ ok: false, status: 400 })
  })

  it('rejects a phone that does not belong to the signup', async () => {
    mockQuery.mockResolvedValueOnce(signupRow() as any)
    const result = await validatePaymentReference(
      undefined, undefined, undefined, undefined, '254799999999', 497, undefined, 'signup-1'
    )
    expect(result).toMatchObject({ ok: false, status: 403 })
  })

  it('rejects free signups', async () => {
    mockQuery.mockResolvedValueOnce(signupRow({ tier: 'free', amount: 0 }) as any)
    const result = await validatePaymentReference(
      undefined, undefined, undefined, undefined, '254712345678', 1, undefined, 'signup-1'
    )
    expect(result).toMatchObject({ ok: false, status: 400 })
  })

  it('rejects already-paid signups', async () => {
    mockQuery.mockResolvedValueOnce(signupRow({ payment_status: 'paid' }) as any)
    const result = await validatePaymentReference(
      undefined, undefined, undefined, undefined, '254712345678', 497, undefined, 'signup-1'
    )
    expect(result).toMatchObject({ ok: false, status: 409 })
  })
})

describe('signup activation', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('grants TRFC+ without downgrading an existing Elite member', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ user_id: 'user-1', tier: 'plus' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)

    const count = await activateSignup('signup-1', 'chk-1', 'RCPT1')

    expect(count).toBe(1)
    const userUpdate = String(mockQuery.mock.calls[1][0])
    expect(userUpdate).toContain("WHEN access_tier = 'elite' THEN 'elite' ELSE 'plus'")
    expect(userUpdate).toContain('plus_purchased_at')
  })

  it('extends an Elite pass from the later of now and the current expiry', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ user_id: 'user-1', tier: 'elite' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)

    await activateSignup('signup-1', 'chk-1', 'RCPT1')

    const [sql, params] = mockQuery.mock.calls[1]
    expect(String(sql)).toContain('GREATEST(COALESCE(elite_expires_at, NOW()), NOW())')
    expect(params).toEqual(['user-1', '30'])
  })

  it('does nothing when the signup is no longer pending', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
    const count = await activateSignup('signup-1', 'chk-1', null)
    expect(count).toBe(0)
    expect(mockQuery).toHaveBeenCalledTimes(1)
  })

  it('activates every pending signup for a checkout id', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'signup-1' }] } as any)
      .mockResolvedValueOnce({ rows: [{ user_id: 'user-1', tier: 'plus' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any)

    const count = await activateSignupsByCheckoutId('chk-1', 'RCPT1')
    expect(count).toBe(1)
  })
})
