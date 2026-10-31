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
vi.mock('../../utils/whatsapp.js', () => ({
  sendAccountWelcome: vi.fn(async () => true),
}))

import { query } from '../../config/db.js'
import { sendAccountWelcome } from '../../utils/whatsapp.js'
import { register } from '../../controllers/authController.js'
import { getMyTeam } from '../../controllers/captainsController.js'
import { DEFAULT_CAPTAIN_LABEL, sendAccountWelcomeOnce } from '../../utils/accountWelcome.js'

const USER_ID = '22222222-2222-4222-8222-222222222222'
const CAPTAIN_ID = '33333333-3333-4333-8333-333333333333'
const ZONE = { region_id: 'zone-nrb', region_name: 'Nairobi', region_code: 'NRB', referral_code: 'NRB' }
const BODY = { name: 'Jane Wanjiku', email: 'Jane@Example.com', phone: '0712345678', password: 'password123' }
const CREATED = { id: USER_ID, name: 'Jane Wanjiku', email: 'jane@example.com', phone: '0712345678', role: 'member' }

interface DbState {
  phoneOwner?: { id: string; password_hash: string | null }
  emailOwner?: { id: string }
  referralMatches?: boolean
  captainActive?: boolean
  welcomeUser?: Record<string, unknown> | null
}

function mockDb(state: DbState = {}) {
  vi.mocked(query).mockImplementation((async (sql: string) => {
    if (sql.includes('FROM users WHERE phone_normalized')) return { rows: state.phoneOwner ? [state.phoneOwner] : [] }
    if (sql.includes('FROM users WHERE LOWER(email)')) return { rows: state.emailOwner ? [state.emailOwner] : [] }
    if (sql.includes('INSERT INTO users') || sql.trim().startsWith('UPDATE users\n')) return { rows: [CREATED] }
    if (sql.includes('FROM regions r')) return { rows: state.referralMatches ? [ZONE] : [] }
    if (sql.includes('SET referred_by_region_id')) return { rows: state.referralMatches ? [{ id: USER_ID }] : [] }
    if (sql.includes('SET captain_id')) return { rows: state.captainActive ? [{ id: USER_ID }] : [] }
    if (sql.includes('u.marketing_opt_in')) return { rows: state.welcomeUser ? [state.welcomeUser] : [] }
    return { rows: [] }
  }) as any)
}

