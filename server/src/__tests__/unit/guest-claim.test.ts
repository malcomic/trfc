import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
}))
vi.mock('bcrypt', () => ({
  default: { hash: vi.fn(async () => 'hashed'), compare: vi.fn(async () => true) },
}))
vi.mock('../../utils/tokenUtils.js', () => ({
  generateAccessToken: vi.fn(() => 'access'),
  generateRefreshToken: vi.fn(() => 'refresh'),
  verifyRefreshToken: vi.fn(),
  isTokenStale: vi.fn(() => false),
}))
vi.mock('../../utils/whatsapp.js', () => ({
  sendAccountWelcome: vi.fn(async () => true),
}))

import { query } from '../../config/db.js'
import { login, register } from '../../controllers/authController.js'
import { claimGuestPurchases } from '../../utils/claimGuestPurchases.js'

const USER_ID = '22222222-2222-4222-8222-222222222222'
const BODY = { name: 'Jane Wanjiku', email: ' Jane@Example.com ', phone: '0712 345 678', password: 'password123' }
const CREATED = { id: USER_ID, name: 'Jane Wanjiku', email: 'jane@example.com', phone: '0712 345 678', role: 'member' }

const CLAIM_COUNTS: Record<string, number> = { tickets: 2, orders: 1, medal_purchases: 0 }

function claimTable(sql: string): string | null {
  const match = /UPDATE (tickets|orders|medal_purchases)\s+SET user_id = \$1/.exec(sql)
  return match ? match[1] : null
}

function mockDb(options: { claimFails?: boolean } = {}) {
  vi.mocked(query).mockImplementation((async (sql: string) => {
    const table = claimTable(sql)
    if (table) {
      if (options.claimFails) throw new Error('db down')
      return { rows: [], rowCount: CLAIM_COUNTS[table] }
    }
    if (sql.includes('INSERT INTO users')) return { rows: [CREATED] }
    if (sql.includes('SELECT * FROM users WHERE LOWER(email)')) {
      return { rows: [{ ...CREATED, password_hash: 'hash' }] }
    }
    return { rows: [] }
  }) as any)
}

const claimCalls = () => vi.mocked(query).mock.calls.filter(([sql]) => claimTable(String(sql)))
const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as any

describe('claimGuestPurchases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb()
  })

  it('links unowned paid purchases in all three tables by email and phone', async () => {
    const result = await claimGuestPurchases(USER_ID, ' Jane@Example.com ', '+254 712 345 678')

    expect(result).toEqual({ tickets: 2, orders: 1, medals: 0, total: 3 })
    const calls = claimCalls()
    expect(calls.map(([sql]) => claimTable(String(sql))).sort()).toEqual(['medal_purchases', 'orders', 'tickets'])
    for (const [sql, params] of calls) {
      expect(String(sql)).toContain('user_id IS NULL')
      expect(String(sql)).toContain("payment_status = 'paid'")
      expect(String(sql)).toContain('LOWER(TRIM(email)) = $2')
      expect(params).toEqual([USER_ID, 'jane@example.com', '712345678'])
    }
  })

  it('skips linking when the phone or email is missing or invalid', async () => {
    expect((await claimGuestPurchases(USER_ID, 'jane@example.com', '12345')).total).toBe(0)
    expect((await claimGuestPurchases(USER_ID, '', '0712345678')).total).toBe(0)
    expect(query).not.toHaveBeenCalled()
  })
})

describe('register and login link guest purchases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('register returns the number of linked purchases', async () => {
    mockDb()
    const res = makeRes()
    await register({ body: BODY } as any, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json.mock.calls[0][0].linked_purchases).toBe(3)
    expect(claimCalls()[0][1]).toEqual([USER_ID, 'jane@example.com', '712345678'])
  })

  it('a failing claim never blocks registration', async () => {
    mockDb({ claimFails: true })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = makeRes()
    await register({ body: BODY } as any, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json.mock.calls[0][0].linked_purchases).toBe(0)
    errorSpy.mockRestore()
  })

  it('login links purchases made with the account email and phone', async () => {
    mockDb()
    const res = makeRes()
    await login({ body: { email: 'jane@example.com', password: 'password123' } } as any, res)

    expect(res.json.mock.calls[0][0].linked_purchases).toBe(3)
    expect(claimCalls()).toHaveLength(3)
  })
})
