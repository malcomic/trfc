import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))

import { query, getClient } from '../../config/db.js'
import {
  recordCaptainCommission,
  recordCaptainCommissionsForCheckout,
  resolveReferredCustomer,
  reverseCaptainCommission,
} from '../../utils/captainCommissions.js'
import { applyReferral, normalizeReferralCode } from '../../utils/referrals.js'
import { createPayout } from '../../controllers/captainsController.js'

type Handler = (sql: string, params: any[]) => { rows: any[]; rowCount?: number } | undefined

function routeQueries(handler: Handler) {
  vi.mocked(query).mockImplementation((async (sql: string, params: any[] = []) => {
    return handler(sql, params) ?? { rows: [], rowCount: 0 }
  }) as any)
}

const sqlCalls = () => vi.mocked(query).mock.calls.map(([sql]) => String(sql))
const insertCall = () => vi.mocked(query).mock.calls.find(([sql]) => String(sql).includes('INSERT INTO captain_commissions'))

const ORDER_ID = '11111111-1111-4111-8111-111111111111'
const CUSTOMER_ID = '22222222-2222-4222-8222-222222222222'

describe('resolveReferredCustomer', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses the account user when the purchase has a user_id', async () => {
    const result = await resolveReferredCustomer({ user_id: CUSTOMER_ID, email: 'x@y.com', phone: '0712345678' })
    expect(result).toEqual({ userId: CUSTOMER_ID, method: 'account' })
    expect(query).not.toHaveBeenCalled()
  })

  it('matches guests by email (case-insensitive) before phone', async () => {
    routeQueries((sql, params) => {
      if (sql.includes('LOWER(email)')) {
        expect(params[0]).toBe('jane@example.com')
        return { rows: [{ id: CUSTOMER_ID }] }
      }
      return undefined
    })
    const result = await resolveReferredCustomer({ user_id: null, email: ' Jane@Example.com ', phone: '0712345678' })
    expect(result).toEqual({ userId: CUSTOMER_ID, method: 'email' })
    expect(sqlCalls().some((s) => s.includes('phone_normalized'))).toBe(false)
  })

  it('falls back to a normalized phone match when exactly one user has that phone', async () => {
    routeQueries((sql, params) => {
      if (sql.includes('phone_normalized')) {
        expect(params[0]).toBe('254712345678')
        return { rows: [{ id: CUSTOMER_ID }] }
      }
      return undefined
    })
    const result = await resolveReferredCustomer({ user_id: null, email: 'nobody@example.com', phone: '0712 345 678' })
    expect(result).toEqual({ userId: CUSTOMER_ID, method: 'phone' })
  })

  it('does not match when several users share the phone number', async () => {
    routeQueries((sql) => (sql.includes('phone_normalized') ? { rows: [{ id: 'a' }, { id: 'b' }] } : undefined))
    const result = await resolveReferredCustomer({ user_id: null, email: null, phone: '0712345678' })
    expect(result).toBeNull()
  })
})

