import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({ query: vi.fn(), getClient: vi.fn() }))
vi.mock('../../utils/programCatalog.js', () => ({
  findProgram: vi.fn(),
  getPublishedContent: vi.fn().mockResolvedValue({
    page: {},
    card: {},
    plan: { howYourWeekWorks: [], howWeeksOpen: [], graduation: { heading: '', body: '' }, checkinQuestions: [] },
    weeks: [
      { week: 1, days: [{ day: 1 }, { day: 2 }] },
      { week: 2, days: [{ day: 1 }, { day: 2 }] },
      { week: 3, days: [{ day: 1 }] },
    ],
  }),
}))
vi.mock('../../utils/programProgress.js', () => ({
  loadProgress: vi.fn(),
}))

import { query } from '../../config/db.js'
import { findProgram } from '../../utils/programCatalog.js'
import { loadProgress } from '../../utils/programProgress.js'
import { getEngagementAttention } from '../../controllers/coachEngagementController.js'

const COACH_ID = '11111111-1111-4111-8111-111111111111'
const USER_A = '22222222-2222-4222-8222-222222222222'
const USER_B = '33333333-3333-4333-8333-333333333333'
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

describe('getEngagementAttention', () => {
  it('returns empty when coach has no assigned programs', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as any)
    const res = makeRes()
    await getEngagementAttention({ user: { id: COACH_ID }, query: {} } as any, res)
    expect(res.json).toHaveBeenCalledWith({ items: [] })
  })

  it('returns 403 when program filter is not assigned', async () => {
    vi.mocked(query).mockImplementation((async (sql: string) => {
      if (sql.includes('coach_program_assignments') && sql.includes('SELECT 1')) {
        return { rows: [] }
      }
      if (sql.includes('SELECT program_id FROM coach_program_assignments')) {
        return { rows: [{ program_id: 'other-program' }] }
      }
      return { rows: [] }
    }) as any)

    const res = makeRes()
    await getEngagementAttention(
      { user: { id: COACH_ID }, query: { program: 'couch-to-5k' } } as any,
      res
    )
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('returns only attention statuses for assigned programs', async () => {
    const enrolledAt = new Date()
    enrolledAt.setDate(enrolledAt.getDate() - 20)
    const lastSession = new Date()
    lastSession.setDate(lastSession.getDate() - 16)

    vi.mocked(query).mockImplementation((async (sql: string) => {
      if (sql.includes('SELECT program_id FROM coach_program_assignments')) {
        return { rows: [{ program_id: 'foundations' }] }
      }
      if (sql.includes('SELECT id, slug, name FROM programs')) {
        return { rows: [PROGRAM] }
      }
      if (sql.includes('FROM program_enrollments pe')) {
        return {
          rows: [
            { id: USER_A, name: 'Quiet Runner', enrolled_at: enrolledAt, status: 'active' },
            { id: USER_B, name: 'On Track', enrolled_at: new Date(), status: 'active' },
          ],
        }
      }
      if (sql.includes('MAX(at) AS last_at')) {
        return { rows: [{ user_id: USER_A, last_at: lastSession }] }
      }
      return { rows: [] }
    }) as any)

    vi.mocked(loadProgress).mockImplementation(async (userId: string) => {
      if (userId === USER_A) {
        return {
          currentWeek: 1,
          totalWeeks: 3,
          completed: [],
          checkedInWeeks: [],
          graduated: false,
        }
      }
      return {
        currentWeek: 1,
        totalWeeks: 3,
        completed: [{ week: 1, day: 1, rounds_done: 1, done: true }],
        checkedInWeeks: [],
        graduated: false,
      }
    })

    const res = makeRes()
    await getEngagementAttention({ user: { id: COACH_ID }, query: {} } as any, res)

    const body = res.json.mock.calls[0][0]
    expect(body.items).toHaveLength(1)
    expect(body.items[0].participantId).toBe(USER_A)
    expect(body.items[0].engagementStatus).toBe('inactive')
    expect(body.items[0].programSlug).toBe('couch-to-5k')
  })
})
