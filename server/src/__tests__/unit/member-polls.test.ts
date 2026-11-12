import { describe, it, expect, vi, beforeEach } from 'vitest'

const client = { query: vi.fn(), release: vi.fn() }
vi.mock('../../config/db.js', () => ({ query: vi.fn(), getClient: vi.fn(async () => client) }))
vi.mock('../../utils/emailService.js', () => ({ sendEmail: vi.fn(async () => ({ success: true })) }))

import { query } from '../../config/db.js'
import { listMemberPolls, voteInPoll } from '../../controllers/memberPerksController.js'
import { createPoll, deletePoll, updatePoll } from '../../controllers/adminPollsController.js'
import { PollError, castVote, parsePollInput, percentages, pollResults, pollStatus } from '../../utils/memberPolls.js'

const POLL = '11111111-1111-4111-8111-111111111111'
const OTHER_POLL = '22222222-2222-4222-8222-222222222222'
const OPT_A = '33333333-3333-4333-8333-333333333333'
const OPT_B = '44444444-4444-4444-8444-444444444444'
const NOW = new Date('2026-11-10T09:00:00Z')
const openPoll = { id: POLL, opens_at: '2026-11-01T00:00:00Z', closes_at: '2026-11-20T00:00:00Z', closed_early_at: null }
const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as any

/** A tiny in-memory poll: options belong to POLL, votes are keyed by user like the real primary key. */
function memoryDb(opts: { member?: boolean; poll?: any; votes?: Map<string, string> } = {}) {
  const votes = opts.votes ?? new Map<string, string>()
  const options = [
    { id: OPT_A, poll_id: POLL, label: 'Ngong Hills', sort_order: 10 },
    { id: OPT_B, poll_id: POLL, label: 'Mt Longonot', sort_order: 20 },
  ]
  const db = {
    votes,
    query: vi.fn(async (sql: string, params: any[] = []) => {
      if (sql.includes('member_until > NOW()')) return { rows: [{ active: opts.member ?? true }] }
      if (sql.includes('FROM member_polls WHERE id = $1')) return { rows: opts.poll === null ? [] : [opts.poll ?? openPoll] }
      if (sql.includes('FROM member_poll_options WHERE id = $1 AND poll_id = $2')) {
        return { rows: options.filter((o) => o.id === params[0] && o.poll_id === params[1]) }
      }
      if (sql.includes('INSERT INTO member_votes')) {
        votes.set(params[1], params[2])
        return { rows: [] }
      }
      if (sql.includes('FROM member_poll_options o')) {
        return {
          rows: options.map((o) => ({ ...o, votes: [...votes.values()].filter((v) => v === o.id).length })),
        }
      }
      if (sql.includes('FROM member_votes WHERE user_id')) {
        return { rows: votes.has(params[0]) ? [{ poll_id: POLL, option_id: votes.get(params[0]) }] : [] }
      }
      if (sql.includes('FROM member_polls')) return { rows: [{ ...openPoll, question: 'Next hike?', description: '' }] }
      return { rows: [] }
    }),
  }
  return db
}

beforeEach(() => {
  vi.mocked(query).mockReset()
  client.query.mockReset()
})

describe('pollStatus', () => {
  it('is upcoming, open, then closed', () => {
    expect(pollStatus({ ...openPoll, opens_at: '2026-11-11T00:00:00Z' }, NOW)).toBe('upcoming')
    expect(pollStatus(openPoll, NOW)).toBe('open')
    expect(pollStatus({ ...openPoll, closes_at: '2026-11-10T09:00:00Z' }, NOW)).toBe('closed')
    expect(pollStatus({ ...openPoll, closed_early_at: '2026-11-09T00:00:00Z' }, NOW)).toBe('closed')
  })
})

describe('percentages', () => {
  it('adds up to 100 and handles no votes', () => {
    expect(percentages([1, 1, 1])).toEqual([34, 33, 33])
    expect(percentages([2, 1])).toEqual([67, 33])
    expect(percentages([0, 0])).toEqual([0, 0])
    expect(percentages([5, 0])).toEqual([100, 0])
  })
})