describe('recordCaptainCommission', () => {
  beforeEach(() => vi.clearAllMocks())

  it('records a commission on the order subtotal (excluding shipping)', async () => {
    routeQueries((sql) => {
      if (sql.includes('FROM orders o')) {
        expect(sql).toContain('SUM(oi.quantity * oi.unit_price)')
        expect(sql).not.toContain('total_amount')
        return { rows: [{ user_id: CUSTOMER_ID, email: null, phone: null, base_amount: '2500.00' }] }
      }
      if (sql.includes('INSERT INTO captain_commissions')) return { rows: [{ id: 'c1' }] }
      return undefined
    })

    const created = await recordCaptainCommission('order', ORDER_ID)

    expect(created).toBe(true)
    const [sql, params] = insertCall()!
    expect(params).toEqual([CUSTOMER_ID, 'order', 'account', 2500, ORDER_ID])
    expect(String(sql)).toContain('ROUND($4::numeric * c.commission_rate, 2)')
  })

  it('only credits active captains, never the buyer themselves, and only after the referral date', async () => {
    routeQueries((sql) => {
      if (sql.includes('FROM orders o')) return { rows: [{ user_id: CUSTOMER_ID, email: null, phone: null, base_amount: 100 }] }
      return undefined
    })

    await recordCaptainCommission('order', ORDER_ID)

    const sql = String(insertCall()![0])
    expect(sql).toContain("c.status = 'active'")
    expect(sql).toContain('c.user_id <> u.id')
    expect(sql).toContain('s.created_at >= COALESCE(u.referred_at')
    expect(sql).toContain('JOIN orders s ON s.id = $5')
  })

  it('is idempotent: a second call hits ON CONFLICT DO NOTHING and reports no new commission', async () => {
    routeQueries((sql) => {
      if (sql.includes('FROM orders o')) return { rows: [{ user_id: CUSTOMER_ID, email: null, phone: null, base_amount: 100 }] }
      if (sql.includes('INSERT INTO captain_commissions')) {
        expect(sql).toContain('ON CONFLICT (source_type, source_id) DO NOTHING')
        return { rows: [] }
      }
      return undefined
    })
    expect(await recordCaptainCommission('order', ORDER_ID)).toBe(false)
  })

  it('reinstates a reversed commission only when asked to', async () => {
    routeQueries((sql) => {
      if (sql.includes('FROM orders o')) return { rows: [{ user_id: CUSTOMER_ID, email: null, phone: null, base_amount: 100 }] }
      if (sql.includes('INSERT INTO captain_commissions')) return { rows: [{ id: 'c1' }] }
      return undefined
    })
    await recordCaptainCommission('order', ORDER_ID, { reinstate: true })
    const sql = String(insertCall()![0])
    expect(sql).toContain('DO UPDATE')
    expect(sql).toContain("WHERE captain_commissions.status = 'reversed'")
  })

  it('uses the medal option price and the equipment total cost as the base', async () => {
    routeQueries((sql) => {
      if (sql.includes('FROM medal_purchases p')) {
        expect(sql).toContain('mo.price AS base_amount')
        return { rows: [{ user_id: CUSTOMER_ID, email: null, phone: null, base_amount: '1500' }] }
      }
      if (sql.includes('FROM equipment_hire h')) {
        expect(sql).toContain('h.total_cost')
        return { rows: [{ user_id: CUSTOMER_ID, email: null, phone: null, base_amount: '3500' }] }
      }
      if (sql.includes('INSERT INTO captain_commissions')) return { rows: [{ id: 'c' }] }
      return undefined
    })

    await recordCaptainCommission('medal', ORDER_ID)
    await recordCaptainCommission('equipment_hire', ORDER_ID)

    const inserts = vi.mocked(query).mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO captain_commissions'))
    expect(inserts[0][1]).toEqual([CUSTOMER_ID, 'medal', 'account', 1500, ORDER_ID])
    expect(inserts[1][1]).toEqual([CUSTOMER_ID, 'equipment_hire', 'account', 3500, ORDER_ID])
  })

  it('skips unpaid purchases, zero-value purchases and unmatched guests', async () => {
    routeQueries(() => undefined)
    expect(await recordCaptainCommission('order', ORDER_ID)).toBe(false)

    routeQueries((sql) => (sql.includes('FROM orders o') ? { rows: [{ user_id: CUSTOMER_ID, base_amount: 0 }] } : undefined))
    expect(await recordCaptainCommission('order', ORDER_ID)).toBe(false)

    routeQueries((sql) =>
      sql.includes('FROM orders o') ? { rows: [{ user_id: null, email: 'g@x.com', phone: null, base_amount: 100 }] } : undefined
    )
    expect(await recordCaptainCommission('order', ORDER_ID)).toBe(false)

    expect(insertCall()).toBeUndefined()
  })

  it('never throws, so payment confirmation cannot be broken by a commission error', async () => {
    vi.mocked(query).mockRejectedValue(new Error('db down'))
    await expect(recordCaptainCommission('order', ORDER_ID)).resolves.toBe(false)
    await expect(recordCaptainCommissionsForCheckout('ws_CO_123')).resolves.toBe(0)
  })
})

describe('recordCaptainCommissionsForCheckout', () => {
  beforeEach(() => vi.clearAllMocks())

  it('records commissions for paid orders, medals and hires on the checkout but not tickets', async () => {
    routeQueries((sql) => {
      if (sql.includes('SELECT id FROM orders')) return { rows: [{ id: 'o1' }] }
      if (sql.includes('SELECT id FROM medal_purchases')) return { rows: [{ id: 'm1' }, { id: 'm2' }] }
      if (sql.includes('SELECT id FROM equipment_hire')) return { rows: [] }
      if (sql.includes('FROM orders o') || sql.includes('FROM medal_purchases p')) {
        return { rows: [{ user_id: CUSTOMER_ID, email: null, phone: null, base_amount: 100 }] }
      }
      if (sql.includes('INSERT INTO captain_commissions')) return { rows: [{ id: 'c' }] }
      return undefined
    })

    expect(await recordCaptainCommissionsForCheckout('ws_CO_1')).toBe(3)
    expect(sqlCalls().some((s) => s.includes('tickets'))).toBe(false)
  })
})

