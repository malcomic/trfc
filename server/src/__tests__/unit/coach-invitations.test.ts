import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))

vi.mock('../../utils/emailService.js', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('../../utils/policies.js', () => ({
  currentPolicyVersion: vi.fn().mockResolvedValue('1.0'),
}))

vi.mock('../../utils/consents.js', async () => {
  const actual = await vi.importActual<typeof import('../../utils/consents.js')>('../../utils/consents.js')
  return {
    ...actual,
    recordConsent: vi.fn().mockResolvedValue(undefined),
    hashIp: vi.fn().mockReturnValue(null),
  }
})

import { query, getClient } from '../../config/db.js'
import {
  createCoachInvitation,
  getValidInvitation,
  hashInviteToken,
  INVITE_TTL_DAYS,
} from '../../utils/coachInvitations.js'
import { activateCoachInvitation, validateCoachInvitation } from '../../controllers/coachInvitationsController.js'
import { coachMiddleware } from '../../middleware/auth.js'

const APP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const INVITE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const VALID_TOKEN = 'c'.repeat(64)

type Handler = (sql: string, params: any[]) => { rows: any[]; rowCount?: number } | undefined

function routeQueries(handler: Handler) {
  vi.mocked(query).mockImplementation((async (sql: string, params: any[] = []) => {
    return handler(sql, params) ?? { rows: [], rowCount: 0 }
  }) as any)
}

function mockClient(handler: Handler) {
  const client = {
    query: vi.fn(async (sql: string, params: any[] = []) => handler(sql, params) ?? { rows: [], rowCount: 0 }),
    release: vi.fn(),
  }
  vi.mocked(getClient).mockResolvedValue(client as any)
  return client
}

function mockRes() {
  const res: Partial<Response> & { statusCode: number; body: any } = { statusCode: 200, body: undefined }
  res.status = vi.fn((code: number) => {
    res.statusCode = code
    return res as Response
  }) as any
  res.json = vi.fn((body: any) => {
    res.body = body
    return res as Response
  }) as any
  return res
}

describe('createCoachInvitation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('stores only the SHA-256 hash and retires earlier unused invites', async () => {
    routeQueries((sql) => {
      if (sql.includes('RETURNING expires_at')) {
        return { rows: [{ expires_at: new Date('2026-11-23T00:00:00Z') }] }
      }
      return undefined
    })
    const { token } = await createCoachInvitation({
      applicationId: APP_ID,
      email: 'Coach@Example.com',
      createdBy: 'admin-1',
    })

    expect(token).toMatch(/^[a-f0-9]{64}$/)
    const calls = vi.mocked(query).mock.calls
    expect(String(calls[0][0])).toContain('UPDATE coach_invitations SET used_at = NOW()')
    const insert = calls.find(([sql]) => String(sql).includes('INSERT INTO coach_invitations'))!
    expect(insert[1]).toEqual([
      APP_ID,
      'coach@example.com',
      hashInviteToken(token),
      INVITE_TTL_DAYS,
      'admin-1',
    ])
    expect(JSON.stringify(calls)).not.toContain(token)
  })
})

describe('getValidInvitation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects malformed tokens without querying', async () => {
    expect(await getValidInvitation('not-valid')).toBeNull()
    expect(query).not.toHaveBeenCalled()
  })

  it('returns invitation details when unused and unexpired', async () => {
    routeQueries(() => ({
      rows: [
        {
          id: INVITE_ID,
          application_id: APP_ID,
          email: 'coach@example.com',
          expires_at: new Date('2026-11-23T00:00:00Z'),
          full_name: 'Jane Coach',
          phone: '254712345678',
          status: 'accepted',
          user_id: null,
        },
      ],
    }))
    const invite = await getValidInvitation(VALID_TOKEN)
    expect(invite?.fullName).toBe('Jane Coach')
    expect(invite?.applicationId).toBe(APP_ID)
  })
})