describe('castVote', () => {
  it('upserts, so a changed vote replaces the old one', async () => {
    const db = memoryDb()
    await castVote(db as any, 'u1', POLL, OPT_A, NOW)
    await castVote(db as any, 'u1', POLL, OPT_B, NOW)
    expect([...db.votes.entries()]).toEqual([['u1', OPT_B]])
    const insert = db.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO member_votes'))!
    expect(insert[0]).toMatch(/ON CONFLICT \(poll_id, user_id\) DO UPDATE SET option_id = EXCLUDED.option_id/)
  })

  it('refuses closed and upcoming polls', async () => {
    const closed = memoryDb({ poll: { ...openPoll, closed_early_at: '2026-11-09T00:00:00Z' } })
    await expect(castVote(closed as any, 'u1', POLL, OPT_A, NOW)).rejects.toThrow('This poll has closed')
    const upcoming = memoryDb({ poll: { ...openPoll, opens_at: '2026-11-15T00:00:00Z' } })
    await expect(castVote(upcoming as any, 'u1', POLL, OPT_A, NOW)).rejects.toThrow('This poll is not open yet')
    expect(closed.votes.size + upcoming.votes.size).toBe(0)
  })

  it("refuses an option from another poll", async () => {
    const db = memoryDb({ poll: { ...openPoll, id: OTHER_POLL } })
    await expect(castVote(db as any, 'u1', OTHER_POLL, OPT_A, NOW)).rejects.toThrow('Pick one of the options in this poll')
    expect(db.votes.size).toBe(0)
  })

  it('refuses non-members', async () => {
    const db = memoryDb({ member: false })
    const error = await castVote(db as any, 'u1', POLL, OPT_A, NOW).catch((e) => e)
    expect(error).toBeInstanceOf(PollError)
    expect(error.status).toBe(403)
  })
})

describe('pollResults', () => {
  it('counts votes, works out percentages and marks my vote', async () => {
    const db = memoryDb({ votes: new Map([['u1', OPT_A], ['u2', OPT_A], ['u3', OPT_B]]) })
    const result = (await pollResults(db as any, [POLL], 'u3')).get(POLL)!
    expect(result.total).toBe(3)
    expect(result.options.map((o) => [o.label, o.votes, o.percent])).toEqual([
      ['Ngong Hills', 2, 67],
      ['Mt Longonot', 1, 33],
    ])
    expect(result.myVote).toBe(OPT_B)
  })
})

describe('member poll endpoints', () => {
  it('refuses non-members', async () => {
    const db = memoryDb({ member: false })
    vi.mocked(query).mockImplementation(db.query as any)
    const res = makeRes()
    await listMemberPolls({ user: { id: 'u1' } } as any, res)
    expect(res.status).toHaveBeenCalledWith(403)
    const voteRes = makeRes()
    await voteInPoll({ user: { id: 'u1' }, params: { id: POLL }, body: { optionId: OPT_A } } as any, voteRes)
    expect(voteRes.status).toHaveBeenCalledWith(403)
    expect(db.votes.size).toBe(0)
  })

  it('lists polls with live results and my vote', async () => {
    const db = memoryDb({ votes: new Map([['u1', OPT_B]]) })
    vi.mocked(query).mockImplementation(db.query as any)
    const res = makeRes()
    await listMemberPolls({ user: { id: 'u1' } } as any, res)
    const [poll] = res.json.mock.calls[0][0]
    expect(poll).toMatchObject({ id: POLL, total: 1, myVote: OPT_B })
    expect(poll.options[1]).toMatchObject({ id: OPT_B, percent: 100 })
  })

  it('returns the updated poll after a vote', async () => {
    const db = memoryDb()
    vi.mocked(query).mockImplementation(db.query as any)
    const res = makeRes()
    await voteInPoll({ user: { id: 'u1' }, params: { id: POLL }, body: { optionId: OPT_A } } as any, res)
    expect(res.status).not.toHaveBeenCalled()
    expect(res.json.mock.calls[0][0]).toMatchObject({ myVote: OPT_A, total: 1 })
  })
})