describe('reverseCaptainCommission', () => {
  beforeEach(() => vi.clearAllMocks())

  it('cannot reverse a commission that has already been paid out', async () => {
    routeQueries((sql) => {
      expect(sql).toContain("status IN ('pending', 'approved')")
      return { rows: [] }
    })
    expect(await reverseCaptainCommission('order', ORDER_ID)).toBe(false)
  })
})

describe('referrals', () => {
  beforeEach(() => vi.clearAllMocks())

  it('normalizes codes and rejects junk', () => {
    expect(normalizeReferralCode(' nrb-jane24 ')).toBe('NRB-JANE24')
    expect(normalizeReferralCode('x')).toBeNull()
    expect(normalizeReferralCode("'; DROP TABLE users;--")).toBeNull()
    expect(normalizeReferralCode(42)).toBeNull()
  })

  it('applies a valid code only when the user has no captain yet', async () => {
    routeQueries((sql, params) => {
      expect(sql).toContain('referred_by_captain_id IS NULL')
      expect(sql).toContain("c.status = 'active'")
      expect(params).toEqual([CUSTOMER_ID, 'NRB-JANE24'])
      return { rows: [{ id: CUSTOMER_ID }] }
    })
    expect(await applyReferral(CUSTOMER_ID, 'nrb-jane24')).toBe(true)
  })

  it('ignores invalid codes without touching the database', async () => {
    expect(await applyReferral(CUSTOMER_ID, '!!')).toBe(false)
    expect(query).not.toHaveBeenCalled()
  })
})

describe('createPayout', () => {
  const CAPTAIN_ID = '33333333-3333-4333-8333-333333333333'
  const C1 = '44444444-4444-4444-8444-444444444444'
  const C2 = '55555555-5555-4555-8555-555555555555'

  function mockClient(handler: Handler) {
    const client = {
      query: vi.fn(async (sql: string, params: any[] = []) => handler(sql, params) ?? { rows: [] }),
      release: vi.fn(),
    }
    vi.mocked(getClient).mockResolvedValue(client as any)
    return client
  }

  const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as any

  beforeEach(() => vi.clearAllMocks())

  it('rejects commissions that are not approved or belong to another captain', async () => {
    const client = mockClient((sql) => (sql.includes('FROM captain_commissions') ? { rows: [{ id: C1, amount: '100' }] } : undefined))
    const res = makeRes()

    await createPayout(
      { body: { captainId: CAPTAIN_ID, commissionIds: [C1, C2], mpesaReceipt: 'QAB123' }, user: { id: 'admin' } } as any,
      res
    )

    expect(res.status).toHaveBeenCalledWith(400)
    expect(client.query).toHaveBeenCalledWith('ROLLBACK')
    expect(client.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO captain_payouts'))).toBe(false)
    expect(client.release).toHaveBeenCalled()
  })

  it('records the summed payout and marks the commissions paid', async () => {
    const client = mockClient((sql) => {
      if (sql.includes('FROM captain_commissions')) {
        expect(sql).toContain("status = 'approved'")
        return { rows: [{ id: C1, amount: '100.50' }, { id: C2, amount: '49.50' }] }
      }
      if (sql.includes('INSERT INTO captain_payouts')) return { rows: [{ id: 'p1', amount: 150 }] }
      return undefined
    })
    const res = makeRes()

    await createPayout(
      { body: { captainId: CAPTAIN_ID, commissionIds: [C1, C2], mpesaReceipt: 'qab123' }, user: { id: 'admin' } } as any,
      res
    )

    const insert = client.query.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO captain_payouts'))!
    expect(insert[1]).toEqual([CAPTAIN_ID, 150, 'QAB123', null, 'admin'])
    expect(client.query.mock.calls.some(([sql]) => String(sql).includes("SET status = 'paid'"))).toBe(true)
    expect(client.query).toHaveBeenCalledWith('COMMIT')
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('requires an M-Pesa receipt', async () => {
    const res = makeRes()
    await createPayout({ body: { captainId: CAPTAIN_ID, commissionIds: [C1], mpesaReceipt: ' ' } } as any, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(getClient).not.toHaveBeenCalled()
  })
})
