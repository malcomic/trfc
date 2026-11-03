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
vi.mock('../../utils/welcomeEmail.js', () => ({
  sendWelcomeEmailOnce: vi.fn(async () => false),
}))

import { query } from '../../config/db.js'
import { register } from '../../controllers/authController.js'

const USER = { id: '22222222-2222-4222-8222-222222222222', name: 'Jane', email: 'jane@example.com', phone: '0712345678', role: 'member' }
const JUJA_ID = '44444444-4444-4444-8444-444444444444'

function mockDb(opts: { answersFail?: boolean } = {}) {
  vi.mocked(query).mockImplementation((async (sql: string) => {
    if (sql.includes('FROM users WHERE phone_normalized')) return { rows: [] }
    if (sql.includes('FROM users WHERE LOWER(email)')) return { rows: [] }
    if (sql.includes('INSERT INTO users')) return { rows: [USER] }
    if (sql.includes('FROM regions r')) return { rows: [{ region_id: JUJA_ID, region_name: 'Juja', region_code: 'JUJ', referral_code: 'JUJ' }] }
    if (sql.includes('UPDATE users u')) return { rows: [{ id: USER.id }] }
    if (sql.includes('SELECT id, slug FROM regions')) return { rows: [{ id: JUJA_ID, slug: 'juja' }] }
    if (sql.includes('INSERT INTO member_answers')) {
      if (opts.answersFail) throw new Error('relation "member_answers" does not exist')
      return { rows: [] }
    }
    return { rows: [] }
  }) as any)
}

const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as any
const answerInserts = () => vi.mocked(query).mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO member_answers'))
const body = (extra: Record<string, unknown> = {}) => ({ ...USER, password: 'Password123', ...extra })

describe('register with sign-up answers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockDb()
  })

  it('creates the account with every question empty and saves no answers', async () => {
    const res = makeRes()
    await register({ body: body() } as any, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(answerInserts()).toHaveLength(0)
    expect(res.json.mock.calls[0][0].answersSaved).toBe(true)
  })

  it('saves each answer value and the Other text', async () => {
    const res = makeRes()
    const answers = {
      hardest_now: 'other',
      hardest_now_other: '  Night shifts  ',
      goal_3m: 'first_5k',
      time_with_trfc: 'lt_3m',
      want_more: 'zone_walks',
      exercise_frequency: '1_2',
      zone: 'juja',
    }
    await register({ body: body({ answers }) } as any, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(answerInserts()).toHaveLength(1)
    expect(answerInserts()[0][1]).toEqual([USER.id, 'other', 'Night shifts', 'first_5k', 'lt_3m', 'zone_walks', '1_2', 'juja', JUJA_ID])
  })

  it('drops unknown values and ignores Other text unless Other is chosen', async () => {
    const res = makeRes()
    const answers = { hardest_now: 'no_time', hardest_now_other: 'ignored', goal_3m: 'fly_to_mars', zone: 'outside' }
    await register({ body: body({ answers }) } as any, res)

    expect(answerInserts()[0][1]).toEqual([USER.id, 'no_time', null, null, null, null, null, 'outside', null])
  })

  it('still creates the account when saving answers fails', async () => {
    mockDb({ answersFail: true })
    const res = makeRes()
    await register({ body: body({ answers: { goal_3m: 'hike' } }) } as any, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json.mock.calls[0][0].answersSaved).toBe(false)
    expect(res.json.mock.calls[0][0].token).toBe('access')
  })

  it('saves the referral zone when no zone was answered', async () => {
    const res = makeRes()
    await register({ body: body({ referralCode: 'JUJ', answers: { goal_3m: 'stronger' } }) } as any, res)

    const params = answerInserts()[0][1] as unknown[]
    expect(params[7]).toBe('juja')
    expect(params[8]).toBe(JUJA_ID)
  })
})