const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as any
const callsMatching = (fragment: string) =>
  vi.mocked(query).mock.calls.filter(([sql]) => String(sql).includes(fragment))
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('register: captain rules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('a zone link joins the zone and keeps the chosen captain only if they are in that zone', async () => {
    mockDb({ referralMatches: true, captainActive: true })
    const res = makeRes()
    await register({ body: { ...BODY, referralCode: 'NRB', captainId: CAPTAIN_ID } } as any, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(callsMatching('SET referred_by_region_id')).toHaveLength(1)
    const assign = callsMatching('SET captain_id')
    expect(assign).toHaveLength(1)
    expect(String(assign[0][0])).toContain('c.region_id = $3::uuid')
    expect(assign[0][1]).toEqual([USER_ID, CAPTAIN_ID, 'zone-nrb'])
  })

  it('a captain from another zone is not assigned on a zone link', async () => {
    mockDb({ referralMatches: true, captainActive: false })
    const res = makeRes()
    await register({ body: { ...BODY, referralCode: 'NRB', captainId: CAPTAIN_ID } } as any, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(callsMatching('SET referred_by_region_id')).toHaveLength(1)
    expect(res.json.mock.calls[0][0].user.captain).toBeNull()
  })

  it('a chosen captain only sets captain_id, never the commission referral', async () => {
    mockDb({ captainActive: true })
    const res = makeRes()
    await register({ body: { ...BODY, captainId: CAPTAIN_ID } } as any, res)

    expect(res.status).toHaveBeenCalledWith(201)
    const assign = callsMatching('SET captain_id')
    expect(assign).toHaveLength(1)
    expect(String(assign[0][0])).not.toContain('referred_by_region_id')
    expect(assign[0][1]).toEqual([USER_ID, CAPTAIN_ID, null])
    expect(callsMatching('SET referred_by_region_id')).toHaveLength(0)
  })

  it('falls back to any chosen captain when the referral code does not match', async () => {
    mockDb({ referralMatches: false, captainActive: true })
    const res = makeRes()
    await register({ body: { ...BODY, referralCode: 'NRB-NOPE01', captainId: CAPTAIN_ID } } as any, res)

    expect(res.status).toHaveBeenCalledWith(201)
    const assign = callsMatching('SET captain_id')
    expect(assign).toHaveLength(1)
    expect(assign[0][1]).toEqual([USER_ID, CAPTAIN_ID, null])
  })

  it('ignores a malformed captain id', async () => {
    mockDb()
    const res = makeRes()
    await register({ body: { ...BODY, captainId: 'none' } } as any, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(callsMatching('SET captain_id')).toHaveLength(0)
  })

  it('still registers when the chosen captain is inactive', async () => {
    mockDb({ captainActive: false })
    const res = makeRes()
    await register({ body: { ...BODY, captainId: CAPTAIN_ID } } as any, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(callsMatching('SET captain_id')).toHaveLength(1)
    expect(res.json.mock.calls[0][0].user.captain).toBeNull()
  })

  it('stores a lowercased email and the WhatsApp number defaults to the phone', async () => {
    mockDb()
    const res = makeRes()
    await register({ body: { ...BODY, marketingOptIn: true } } as any, res)

    const insert = callsMatching('INSERT INTO users')[0]
    expect(insert[1]).toEqual(['Jane Wanjiku', 'jane@example.com', '0712345678', '254712345678', 'hashed', '254712345678', true])
  })
})

describe('register: accounts and validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('upgrades a phone-only account instead of creating a duplicate', async () => {
    const existingId = '44444444-4444-4444-8444-444444444444'
    mockDb({ phoneOwner: { id: existingId, password_hash: null } })
    const res = makeRes()
    await register({ body: BODY } as any, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(callsMatching('INSERT INTO users')).toHaveLength(0)
    const update = vi.mocked(query).mock.calls.find(([sql]) => String(sql).trim().startsWith('UPDATE users\n'))!
    expect(update[1]).toContain(existingId)
  })

  it('rejects a phone number that already has a password', async () => {
    mockDb({ phoneOwner: { id: 'x', password_hash: 'hash' } })
    const res = makeRes()
    await register({ body: BODY } as any, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json.mock.calls[0][0].error).toMatch(/Sign in instead/)
    expect(callsMatching('INSERT INTO users')).toHaveLength(0)
  })

  it('rejects an email used by another account', async () => {
    mockDb({ emailOwner: { id: 'someone-else' } })
    const res = makeRes()
    await register({ body: BODY } as any, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json.mock.calls[0][0].error).toBe('Email already registered')
  })

  it('rejects an invalid phone number', async () => {
    mockDb()
    const res = makeRes()
    await register({ body: { ...BODY, phone: '12345' } } as any, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(query).not.toHaveBeenCalled()
  })

  it('rejects an invalid WhatsApp number', async () => {
    mockDb()
    const res = makeRes()
    await register({ body: { ...BODY, whatsapp: 'abc' } } as any, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(query).not.toHaveBeenCalled()
  })

  it('a failing welcome message does not break registration', async () => {
    mockDb({ welcomeUser: { name: 'Jane', whatsapp: '254712345678', marketing_opt_in: true, welcome_whatsapp_sent_at: null } })
    vi.mocked(sendAccountWelcome).mockRejectedValueOnce(new Error('Meta down'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = makeRes()
    await register({ body: { ...BODY, marketingOptIn: true } } as any, res)
    await flush()

    expect(res.status).toHaveBeenCalledWith(201)
    expect(sendAccountWelcome).toHaveBeenCalledTimes(1)
    errorSpy.mockRestore()
  })
})

describe('sendAccountWelcomeOnce', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(sendAccountWelcome).mockResolvedValue(true)
  })

  it('does not send without consent', async () => {
    mockDb({ welcomeUser: { name: 'Jane', whatsapp: '254712345678', marketing_opt_in: false, welcome_whatsapp_sent_at: null } })
    expect(await sendAccountWelcomeOnce(USER_ID)).toBe(false)
    expect(sendAccountWelcome).not.toHaveBeenCalled()
  })

  it('does not send twice', async () => {
    mockDb({ welcomeUser: { name: 'Jane', whatsapp: '254712345678', marketing_opt_in: true, welcome_whatsapp_sent_at: '2026-10-01' } })
    expect(await sendAccountWelcomeOnce(USER_ID)).toBe(false)
    expect(sendAccountWelcome).not.toHaveBeenCalled()
  })

  it('sends to the WhatsApp number with the captain label and records it', async () => {
    mockDb({
      welcomeUser: {
        name: 'Jane Wanjiku',
        whatsapp: '254700000001',
        phone_normalized: '254712345678',
        marketing_opt_in: true,
        welcome_whatsapp_sent_at: null,
        captain_name: 'Irene Achieng',
        captain_zone: 'Thika',
      },
    })
    expect(await sendAccountWelcomeOnce(USER_ID)).toBe(true)
    expect(sendAccountWelcome).toHaveBeenCalledWith('254700000001', 'Jane', 'Irene, Team Thika')
    expect(callsMatching('SET welcome_whatsapp_sent_at')).toHaveLength(1)
  })

  it('falls back to the phone and a default captain label', async () => {
    mockDb({
      welcomeUser: { name: 'Jane', whatsapp: null, phone_normalized: '254712345678', marketing_opt_in: true, welcome_whatsapp_sent_at: null },
    })
    await sendAccountWelcomeOnce(USER_ID)
    expect(sendAccountWelcome).toHaveBeenCalledWith('254712345678', 'Jane', DEFAULT_CAPTAIN_LABEL)
  })

  it('does not record a send that failed', async () => {
    vi.mocked(sendAccountWelcome).mockResolvedValueOnce(false)
    mockDb({ welcomeUser: { name: 'Jane', whatsapp: '254712345678', marketing_opt_in: true, welcome_whatsapp_sent_at: null } })
    expect(await sendAccountWelcomeOnce(USER_ID)).toBe(false)
    expect(callsMatching('SET welcome_whatsapp_sent_at')).toHaveLength(0)
  })
})

describe('getMyTeam', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists members with masked names and how they joined', async () => {
    vi.mocked(query).mockResolvedValueOnce({
      rows: [
        { id: 'a', name: 'Jane Wanjiku', joined_at: '2026-10-01', joined_via: 'zone_link' },
        { id: 'b', name: 'Tom', joined_at: '2026-10-02', joined_via: 'chosen' },
      ],
    } as any)
    const res = makeRes()
    await getMyTeam({ user: { id: CAPTAIN_ID } } as any, res)

    const [sql, params] = vi.mocked(query).mock.calls[0]
    expect(String(sql)).toContain('WHERE u.captain_id = $1')
    expect(params).toEqual([CAPTAIN_ID])
    expect(res.json).toHaveBeenCalledWith([
      { id: 'a', name: 'Jane W.', joined_at: '2026-10-01', joined_via: 'zone_link' },
      { id: 'b', name: 'Tom', joined_at: '2026-10-02', joined_via: 'chosen' },
    ])
  })
})