describe('admin polls', () => {
  it('needs a question, 2 to 8 distinct options and a future close date', () => {
    const base = { question: 'Next hike?', options: ['A', 'B'], closesAt: '2026-11-20T00:00:00Z' }
    expect(parsePollInput(base, NOW).ok).toBe(true)
    expect(parsePollInput({ ...base, options: ['A'] }, NOW)).toEqual({ ok: false, error: 'Add 2 to 8 options' })
    expect(parsePollInput({ ...base, options: Array.from({ length: 9 }, (_, i) => `O${i}`) }, NOW).ok).toBe(false)
    expect(parsePollInput({ ...base, options: ['A', 'a'] }, NOW)).toEqual({ ok: false, error: 'Each option must be different' })
    expect(parsePollInput({ ...base, closesAt: '2026-11-01T00:00:00Z' }, NOW).ok).toBe(false)
  })

  it('locks options once votes exist', async () => {
    client.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FOR UPDATE')) return { rows: [{ ...openPoll, votes: 3 }] }
      return { rows: [] }
    })
    const res = makeRes()
    await updatePoll({ params: { id: POLL }, body: { options: ['X', 'Y'] } } as any, res)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(client.query.mock.calls.some(([sql]) => String(sql).includes('DELETE FROM member_poll_options'))).toBe(false)
  })

  it('still lets the question change after votes', async () => {
    client.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FOR UPDATE')) return { rows: [{ ...openPoll, votes: 3 }] }
      return { rows: [] }
    })
    vi.mocked(query).mockImplementation(memoryDb().query as any)
    const res = makeRes()
    await updatePoll({ params: { id: POLL }, body: { question: 'Where next?' } } as any, res)
    expect(res.status).not.toHaveBeenCalled()
    expect(client.query.mock.calls.some(([sql]) => String(sql).startsWith('UPDATE member_polls SET question'))).toBe(true)
  })

  it('replaces options while nobody has voted', async () => {
    client.query.mockImplementation(async (sql: string) => {
      if (sql.includes('FOR UPDATE')) return { rows: [{ ...openPoll, votes: 0 }] }
      return { rows: [] }
    })
    vi.mocked(query).mockImplementation(memoryDb().query as any)
    const res = makeRes()
    await updatePoll({ params: { id: POLL }, body: { options: ['X', 'Y', 'Z'] } } as any, res)
    expect(res.status).not.toHaveBeenCalled()
    expect(client.query.mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO member_poll_options'))).toHaveLength(3)
  })

  it('will not delete a poll with votes', async () => {
    vi.mocked(query).mockImplementation((async (sql: string) => {
      if (sql.startsWith('DELETE FROM member_polls')) return { rows: [] }
      if (sql.includes('SELECT 1 FROM member_polls')) return { rows: [{ '?column?': 1 }] }
      return { rows: [] }
    }) as any)
    const res = makeRes()
    await deletePoll({ params: { id: POLL } } as any, res)
    expect(res.status).toHaveBeenCalledWith(409)
    const del = vi.mocked(query).mock.calls.find(([sql]) => String(sql).startsWith('DELETE FROM member_polls'))!
    expect(String(del[0])).toContain('NOT EXISTS (SELECT 1 FROM member_votes')
  })

  it('creates a poll with its options and can announce it to members', async () => {
    client.query.mockImplementation(async (sql: string) => {
      if (sql.includes('INSERT INTO member_polls')) return { rows: [{ id: POLL }] }
      return { rows: [] }
    })
    const db = memoryDb()
    vi.mocked(query).mockImplementation((async (sql: string, params: any[]) => {
      if (sql.includes('INSERT INTO announcements (')) return { rows: [{ id: 'ann-1' }] }
      if (sql.includes('INSERT INTO announcement_emails')) return { rows: [], rowCount: 4 }
      return db.query(sql, params)
    }) as any)
    const res = makeRes()
    await createPoll(
      { body: { question: 'Next hike?', options: ['A', 'B'], closesAt: '2099-01-01T00:00:00Z', announce: true }, user: { id: 'admin' } } as any,
      res
    )
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json.mock.calls[0][0]).toMatchObject({ announced: true, poll: { id: POLL } })
    expect(client.query.mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO member_poll_options'))).toHaveLength(2)
    const ann = vi.mocked(query).mock.calls.find(([sql]) => String(sql).includes('INSERT INTO announcements ('))!
    expect((ann[1] as unknown[]).slice(4, 7)).toEqual(['news', 'members', true])
  })
})
