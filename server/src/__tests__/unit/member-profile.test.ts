import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
}))
vi.mock('bcrypt', () => ({
  default: { hash: vi.fn(async () => 'new-hash'), compare: vi.fn() },
}))
vi.mock('../../utils/tokenUtils.js', () => ({
  generateAccessToken: vi.fn(() => 'access'),
  generateRefreshToken: vi.fn(() => 'refresh'),
  verifyRefreshToken: vi.fn(),
  isTokenStale: vi.fn(() => false),
}))
vi.mock('../../utils/emailService.js', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}))

import bcrypt from 'bcrypt'
import { query } from '../../config/db.js'
import { changeMyPassword, updateMyProfile } from '../../controllers/authController.js'
import { getMyDashboard } from '../../controllers/usersController.js'

const USER_ID = '22222222-2222-4222-8222-222222222222'
const OTHER_ID = '44444444-4444-4444-8444-444444444444'
const BODY = { name: 'Jane Wanjiku', email: 'Jane@Example.com', phone: '0712345678', whatsapp: '' }
const UPDATED = {
  id: USER_ID,
  name: 'Jane Wanjiku',
  email: 'jane@example.com',
  phone: '0712345678',
  whatsapp: '254712345678',
  marketing_opt_in: false,
  role: 'member',
  created_at: '2026-01-01T00:00:00.000Z',
}

type Handler = (sql: string, params: any[]) => { rows: any[] } | undefined

function routeQueries(handler: Handler) {
  vi.mocked(query).mockImplementation((async (sql: string, params: any[] = []) => {
    return handler(sql, params) ?? { rows: [] }
  }) as any)
}

const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as any
const makeReq = (body: any) => ({ body, user: { id: USER_ID, email: 'jane@example.com', role: 'member' } }) as any

const updateCall = () => vi.mocked(query).mock.calls.find(([sql]) => String(sql).includes('UPDATE users'))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('updateMyProfile', () => {
  it('rejects an email that belongs to another user', async () => {
    routeQueries((sql) => (sql.includes('LOWER(email)') ? { rows: [{ id: OTHER_ID }] } : undefined))
    const res = makeRes()
    await updateMyProfile(makeReq(BODY), res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'That email is already used by another account' })
    expect(updateCall()).toBeUndefined()
  })

  it('rejects a phone that belongs to another user', async () => {
    routeQueries((sql) => (sql.includes('phone_normalized = $1') ? { rows: [{ id: OTHER_ID }] } : undefined))
    const res = makeRes()
    await updateMyProfile(makeReq(BODY), res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'That phone number is already used by another account' })
    expect(updateCall()).toBeUndefined()
  })

  it('rejects an invalid phone number', async () => {
    routeQueries(() => undefined)
    const res = makeRes()
    await updateMyProfile(makeReq({ ...BODY, phone: '123' }), res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(query).not.toHaveBeenCalled()
  })

  it('only updates profile fields and returns fresh tokens', async () => {
    routeQueries((sql) => (sql.includes('UPDATE users') ? { rows: [UPDATED] } : undefined))
    const res = makeRes()
    await updateMyProfile(
      makeReq({ ...BODY, role: 'admin', captain_id: OTHER_ID, referred_by_captain_id: OTHER_ID }),
      res
    )

    const [sql, params] = updateCall()!
    expect(sql).not.toMatch(/role\s*=|captain_id|referred_by/)
    expect(params).toEqual(['Jane Wanjiku', 'jane@example.com', '0712345678', '254712345678', '254712345678', false, USER_ID])
    expect(res.json).toHaveBeenCalledWith({ user: UPDATED, token: 'access', refreshToken: 'refresh' })
  })
})

describe('changeMyPassword', () => {
  const account = { id: USER_ID, name: 'Jane', email: 'jane@example.com', role: 'member', password_hash: 'old-hash' }

  it('rejects a wrong current password', async () => {
    routeQueries((sql) => (sql.includes('password_hash FROM users') ? { rows: [account] } : undefined))
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)
    const res = makeRes()
    await changeMyPassword(makeReq({ currentPassword: 'wrong-pass', newPassword: 'new-password-1' }), res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Your current password is incorrect' })
    expect(updateCall()).toBeUndefined()
  })

  it('rejects a weak new password', async () => {
    routeQueries((sql) => (sql.includes('password_hash FROM users') ? { rows: [account] } : undefined))
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
    const res = makeRes()
    await changeMyPassword(makeReq({ currentPassword: 'old-password', newPassword: 'short' }), res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(updateCall()).toBeUndefined()
  })

  it('tells accounts without a password to use forgot password', async () => {
    routeQueries((sql) =>
      sql.includes('password_hash FROM users') ? { rows: [{ ...account, password_hash: null }] } : undefined
    )
    const res = makeRes()
    await changeMyPassword(makeReq({ currentPassword: 'x', newPassword: 'new-password-1' }), res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(bcrypt.compare).not.toHaveBeenCalled()
  })

  it('stores the new hash, revokes older sessions and returns fresh tokens', async () => {
    routeQueries((sql) => (sql.includes('password_hash FROM users') ? { rows: [account] } : undefined))
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
    const res = makeRes()
    await changeMyPassword(makeReq({ currentPassword: 'old-password', newPassword: 'new-password-1' }), res)

    const [sql, params] = updateCall()!
    expect(sql).toContain('password_changed_at')
    expect(params![0]).toBe('new-hash')
    expect(params![1]).toBeInstanceOf(Date)
    expect(params![2]).toBe(USER_ID)
    expect(res.json).toHaveBeenCalledWith({ message: 'Password updated', token: 'access', refreshToken: 'refresh' })
  })
})

describe('getMyDashboard', () => {
  it('returns the profile, no captain and stats for a member without a captain', async () => {
    const stats = {
      tickets: 2,
      upcoming_events: 1,
      medals: 0,
      orders: 1,
      equipment_hires: 0,
      pending_payments: 1,
      total_spent: 3500,
    }
    routeQueries((sql) => {
      if (sql.includes('FROM users WHERE id = $1')) return { rows: [UPDATED] }
      if (sql.includes('AS total_spent')) return { rows: [stats] }
      return undefined
    })
    const res = makeRes()
    await getMyDashboard(makeReq({}), res)
    expect(res.json).toHaveBeenCalledWith({ profile: UPDATED, captain: null, stats })
  })

  it('returns 404 when the user no longer exists', async () => {
    routeQueries(() => undefined)
    const res = makeRes()
    await getMyDashboard(makeReq({}), res)
    expect(res.status).toHaveBeenCalledWith(404)
  })
})
