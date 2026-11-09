import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
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
vi.mock('../../utils/googleAuth.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/googleAuth.js')>()
  return { ...actual, isGoogleConfigured: vi.fn(() => true) }
})

import { query } from '../../config/db.js'
import { signGoogleSignupToken } from '../../utils/googleAuth.js'
import { completeGoogleSignup } from '../../controllers/authController.js'

const PROFILE = { sub: 'google-sub-1', email: 'jane@example.com', name: 'Jane Wanjiku', picture: 'https://pic' }
const CREATED = { id: 'new-user', name: 'Jane Wanjiku', email: 'jane@example.com', phone: '0712345678', role: 'member' }

interface DbState {
  googleOwner?: boolean
  phoneOwner?: { id: string; password_hash: string | null }
  emailOwner?: { id: string }
}

function mockDb(state: DbState = {}) {
  vi.mocked(query).mockImplementation((async (sql: string) => {
    if (sql.includes('WHERE google_id = $1')) return { rows: state.googleOwner ? [{ id: 'someone' }] : [] }
    if (sql.includes('FROM users WHERE phone_normalized')) return { rows: state.phoneOwner ? [state.phoneOwner] : [] }
    if (sql.includes('FROM users WHERE LOWER(email)')) return { rows: state.emailOwner ? [state.emailOwner] : [] }
    if (sql.includes('INSERT INTO users') || sql.trim().startsWith('UPDATE users\n')) return { rows: [CREATED] }
    return { rows: [] }
  }) as any)
}

const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as any
const callsMatching = (fragment: string) =>
  vi.mocked(query).mock.calls.filter(([sql]) => String(sql).includes(fragment))
const call = async (body: Record<string, unknown>) => {
  const res = makeRes()
  await completeGoogleSignup({ body } as any, res)
  return res
}
const validBody = () => ({ signupToken: signGoogleSignupToken(PROFILE), phone: '0712345678' })

describe('completeGoogleSignup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a member with no password, linked to the Google account', async () => {
    mockDb()
    const res = await call({ ...validBody(), marketingOptIn: true })

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json.mock.calls[0][0].token).toBe('access')
    const insert = callsMatching('INSERT INTO users')[0]
    expect(String(insert[0])).toContain('google_id, avatar_url')
    expect(insert[1]).toEqual([
      'Jane Wanjiku',
      'jane@example.com',
      '0712345678',
      '254712345678',
      null,
      '254712345678',
      true,
      'google-sub-1',
      'https://pic',
    ])
  })

  it('claims a phone-only onboarding account instead of creating a duplicate', async () => {
    mockDb({ phoneOwner: { id: 'onboarded', password_hash: null } })
    const res = await call(validBody())

    expect(res.status).toHaveBeenCalledWith(201)
    expect(callsMatching('INSERT INTO users')).toHaveLength(0)
    const update = vi.mocked(query).mock.calls.find(([sql]) => String(sql).trim().startsWith('UPDATE users\n'))!
    expect(String(update[0])).toContain('google_id = $9')
    expect(update[1]).toEqual(expect.arrayContaining(['onboarded', 'google-sub-1']))
  })

  it('refuses a phone that belongs to an account with a password', async () => {
    mockDb({ phoneOwner: { id: 'existing', password_hash: 'hash' } })
    const res = await call(validBody())

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json.mock.calls[0][0].code).toBe('GOOGLE_LINK_REQUIRED')
    expect(callsMatching('INSERT INTO users')).toHaveLength(0)
  })

  it('refuses when the email was registered in the meantime', async () => {
    mockDb({ emailOwner: { id: 'someone-else' } })
    const res = await call(validBody())

    expect(res.status).toHaveBeenCalledWith(409)
  })

  it('refuses when the Google account already has a TRFC account', async () => {
    mockDb({ googleOwner: true })
    const res = await call(validBody())

    expect(res.status).toHaveBeenCalledWith(409)
    expect(callsMatching('INSERT INTO users')).toHaveLength(0)
  })

  it('rejects a tampered signup token', async () => {
    mockDb()
    const forged = jwt.sign(PROFILE, 'not-the-secret', { expiresIn: '15m' })
    const res = await call({ ...validBody(), signupToken: forged })

    expect(res.status).toHaveBeenCalledWith(401)
    expect(query).not.toHaveBeenCalled()
  })

  it('rejects an expired signup token', async () => {
    mockDb()
    vi.useFakeTimers()
    const token = signGoogleSignupToken(PROFILE)
    vi.setSystemTime(Date.now() + 16 * 60_000)
    const res = await call({ signupToken: token, phone: '0712345678' })
    vi.useRealTimers()

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('rejects an invalid phone number', async () => {
    mockDb()
    const res = await call({ ...validBody(), phone: '12345' })

    expect(res.status).toHaveBeenCalledWith(400)
    expect(query).not.toHaveBeenCalled()
  })
})
