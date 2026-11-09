import { describe, it, expect, vi, beforeEach } from 'vitest'

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
  return { ...actual, isGoogleConfigured: vi.fn(() => true), verifyGoogleCredential: vi.fn() }
})

import { query } from '../../config/db.js'
import { GoogleAuthError, isGoogleConfigured, verifyGoogleCredential, verifyGoogleSignupToken } from '../../utils/googleAuth.js'
import { googleAuth } from '../../controllers/authController.js'

const PROFILE = { sub: 'google-sub-1', email: 'jane@example.com', name: 'Jane Wanjiku', picture: 'https://pic' }
const USER = { id: 'user-1', name: 'Jane Wanjiku', email: 'jane@example.com', phone: '0712345678', avatar_url: null }

interface DbState {
  googleUser?: Record<string, unknown>
  emailOwner?: boolean
}

function mockDb(state: DbState = {}) {
  vi.mocked(query).mockImplementation((async (sql: string) => {
    if (sql.includes('WHERE google_id = $1')) return { rows: state.googleUser ? [state.googleUser] : [] }
    if (sql.includes('FROM users WHERE LOWER(email)')) return { rows: state.emailOwner ? [{ id: 'other' }] : [] }
    return { rows: [] }
  }) as any)
}

const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as any
const call = async (body: Record<string, unknown> = { credential: 'id-token' }) => {
  const res = makeRes()
  await googleAuth({ body } as any, res)
  return res
}

describe('googleAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isGoogleConfigured).mockReturnValue(true)
    vi.mocked(verifyGoogleCredential).mockResolvedValue(PROFILE)
  })

  it('signs in a member whose Google account is linked', async () => {
    mockDb({ googleUser: { ...USER, role: 'member' } })
    const res = await call()

    expect(res.status).not.toHaveBeenCalled()
    const body = res.json.mock.calls[0][0]
    expect(body.token).toBe('access')
    expect(body.refreshToken).toBe('refresh')
    expect(body.user.id).toBe('user-1')
  })

  it.each(['admin', 'scanner'])('refuses Google sign-in for %s accounts', async (role) => {
    mockDb({ googleUser: { ...USER, role } })
    const res = await call()

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json.mock.calls[0][0].token).toBeUndefined()
  })

  it('never links by email: an existing email returns 409 with a link hint', async () => {
    mockDb({ emailOwner: true })
    const res = await call()

    expect(res.status).toHaveBeenCalledWith(409)
    const body = res.json.mock.calls[0][0]
    expect(body.code).toBe('GOOGLE_LINK_REQUIRED')
    expect(body.email).toBe('jane@example.com')
    expect(vi.mocked(query).mock.calls.some(([sql]) => String(sql).includes('SET google_id'))).toBe(false)
  })

  it('asks a new user to complete their profile with a signup token', async () => {
    mockDb()
    const res = await call()

    const body = res.json.mock.calls[0][0]
    expect(body.needsProfile).toBe(true)
    expect(body.profile).toEqual({ name: 'Jane Wanjiku', email: 'jane@example.com', picture: 'https://pic' })
    expect(verifyGoogleSignupToken(body.signupToken)).toEqual(PROFILE)
  })

  it('rejects an invalid Google credential with 401', async () => {
    vi.mocked(verifyGoogleCredential).mockRejectedValue(new GoogleAuthError('Google sign-in failed. Please try again.'))
    mockDb()
    const res = await call()

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('returns 503 when Google sign-in is not configured', async () => {
    vi.mocked(isGoogleConfigured).mockReturnValue(false)
    const res = await call()

    expect(res.status).toHaveBeenCalledWith(503)
    expect(verifyGoogleCredential).not.toHaveBeenCalled()
  })
})
