import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
}))
vi.mock('bcrypt', () => ({
  default: { hash: vi.fn(async () => 'hashed'), compare: vi.fn() },
}))
vi.mock('../../utils/tokenUtils.js', () => ({
  generateAccessToken: vi.fn(() => 'access'),
  generateRefreshToken: vi.fn(() => 'refresh'),
  verifyRefreshToken: vi.fn(),
  isTokenStale: vi.fn(() => false),
}))
vi.mock('../../utils/accountWelcome.js', () => ({
  sendAccountWelcomeOnce: vi.fn(async () => false),
}))

import { query } from '../../config/db.js'
import { register } from '../../controllers/authController.js'

const USER = { id: '22222222-2222-4222-8222-222222222222', name: 'Jane', email: 'jane@example.com', phone: '0712345678', role: 'member' }

function mockDb() {
  vi.mocked(query).mockImplementation((async (sql: string) => {
    if (sql.includes('FROM users WHERE phone_normalized')) return { rows: [] }
    if (sql.includes('FROM users WHERE LOWER(email)')) return { rows: [] }
    if (sql.includes('INSERT INTO users')) return { rows: [USER] }
    if (sql.includes('FROM regions r')) return { rows: [{ region_id: 'zone-nrb', region_name: 'Nairobi', region_code: 'NRB', referral_code: 'NRB' }] }
    if (sql.includes('UPDATE users u')) return { rows: [{ id: USER.id }] }
    return { rows: [] }
  }) as any)
}

const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as any
const referralCalls = () => vi.mocked(query).mock.calls.filter(([sql]) => String(sql).includes('SET referred_by_region_id'))

describe('register with a referral code', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb()
  })

  it('links the new user to the zone and stores a normalized phone', async () => {
    const res = makeRes()
    await register({ body: { ...USER, password: 'Password123', referralCode: 'nrb-jane24' } } as any, res)

    expect(res.status).toHaveBeenCalledWith(201)
    const insert = vi.mocked(query).mock.calls.find(([sql]) => String(sql).includes('INSERT INTO users'))!
    expect(insert[1]).toContain('254712345678')
    expect(referralCalls()).toHaveLength(1)
    expect(referralCalls()[0][1]).toEqual([USER.id, 'zone-nrb'])
  })

  it('still registers the user when the code is invalid', async () => {
    const res = makeRes()
    await register({ body: { ...USER, password: 'password123', referralCode: '<script>' } } as any, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(referralCalls()).toHaveLength(0)
  })

  it('does not attempt a referral without a code', async () => {
    const res = makeRes()
    await register({ body: { ...USER, password: 'password123' } } as any, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(referralCalls()).toHaveLength(0)
  })
})
