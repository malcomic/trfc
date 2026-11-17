import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({ query: vi.fn(), getClient: vi.fn() }))
vi.mock('../../utils/programCatalog.js', () => ({
  findProgram: vi.fn(),
  getPublishedContent: vi.fn().mockResolvedValue({ weeks: [] }),
}))
vi.mock('../../utils/programProgress.js', () => ({
  requireEnrollment: vi.fn(),
}))

import { query, getClient } from '../../config/db.js'
import { findProgram } from '../../utils/programCatalog.js'
import { requireEnrollment } from '../../utils/programProgress.js'
import { setCoachPrograms } from '../../controllers/adminCoachesController.js'
import {
  getThread,
  postThreadMessage,
  getInboxUnreadCount,
} from '../../controllers/coachMessagingController.js'
import {
  getProgramMessages,
  postProgramMessage,
} from '../../controllers/programMessagingController.js'
import {
  normalizeMessageBody,
  CoachMessagingError,
} from '../../utils/coachMessaging.js'

const COACH_A = '11111111-1111-4111-8111-111111111111'
const COACH_B = '22222222-2222-4222-8222-222222222222'
const USER_ID = '33333333-3333-4333-8333-333333333333'
const PROGRAM = {
  id: 'foundations',
  slug: 'couch-to-5k',
  name: 'Couch to 5K',
  status: 'published',
  is_core: true,
  sort_order: 1,
}

const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as any

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(findProgram).mockResolvedValue(PROGRAM as any)
})

describe('normalizeMessageBody', () => {
  it('rejects empty bodies', () => {
    expect(() => normalizeMessageBody('   ')).toThrow(CoachMessagingError)
  })

  it('trims valid bodies', () => {
    expect(normalizeMessageBody('  hello  ')).toBe('hello')
  })
})

describe('setCoachPrograms one-coach-per-program', () => {
  it('deletes other coaches assignments for selected programs before insert', async () => {
    const clientQuery = vi.fn().mockResolvedValue({ rows: [] })
    vi.mocked(getClient).mockResolvedValue({ query: clientQuery, release: vi.fn() } as any)
    vi.mocked(query).mockImplementation((async (sql: string) => {
      if (sql.includes('SELECT user_id FROM coaches')) return { rows: [{ user_id: COACH_A }] }
      if (sql.includes('SELECT id FROM programs')) return { rows: [{ id: 'foundations' }] }
      if (sql.includes('previous') || sql.includes('a.coach_id <>')) {
        return { rows: [{ program_id: 'foundations', coach_id: COACH_B, name: 'Other' }] }
      }
      if (sql.includes('SELECT p.id, p.slug, p.name')) {
        return { rows: [{ id: 'foundations', slug: 'couch-to-5k', name: 'Couch to 5K' }] }
      }
      return { rows: [] }
    }) as any)

    const res = makeRes()
    await setCoachPrograms(
      { params: { userId: COACH_A }, body: { programIds: ['foundations'] }, user: { id: COACH_A } } as any,
      res
    )

    const sqls = clientQuery.mock.calls.map(([sql]: [string]) => String(sql))
    expect(sqls.some((s) => s.includes('DELETE FROM coach_program_assignments WHERE coach_id'))).toBe(true)
    expect(sqls.some((s) => s.includes('DELETE FROM coach_program_assignments WHERE program_id = ANY'))).toBe(
      true
    )
    expect(res.json.mock.calls[0][0].movedFrom).toEqual([
      { programId: 'foundations', previousCoachId: COACH_B, previousCoachName: 'Other' },
    ])
  })
})

describe('coach messaging access', () => {
  it('returns 403 when coach is not assigned', async () => {
    vi.mocked(query).mockImplementation((async (sql: string) => {
      if (sql.includes('coach_program_assignments') && sql.includes('SELECT 1')) return { rows: [] }
      return { rows: [] }
    }) as any)

    const res = makeRes()
    await getThread(
      { user: { id: COACH_A }, params: { program: 'couch-to-5k', userId: USER_ID } } as any,
      res
    )
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('creates a message when coach is assigned and participant enrolled', async () => {
    vi.mocked(query).mockImplementation((async (sql: string) => {
      if (sql.includes('coach_program_assignments') && sql.includes('SELECT 1')) {
        return { rows: [{ '?column?': 1 }] }
      }
      if (sql.includes('program_enrollments')) {
        return { rows: [{ user_id: USER_ID, program: 'foundations', status: 'active', enrolled_at: new Date() }] }
      }
      if (sql.includes('FROM coach_conversations') && sql.includes('WHERE program_id')) {
        return { rows: [] }
      }
      if (sql.includes('INSERT INTO coach_conversations')) {
        return {
          rows: [
            {
              id: 'conv-1',
              program_id: 'foundations',
              participant_id: USER_ID,
              created_at: new Date(),
              last_message_at: new Date(),
            },
          ],
        }
      }
      if (sql.includes('INSERT INTO coach_messages')) {
        return {
          rows: [
            {
              id: 'msg-1',
              sender_id: COACH_A,
              body: 'Keep going',
              created_at: new Date(),
              read_at: null,
            },
          ],
        }
      }
      if (sql.includes('UPDATE coach_conversations')) return { rows: [] }
      return { rows: [] }
    }) as any)

    const res = makeRes()
    await postThreadMessage(
      {
        user: { id: COACH_A },
        params: { program: 'couch-to-5k', userId: USER_ID },
        body: { body: 'Keep going' },
      } as any,
      res
    )
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json.mock.calls[0][0].message.body).toBe('Keep going')
  })
})

describe('member messaging', () => {
  it('returns empty thread when no coach assigned', async () => {
    vi.mocked(requireEnrollment).mockResolvedValue(true)
    vi.mocked(query).mockImplementation((async (sql: string) => {
      if (sql.includes('FROM coach_program_assignments a') && sql.includes('JOIN users')) {
        return { rows: [] }
      }
      return { rows: [] }
    }) as any)

    const res = makeRes()
    await getProgramMessages({ user: { id: USER_ID }, params: { program: 'couch-to-5k' } } as any, res)
    expect(res.json).toHaveBeenCalledWith({
      conversation: null,
      messages: [],
      coach: null,
      unreadCount: 0,
    })
  })

  it('rejects post when no coach assigned', async () => {
    vi.mocked(requireEnrollment).mockResolvedValue(true)
    vi.mocked(query).mockImplementation((async (sql: string) => {
      if (sql.includes('FROM coach_program_assignments a') && sql.includes('JOIN users')) {
        return { rows: [] }
      }
      return { rows: [] }
    }) as any)

    const res = makeRes()
    await postProgramMessage(
      { user: { id: USER_ID }, params: { program: 'couch-to-5k' }, body: { body: 'Hi' } } as any,
      res
    )
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('rejects when member is not enrolled', async () => {
    vi.mocked(requireEnrollment).mockResolvedValue(false)
    const res = makeRes()
    await getProgramMessages({ user: { id: USER_ID }, params: { program: 'couch-to-5k' } } as any, res)
    expect(res.status).toHaveBeenCalledWith(403)
  })
})

describe('unread counting', () => {
  it('returns coach unread count from query', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [{ cnt: 3 }] } as any)
    const res = makeRes()
    await getInboxUnreadCount({ user: { id: COACH_A } } as any, res)
    expect(res.json).toHaveBeenCalledWith({ count: 3 })
  })
})
