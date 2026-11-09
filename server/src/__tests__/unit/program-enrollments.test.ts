import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))

import { query } from '../../config/db.js'
import { enrollProgram, getMyPrograms, isEnrollable, sanitizeQuizAnswers } from '../../controllers/programsController.js'

const USER_ID = '22222222-2222-4222-8222-222222222222'
const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as any
const makeReq = (body: any = {}) => ({ body, user: { id: USER_ID, email: 'a@b.c', role: 'member' } }) as any

const PROGRAMS: Record<string, { id: string; slug: string; status: string; price: number }> = {
  foundations: { id: 'foundations', slug: 'couch-to-5k', status: 'published', price: 0 },
  fat_loss: { id: 'fat_loss', slug: 'fat-loss', status: 'published', price: 3497 },
  free_draft: { id: 'free_draft', slug: 'free-draft', status: 'draft', price: 0 },
}

const insertCalls = () =>
  vi.mocked(query).mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO program_enrollments')) as any[]

function routeQueries(inserted: Record<string, unknown> = {}) {
  vi.mocked(query).mockImplementation((async (sql: string, params: any[] = []) => {
    if (sql.includes('FROM programs WHERE id = $1 OR slug = $1')) {
      const p = Object.values(PROGRAMS).find((x) => x.id === params[0] || x.slug === params[0])
      return { rows: p ? [{ ...p, name: p.id, is_core: true, sort_order: 1 }] : [] }
    }
    if (sql.includes("state = 'published'")) {
      const p = PROGRAMS[params[0]]
      return { rows: p ? [{ content: { page: { price: p.price }, card: {}, plan: {}, weeks: [] } }] : [] }
    }
    if (sql.includes('INSERT INTO program_enrollments')) return { rows: [inserted] }
    return { rows: [] }
  }) as any)
}

beforeEach(() => {
  vi.mocked(query).mockReset()
})

describe('enrollProgram', () => {
  it('joins the free program and returns 201', async () => {
    const row = { program: 'foundations', status: 'active', amount: 0, enrolled_at: '2026-10-27T10:00:00Z' }
    routeQueries(row)
    const res = makeRes()
    await enrollProgram(makeReq({ program: 'foundations' }), res)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(row)
    const [sql, params] = insertCalls()[0]
    expect(sql).toContain('ON CONFLICT (user_id, program)')
    expect(params).toEqual([USER_ID, 'foundations', null])
  })

  it('accepts the slug and stores the program id', async () => {
    routeQueries()
    await enrollProgram(makeReq({ program: 'couch-to-5k' }), makeRes())
    expect(insertCalls()[0][1][1]).toBe('foundations')
  })

  it('refuses paid programs with 409 until paid joining opens', async () => {
    routeQueries()
    const res = makeRes()
    await enrollProgram(makeReq({ program: 'fat_loss' }), res)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ error: 'Coming soon' })
    expect(insertCalls()).toHaveLength(0)
  })

  it('refuses programs that are not published', async () => {
    routeQueries()
    const res = makeRes()
    await enrollProgram(makeReq({ program: 'free_draft' }), res)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(insertCalls()).toHaveLength(0)
  })

  it('rejects unknown programs with 400', async () => {
    routeQueries()
    const res = makeRes()
    await enrollProgram(makeReq({ program: 'nope' }), res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(insertCalls()).toHaveLength(0)
  })

  it('stores only the known quiz answers', async () => {
    routeQueries()
    await enrollProgram(
      makeReq({ program: 'foundations', quizAnswers: { goal: 'move', experience: 'none', days: 'few', admin: true } }),
      makeRes()
    )
    const [, params] = insertCalls()[0]
    expect(JSON.parse(params[2])).toEqual({ goal: 'move', experience: 'none', days: 'few' })
  })
})

describe('isEnrollable', () => {
  const row = { id: 'x', slug: 'x', name: 'X', status: 'published', is_core: false, sort_order: 1 } as const
  const content = (price: number) => ({ page: { price } }) as any

  it('allows only published free programs with content', () => {
    expect(isEnrollable(row, content(0))).toBe(true)
    expect(isEnrollable(row, content(100))).toBe(false)
    expect(isEnrollable({ ...row, status: 'archived' }, content(0))).toBe(false)
    expect(isEnrollable(row, null)).toBe(false)
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
