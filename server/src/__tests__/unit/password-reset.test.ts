import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))

vi.mock('../../utils/emailService.js', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}))

import { query, getClient } from '../../config/db.js'
import { sendEmail } from '../../utils/emailService.js'
import {
  consumePasswordResetToken,
  createPasswordResetToken,
  hashResetToken,
  validatePassword,
} from '../../utils/passwordReset.js'
import { forgotPassword, resetPassword } from '../../controllers/authController.js'
import { isTokenStale } from '../../utils/tokenUtils.js'

const USER_ID = '22222222-2222-4222-8222-222222222222'
const VALID_TOKEN = 'a'.repeat(64)

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

const req = (body: any) => ({ body }) as Request

describe('validatePassword', () => {
  it('requires at least 8 characters', () => {
    expect(validatePassword(undefined)).toMatch(/required/)
    expect(validatePassword('short')).toMatch(/at least 8/)
    expect(validatePassword('longenough')).toBeNull()
  })
})

describe('createPasswordResetToken', () => {
  beforeEach(() => vi.clearAllMocks())

  it('stores only the SHA-256 hash and retires earlier tokens', async () => {
    routeQueries(() => undefined)
    const token = await createPasswordResetToken(USER_ID)

    expect(token).toMatch(/^[a-f0-9]{64}$/)
    const calls = vi.mocked(query).mock.calls
    expect(String(calls[0][0])).toContain('UPDATE password_reset_tokens SET used_at = NOW()')
    const insert = calls.find(([sql]) => String(sql).includes('INSERT INTO password_reset_tokens'))!
    expect(insert[1]).toEqual([USER_ID, hashResetToken(token), 60])
    expect(JSON.stringify(calls)).not.toContain(token)
  })
})

describe('consumePasswordResetToken', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects malformed tokens without touching the database', async () => {
    expect(await consumePasswordResetToken('not-a-token', 'newpassword')).toBeNull()
    expect(getClient).not.toHaveBeenCalled()
  })

  it('rejects expired or used tokens', async () => {
    const client = mockClient(() => undefined)
    expect(await consumePasswordResetToken(VALID_TOKEN, 'newpassword')).toBeNull()

    const sqls = client.query.mock.calls.map(([sql]) => String(sql))
    expect(sqls.some((s) => s.includes('used_at IS NULL AND expires_at > NOW()'))).toBe(true)
    expect(sqls.some((s) => s.includes('UPDATE users'))).toBe(false)
    expect(sqls).toContain('ROLLBACK')
    expect(client.release).toHaveBeenCalled()
  })

  it('updates the password, stamps password_changed_at and marks the token used', async () => {
    const client = mockClient((sql, params) => {
      if (sql.includes('FROM password_reset_tokens')) {
        expect(params[0]).toBe(hashResetToken(VALID_TOKEN))
        return { rows: [{ id: 't1', user_id: USER_ID }] }
      }
      if (sql.includes('UPDATE users')) return { rows: [{ id: USER_ID, email: 'jane@example.com', name: 'Jane' }] }
      return undefined
    })

    const user = await consumePasswordResetToken(VALID_TOKEN, 'newpassword')

    expect(user).toEqual({ id: USER_ID, email: 'jane@example.com', name: 'Jane' })
    const calls = client.query.mock.calls.map(([sql, params]) => [String(sql), params] as const)
    const userUpdate = calls.find(([sql]) => sql.includes('UPDATE users'))!
    expect(userUpdate[0]).toContain('password_changed_at = NOW()')
    expect(String(userUpdate[1]![0])).toMatch(/^\$2[aby]\$10\$/)
    expect(calls.some(([sql]) => sql.includes('UPDATE password_reset_tokens SET used_at = NOW()'))).toBe(true)
    expect(calls.map(([sql]) => sql)).toContain('COMMIT')
  })
})

describe('forgotPassword', () => {
  beforeEach(() => vi.clearAllMocks())

  it('gives the same response for known and unknown emails, and only emails known ones', async () => {
    routeQueries(() => undefined)
    const unknown = mockRes()
    await forgotPassword(req({ email: 'nobody@example.com' }), unknown as Response)
    expect(sendEmail).not.toHaveBeenCalled()

    routeQueries((sql) =>
      sql.includes('FROM users') ? { rows: [{ id: USER_ID, name: 'Jane', email: 'jane@example.com' }] } : undefined
    )
    const known = mockRes()
    await forgotPassword(req({ email: 'Jane@Example.com' }), known as Response)

    expect(known.statusCode).toBe(unknown.statusCode)
    expect(known.body).toEqual(unknown.body)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    const mail = vi.mocked(sendEmail).mock.calls[0][0]
    expect(mail.to).toBe('jane@example.com')
    expect(mail.html).toMatch(/\/reset-password\?token=[a-f0-9]{64}/)
  })

  it('requires an email', async () => {
    const res = mockRes()
    await forgotPassword(req({}), res as Response)
    expect(res.statusCode).toBe(400)
  })
})

describe('resetPassword', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects short passwords before checking the token', async () => {
    const res = mockRes()
    await resetPassword(req({ token: VALID_TOKEN, password: 'short' }), res as Response)
    expect(res.statusCode).toBe(400)
    expect(getClient).not.toHaveBeenCalled()
  })

  it('returns 400 for an invalid link', async () => {
    mockClient(() => undefined)
    const res = mockRes()
    await resetPassword(req({ token: VALID_TOKEN, password: 'newpassword' }), res as Response)
    expect(res.statusCode).toBe(400)
    expect(res.body.error).toMatch(/invalid or has expired/)
    expect(sendEmail).not.toHaveBeenCalled()
  })
})

describe('isTokenStale', () => {
  const changedAt = new Date('2026-10-22T09:00:00.500Z')
  const changedSec = Math.floor(changedAt.getTime() / 1000)

  it('never treats tokens as stale when the password was never changed', () => {
    expect(isTokenStale(1, null)).toBe(false)
  })

  it('rejects tokens issued before the change and accepts ones issued in the same second or later', () => {
    expect(isTokenStale(changedSec - 1, changedAt)).toBe(true)
    expect(isTokenStale(changedSec, changedAt)).toBe(false)
    expect(isTokenStale(changedSec + 1, changedAt.toISOString())).toBe(false)
  })

  it('treats tokens without an issued-at time as stale once the password has changed', () => {
    expect(isTokenStale(undefined, changedAt)).toBe(true)
  })
})
