import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
}))
vi.mock('../../utils/googleAuth.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/googleAuth.js')>()
  return { ...actual, isGoogleConfigured: vi.fn(() => true), verifyGoogleCredential: vi.fn() }
})

import { query } from '../../config/db.js'
import { verifyGoogleCredential } from '../../utils/googleAuth.js'
import { linkGoogle, unlinkGoogle } from '../../controllers/authController.js'

const USER_ID = 'user-1'
const PROFILE = { sub: 'google-sub-1', email: 'other@gmail.com', name: 'Jane', picture: 'https://pic' }

interface DbState {
  role?: string
  subOwnedByOther?: boolean
  passwordHash?: string | null
}

function mockDb(state: DbState = {}) {
  vi.mocked(query).mockImplementation((async (sql: string) => {
    if (sql.includes('SELECT id, role FROM users')) return { rows: [{ id: USER_ID, role: state.role ?? 'member' }] }
    if (sql.includes('WHERE google_id = $1 AND id <> $2')) return { rows: state.subOwnedByOther ? [{ id: 'other' }] : [] }
    if (sql.includes('SELECT password_hash FROM users')) {
      return { rows: [{ password_hash: state.passwordHash === undefined ? 'hash' : state.passwordHash }] }
    }
    if (sql.includes('UPDATE users SET google_id')) return { rows: [{ id: USER_ID, google_linked: !sql.includes('google_id = NULL') }] }
    return { rows: [] }
  }) as any)
}

const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as any
const callsMatching = (fragment: string) =>
  vi.mocked(query).mock.calls.filter(([sql]) => String(sql).includes(fragment))
const req = (body: Record<string, unknown> = {}) => ({ user: { id: USER_ID }, body }) as any

describe('linkGoogle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyGoogleCredential).mockResolvedValue(PROFILE)
  })

  it('links a member, even when the Google email differs from the TRFC email', async () => {
    mockDb()
    const res = makeRes()
    await linkGoogle(req({ credential: 'id-token' }), res)

    expect(res.status).not.toHaveBeenCalled()
    const update = callsMatching('UPDATE users SET google_id = $1')[0]
    expect(update[1]).toEqual(['google-sub-1', 'https://pic', USER_ID])
    expect(res.json.mock.calls[0][0].user.google_linked).toBe(true)
  })

  it.each(['admin', 'scanner'])('refuses to link a %s account', async (role) => {
    mockDb({ role })
    const res = makeRes()
    await linkGoogle(req({ credential: 'id-token' }), res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(verifyGoogleCredential).not.toHaveBeenCalled()
    expect(callsMatching('UPDATE users SET google_id')).toHaveLength(0)
  })

  it('refuses a Google account already linked to another user', async () => {
    mockDb({ subOwnedByOther: true })
    const res = makeRes()
    await linkGoogle(req({ credential: 'id-token' }), res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(callsMatching('UPDATE users SET google_id')).toHaveLength(0)
  })
})

describe('unlinkGoogle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('disconnects Google when the account has a password', async () => {
    mockDb()
    const res = makeRes()
    await unlinkGoogle(req(), res)

    expect(res.status).not.toHaveBeenCalled()
    expect(callsMatching('UPDATE users SET google_id = NULL')).toHaveLength(1)
  })

  it('refuses to disconnect a Google-only account with no password', async () => {
    mockDb({ passwordHash: null })
    const res = makeRes()
    await unlinkGoogle(req(), res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(callsMatching('UPDATE users SET google_id')).toHaveLength(0)
  })
})
