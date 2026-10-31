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
import { applyReferral, assignChosenCaptain, findActiveZoneByCode, normalizeReferralCode } from '../../utils/referrals.js'
import { createPayout, removeCaptain, updateCaptain } from '../../controllers/captainsController.js'

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
    expect(params).toEqual([CUSTOMER_ID, 'order', 'account', 2500, ORDER_ID, null])
    expect(String(sql)).toContain('ROUND($4::numeric * r.commission_rate, 2)')
    expect(String(sql)).toContain('(region_id, referred_user_id,')
  })

  it('credits the referring zone only while active, never a captain of that zone, and only after the referral date', async () => {
    routeQueries((sql) => {
      if (sql.includes('FROM orders o')) return { rows: [{ user_id: CUSTOMER_ID, email: null, phone: null, base_amount: 100 }] }
      return undefined
    })

    await recordCaptainCommission('order', ORDER_ID)

    const sql = String(insertCall()![0])
    expect(sql).toContain('JOIN regions r ON r.id = COALESCE($6::uuid, u.referred_by_region_id)')
    expect(sql).toContain('r.is_active = true')
    expect(sql).toContain('own.user_id = u.id AND own.region_id = r.id')
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
    expect(inserts[0][1]).toEqual([CUSTOMER_ID, 'medal', 'account', 1500, ORDER_ID, null])
    expect(inserts[1][1]).toEqual([CUSTOMER_ID, 'equipment_hire', 'account', 3500, ORDER_ID, null])
  })

  it('uses the ticket price snapshot and only commissions eligible tickets', async () => {
    routeQueries((sql) => {
      if (sql.includes('FROM tickets t')) {
        expect(sql).toContain('COALESCE(t.unit_price, ett.price, e.price, 0) AS base_amount')
        expect(sql).toContain('t.commission_eligible')
        return { rows: [{ user_id: CUSTOMER_ID, email: null, phone: null, base_amount: '1200' }] }
      }
      if (sql.includes('INSERT INTO captain_commissions')) return { rows: [{ id: 'c' }] }
      return undefined
    })
    expect(await recordCaptainCommission('ticket', ORDER_ID)).toBe(true)

    const [sql, params] = insertCall()!
    expect(params).toEqual([CUSTOMER_ID, 'ticket', 'account', 1200, ORDER_ID, null])
    expect(String(sql)).toContain('JOIN tickets s ON s.id = $5')
  })

  it("credits the zone saved on the ticket, even if the buyer's referral changed", async () => {
    routeQueries((sql) => {
      if (sql.includes('FROM tickets t')) {
        expect(sql).toContain('t.referral_region_id')
        return { rows: [{ user_id: CUSTOMER_ID, email: null, phone: null, base_amount: '1000', referral_region_id: 'zone-thika' }] }
      }
      if (sql.includes('INSERT INTO captain_commissions')) return { rows: [{ id: 'c' }] }
      return undefined
    })
    expect(await recordCaptainCommission('ticket', ORDER_ID)).toBe(true)
    expect(insertCall()![1]).toEqual([CUSTOMER_ID, 'ticket', 'account', 1000, ORDER_ID, 'zone-thika'])
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

  it('records commissions for paid orders, medals, hires and tickets on the checkout', async () => {
    routeQueries((sql) => {
      if (sql.includes('SELECT id FROM orders')) return { rows: [{ id: 'o1' }] }
      if (sql.includes('SELECT id FROM medal_purchases')) return { rows: [{ id: 'm1' }, { id: 'm2' }] }
      if (sql.includes('SELECT id FROM equipment_hire')) return { rows: [] }
      if (sql.includes('SELECT id FROM tickets')) return { rows: [{ id: 't1' }, { id: 't2' }] }
      if (sql.includes('FROM orders o') || sql.includes('FROM medal_purchases p') || sql.includes('FROM tickets t')) {
        return { rows: [{ user_id: CUSTOMER_ID, email: null, phone: null, base_amount: 100 }] }
      }
      if (sql.includes('INSERT INTO captain_commissions')) return { rows: [{ id: 'c' }] }
      return undefined
    })

    expect(await recordCaptainCommissionsForCheckout('ws_CO_1')).toBe(5)
    const inserted = vi
      .mocked(query)
      .mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO captain_commissions'))
      .map(([, params]) => (params as any[])[1])
    expect(inserted.filter((type) => type === 'ticket')).toHaveLength(2)
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

  it('resolves a zone code first and falls back to an old personal captain code', async () => {
    routeQueries((sql, params) => {
      expect(sql).toContain('r.is_active = true')
      expect(sql).toContain('r.referral_code = $1')
      expect(sql).toContain('SELECT c.region_id FROM captains c WHERE c.referral_code = $1')
      expect(sql).toContain('ORDER BY (r.referral_code = $1) DESC')
      expect(params).toEqual(['NRB-JANE24'])
      return { rows: [{ region_id: 'zone-nrb', region_name: 'Nairobi', region_code: 'NRB', referral_code: 'NRB' }] }
    })
    expect(await findActiveZoneByCode(' nrb-jane24 ')).toEqual({
      region_id: 'zone-nrb',
      region_name: 'Nairobi',
      region_code: 'NRB',
      referral_code: 'NRB',
    })
  })

  it('ties the user to the zone only when they have no referring zone yet, and never sets a captain', async () => {
    const zone = { region_id: 'zone-nrb', region_name: 'Nairobi', region_code: 'NRB', referral_code: 'NRB' }
    routeQueries((sql, params) => {
      if (sql.includes('FROM regions r')) return { rows: [zone] }
      expect(sql).toContain('SET referred_by_region_id = $2')
      expect(sql).toContain('u.referred_by_region_id IS NULL')
      expect(sql).toContain('c.user_id = u.id AND c.region_id = $2')
      expect(sql).not.toContain('captain_id')
      expect(params).toEqual([CUSTOMER_ID, 'zone-nrb'])
      return { rows: [{ id: CUSTOMER_ID }] }
    })
    expect(await applyReferral(CUSTOMER_ID, 'nrb')).toEqual(zone)
  })

  it('does nothing for an unknown or inactive zone code', async () => {
    routeQueries(() => ({ rows: [] }))
    expect(await applyReferral(CUSTOMER_ID, 'GONE-ZONE')).toBeNull()
    expect(sqlCalls().some((sql) => sql.includes('UPDATE users'))).toBe(false)
  })

  it('ignores invalid codes without touching the database', async () => {
    expect(await applyReferral(CUSTOMER_ID, '!!')).toBeNull()
    expect(query).not.toHaveBeenCalled()
  })

  it('limits a chosen captain to the referring zone when one is given', async () => {
    const CAPTAIN = '66666666-6666-4666-8666-666666666666'
    routeQueries((sql, params) => {
      expect(sql).toContain('$3::uuid IS NULL OR c.region_id = $3::uuid')
      expect(params).toEqual([CUSTOMER_ID, CAPTAIN, 'zone-nrb'])
      return { rows: [] }
    })
    expect(await assignChosenCaptain(CUSTOMER_ID, CAPTAIN, 'zone-nrb')).toBe(false)
  })
})

describe('createPayout', () => {
  const REGION_ID = '33333333-3333-4333-8333-333333333333'
  const LEAD_ID = '77777777-7777-4777-8777-777777777777'
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
  const withLead = (sql: string) => (sql.includes('FROM regions r') ? { rows: [{ lead_captain_id: LEAD_ID }] } : undefined)

  beforeEach(() => vi.clearAllMocks())

  it('refuses a payout when the zone has no active lead captain', async () => {
    const client = mockClient(() => undefined)
    const res = makeRes()

    await createPayout(
      { body: { regionId: REGION_ID, commissionIds: [C1], mpesaReceipt: 'QAB123' }, user: { id: 'admin' } } as any,
      res
    )

    expect(res.status).toHaveBeenCalledWith(400)
    const leadQuery = client.query.mock.calls.find(([sql]) => String(sql).includes('FROM regions r'))!
    expect(String(leadQuery[0])).toContain("c.region_id = r.id AND c.status = 'active'")
    expect(client.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO captain_payouts'))).toBe(false)
    expect(client.query).toHaveBeenCalledWith('ROLLBACK')
    expect(client.release).toHaveBeenCalled()
  })

  it('rejects commissions that are not approved or belong to another zone', async () => {
    const client = mockClient((sql, params) => {
      if (sql.includes('FROM captain_commissions')) {
        expect(sql).toContain('region_id = $2')
        expect(params[1]).toBe(REGION_ID)
        return { rows: [{ id: C1, amount: '100' }] }
      }
      return withLead(sql)
    })
    const res = makeRes()

    await createPayout(
      { body: { regionId: REGION_ID, commissionIds: [C1, C2], mpesaReceipt: 'QAB123' }, user: { id: 'admin' } } as any,
      res
    )

    expect(res.status).toHaveBeenCalledWith(400)
    expect(client.query).toHaveBeenCalledWith('ROLLBACK')
    expect(client.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO captain_payouts'))).toBe(false)
    expect(client.release).toHaveBeenCalled()
  })

  it('records the summed payout for the zone, paid to its lead captain, and marks the commissions paid', async () => {
    const client = mockClient((sql) => {
      if (sql.includes('FROM captain_commissions')) {
        expect(sql).toContain("status = 'approved'")
        return { rows: [{ id: C1, amount: '100.50' }, { id: C2, amount: '49.50' }] }
      }
      if (sql.includes('INSERT INTO captain_payouts')) return { rows: [{ id: 'p1', amount: 150 }] }
      return withLead(sql)
    })
    const res = makeRes()

    await createPayout(
      { body: { regionId: REGION_ID, commissionIds: [C1, C2], mpesaReceipt: 'qab123' }, user: { id: 'admin' } } as any,
      res
    )

    const insert = client.query.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO captain_payouts'))!
    expect(insert[1]).toEqual([REGION_ID, LEAD_ID, 150, 'QAB123', null, 'admin'])
    expect(client.query.mock.calls.some(([sql]) => String(sql).includes("SET status = 'paid'"))).toBe(true)
    expect(client.query).toHaveBeenCalledWith('COMMIT')
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('requires a zone and an M-Pesa receipt', async () => {
    const res = makeRes()
    await createPayout({ body: { commissionIds: [C1], mpesaReceipt: 'QAB123' } } as any, res)
    await createPayout({ body: { regionId: REGION_ID, commissionIds: [C1], mpesaReceipt: ' ' } } as any, res)
    expect(res.status).toHaveBeenCalledTimes(2)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(getClient).not.toHaveBeenCalled()
  })
})

describe('lead captain clean-up', () => {
  const CAPTAIN_ID = '88888888-8888-4888-8888-888888888888'
  const NEW_REGION = '99999999-9999-4999-8999-999999999999'
  const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as any

  beforeEach(() => vi.clearAllMocks())

  it('stops a suspended captain leading their zone', async () => {
    const client = {
      query: vi.fn(async (sql: string) =>
        String(sql).includes('UPDATE captains SET status') ? { rows: [{ user_id: CAPTAIN_ID }] } : { rows: [] }
      ),
      release: vi.fn(),
    }
    vi.mocked(getClient).mockResolvedValue(client as any)

    await removeCaptain({ params: { id: CAPTAIN_ID } } as any, makeRes())

    const cleared = client.query.mock.calls.find(([sql]) => String(sql).includes('UPDATE regions SET lead_captain_id = NULL'))
    expect(cleared?.[1]).toEqual([CAPTAIN_ID])
    expect(client.query).toHaveBeenCalledWith('COMMIT')
  })

  it('stops a captain leading their old zone when they move to another one', async () => {
    routeQueries((sql) => (sql.includes('UPDATE captains SET') ? { rows: [{ user_id: CAPTAIN_ID }] } : undefined))
    const res = makeRes()

    await updateCaptain({ params: { id: CAPTAIN_ID }, body: { regionId: NEW_REGION } } as any, res)

    const [sql, params] = vi.mocked(query).mock.calls[0]
    expect(String(sql)).toContain('UPDATE regions r SET lead_captain_id = NULL')
    expect(String(sql)).toContain('r.lead_captain_id = updated.user_id AND r.id <> updated.region_id')
    expect(params).toEqual([NEW_REGION, CAPTAIN_ID])
    expect(res.json).toHaveBeenCalledWith({ message: 'Captain updated' })
  })
})
