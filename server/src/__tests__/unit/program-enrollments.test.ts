import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))

import { query } from '../../config/db.js'
import { enrollProgram, getMyPrograms, sanitizeQuizAnswers } from '../../controllers/programsController.js'

const USER_ID = '22222222-2222-4222-8222-222222222222'
const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as any
const makeReq = (body: any = {}) => ({ body, user: { id: USER_ID, email: 'a@b.c', role: 'member' } }) as any

beforeEach(() => {
  vi.mocked(query).mockReset()
})

describe('enrollProgram', () => {
  it('joins the free program and returns 201', async () => {
    const row = { program: 'foundations', status: 'active', amount: 0, enrolled_at: '2026-10-27T10:00:00Z' }
    vi.mocked(query).mockResolvedValueOnce({ rows: [row] } as any)
    const res = makeRes()
    await enrollProgram(makeReq({ program: 'foundations' }), res)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(row)
    const [sql, params] = vi.mocked(query).mock.calls[0] as any[]
    expect(sql).toContain('ON CONFLICT (user_id, program)')
    expect(params).toEqual([USER_ID, 'foundations', null])
  })

  it('refuses paid programs with 409 until paid joining opens', async () => {
    const res = makeRes()
    await enrollProgram(makeReq({ program: 'fat_loss' }), res)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ error: 'Coming soon' })
    expect(query).not.toHaveBeenCalled()
  })

  it('rejects unknown programs with 400', async () => {
    const res = makeRes()
    await enrollProgram(makeReq({ program: 'couch-to-5k' }), res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(query).not.toHaveBeenCalled()
  })

  it('stores only the known quiz answers', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rows: [{}] } as any)
    await enrollProgram(
      makeReq({ program: 'foundations', quizAnswers: { goal: 'move', experience: 'none', days: 'few', admin: true } }),
      makeRes()
    )
    const [, params] = vi.mocked(query).mock.calls[0] as any[]
    expect(JSON.parse(params[2])).toEqual({ goal: 'move', experience: 'none', days: 'few' })
  })
})

describe('sanitizeQuizAnswers', () => {
  it('returns null for missing or invalid input', () => {
    expect(sanitizeQuizAnswers(undefined)).toBeNull()
    expect(sanitizeQuizAnswers('x')).toBeNull()
    expect(sanitizeQuizAnswers([])).toBeNull()
    expect(sanitizeQuizAnswers({ goal: 5 })).toBeNull()
  })

  it('drops overly long values', () => {
    expect(sanitizeQuizAnswers({ goal: 'x'.repeat(50), days: 'most' })).toEqual({ days: 'most' })
  })
})

describe('getMyPrograms', () => {
  it('lists the user enrolments', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rows: [{ program: 'foundations' }] } as any)
    const res = makeRes()
    await getMyPrograms(makeReq(), res)
    expect(res.json).toHaveBeenCalledWith([{ program: 'foundations' }])
    expect((vi.mocked(query).mock.calls[0] as any[])[1]).toEqual([USER_ID])
  })
})
