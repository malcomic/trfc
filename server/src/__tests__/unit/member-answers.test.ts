import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
}))

import { query } from '../../config/db.js'
import { hasAnyAnswer, parseAnswers } from '../../utils/memberAnswers.js'
import { deleteMyAnswers, getMyAnswers, updateMyAnswers } from '../../controllers/usersController.js'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as any
const req = (body: unknown = {}) => ({ user: { id: USER_ID }, body }) as any

describe('parseAnswers', () => {
  it('returns all nulls for missing or malformed input', () => {
    for (const input of [undefined, null, 'x', [], {}]) {
      expect(hasAnyAnswer(parseAnswers(input))).toBe(false)
    }
  })

  it('caps the Other text at 120 characters', () => {
    const parsed = parseAnswers({ hardest_now: 'other', hardest_now_other: 'a'.repeat(200) })
    expect(parsed.hardest_now_other).toHaveLength(120)
  })

  it('rejects zone values that are not slugs', () => {
    expect(parseAnswers({ zone: "juja'; DROP TABLE users" }).zone).toBeNull()
    expect(parseAnswers({ zone: 'prefer_not_to_say' }).zone).toBe('prefer_not_to_say')
  })
})

describe('member answers handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('returns empty answers when none were saved', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as any)
    const res = makeRes()
    await getMyAnswers(req(), res)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ hardest_now: null, zone: null, answers_saved_at: null }))
  })

  it('upserts the member answers and returns them', async () => {
    const stored = { hardest_now: 'cost', zone: 'not_sure', answers_saved_at: '2026-11-03T06:00:00Z' }
    vi.mocked(query).mockImplementation((async (sql: string) =>
      sql.includes('FROM member_answers') ? { rows: [stored] } : { rows: [] }) as any)
    const res = makeRes()
    await updateMyAnswers(req({ hardest_now: 'cost', zone: 'not_sure' }), res)

    const upsert = vi.mocked(query).mock.calls.find(([sql]) => String(sql).includes('ON CONFLICT (user_id)'))!
    expect(upsert[1]).toEqual([USER_ID, 'cost', null, null, null, null, null, 'not_sure', null])
    expect(res.json).toHaveBeenCalledWith(stored)
  })

  it('deletes only the member own answers', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as any)
    const res = makeRes()
    await deleteMyAnswers(req(), res)

    const [sql, params] = vi.mocked(query).mock.calls[0]
    expect(sql).toContain('UPDATE member_answers')
    expect(sql).toContain('hardest_now = NULL')
    expect(params).toEqual([USER_ID])
    expect(res.status).not.toHaveBeenCalled()
  })
})