describe('validateCoachInvitation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 410 for an invalid token', async () => {
    routeQueries(() => ({ rows: [] }))
    const res = mockRes()
    await validateCoachInvitation({ query: { token: VALID_TOKEN } } as any, res as Response)
    expect(res.statusCode).toBe(410)
  })

  it('returns preview for a valid invite', async () => {
    routeQueries(() => ({
      rows: [
        {
          id: INVITE_ID,
          application_id: APP_ID,
          email: 'coach@example.com',
          expires_at: new Date('2026-11-23T00:00:00Z'),
          full_name: 'Jane Coach',
          phone: '254712345678',
          status: 'accepted',
          user_id: null,
        },
      ],
    }))
    const res = mockRes()
    await validateCoachInvitation({ query: { token: VALID_TOKEN } } as any, res as Response)
    expect(res.body).toMatchObject({ fullName: 'Jane Coach', email: 'coach@example.com' })
  })
})

describe('activateCoachInvitation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects when an account with the email already exists', async () => {
    routeQueries((sql) => {
      if (sql.includes('FROM coach_invitations i')) {
        return {
          rows: [
            {
              id: INVITE_ID,
              application_id: APP_ID,
              email: 'coach@example.com',
              expires_at: new Date('2026-11-23T00:00:00Z'),
              full_name: 'Jane Coach',
              phone: '254712345678',
              status: 'accepted',
              user_id: null,
            },
          ],
        }
      }
      if (sql.includes('LOWER(email)')) return { rows: [{ id: 'existing' }] }
      return undefined
    })
    mockClient(() => undefined)
    const res = mockRes()
    await activateCoachInvitation(
      {
        body: {
          token: VALID_TOKEN,
          password: 'password123',
          phone: '0712345678',
          acceptTerms: true,
          policyVersion: '1.0',
        },
        ip: '127.0.0.1',
      } as any,
      res as Response
    )
    expect(res.statusCode).toBe(400)
    expect(res.body.error).toMatch(/already exists/)
  })

  it('creates the coach user on a valid activation', async () => {
    routeQueries((sql) => {
      if (sql.includes('FROM coach_invitations i')) {
        return {
          rows: [
            {
              id: INVITE_ID,
              application_id: APP_ID,
              email: 'coach@example.com',
              expires_at: new Date('2026-11-23T00:00:00Z'),
              full_name: 'Jane Coach',
              phone: '254712345678',
              status: 'accepted',
              user_id: null,
            },
          ],
        }
      }
      return { rows: [] }
    })
    const client = mockClient((sql) => {
      if (sql.includes('INSERT INTO users')) {
        return {
          rows: [{ id: 'user-1', name: 'Jane Coach', email: 'coach@example.com', phone: '0712345678', role: 'coach' }],
        }
      }
      return undefined
    })
    const res = mockRes()
    await activateCoachInvitation(
      {
        body: {
          token: VALID_TOKEN,
          password: 'password123',
          phone: '0712345678',
          acceptTerms: true,
          policyVersion: '1.0',
        },
        ip: '127.0.0.1',
      } as any,
      res as Response
    )
    expect(res.statusCode).toBe(201)
    expect(res.body).toMatchObject({ ok: true, email: 'coach@example.com' })
    const sqls = client.query.mock.calls.map(([sql]) => String(sql))
    expect(sqls.some((s) => s.includes("INSERT INTO users"))).toBe(true)
    expect(sqls.some((s) => s.includes('INSERT INTO coaches'))).toBe(true)
    expect(sqls).toContain('COMMIT')
  })
})

describe('coachMiddleware', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects non-active coaches', async () => {
    routeQueries(() => ({ rows: [{ status: 'suspended' }] }))
    const res = mockRes()
    const next = vi.fn()
    await coachMiddleware({ user: { id: 'u1', role: 'coach' } } as any, res as Response, next)
    expect(res.statusCode).toBe(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('allows active coaches', async () => {
    routeQueries(() => ({ rows: [{ status: 'active' }] }))
    const res = mockRes()
    const next = vi.fn()
    await coachMiddleware({ user: { id: 'u1', role: 'coach' } } as any, res as Response, next)
    expect(next).toHaveBeenCalled()
  })
})
