import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({ query: vi.fn(), getClient: vi.fn() }))
vi.mock('../../utils/programCatalog.js', () => ({
  findProgram: vi.fn(),
  getPublishedContent: vi.fn().mockResolvedValue({
    page: {},
    card: {},
    plan: { howYourWeekWorks: [], howWeeksOpen: [], graduation: { heading: '', body: '' }, checkinQuestions: [] },
    weeks: [],
  }),
}))
vi.mock('../../utils/programProgress.js', async () => {
  const actual = await vi.importActual<typeof import('../../utils/programProgress.js')>(
    '../../utils/programProgress.js'
  )
  return { ...actual, requireEnrollment: vi.fn() }
})
vi.mock('../../utils/programCheckinNotify.js', () => ({
  notifyCaptainOfCheckin: vi.fn(),
}))

import { query } from '../../config/db.js'
import { findProgram } from '../../utils/programCatalog.js'
import { requireEnrollment } from '../../utils/programProgress.js'
import { assertReviewableActivity } from '../../utils/coachAccess.js'
import { upsertReview, createFeedback, listFeedback } from '../../controllers/coachReviewsController.js'
import { getCoachingFeedback } from '../../controllers/programsController.js'

const COACH_ID = '11111111-1111-4111-8111-111111111111'
const USER_ID = '22222222-2222-4222-8222-222222222222'
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

describe('assertReviewableActivity', () => {
  it('rejects incomplete sessions', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as any)
    await expect(assertReviewableActivity(USER_ID, 'foundations', 'session', 1, 2)).rejects.toMatchObject({
      status: 400,
    })
  })

  it('accepts completed sessions', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [{ '?column?': 1 }] } as any)
    await expect(assertReviewableActivity(USER_ID, 'foundations', 'session', 1, 2)).resolves.toBeUndefined()
  })

  it('rejects missing check-ins', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as any)
    await expect(assertReviewableActivity(USER_ID, 'foundations', 'checkin', 1, null)).rejects.toMatchObject({
      status: 400,
    })
  })
})

describe('upsertReview', () => {
  it('rejects when the coach is not assigned', async () => {
    vi.mocked(query).mockImplementation((async (sql: string) => {
      if (sql.includes('coach_program_assignments')) return { rows: [] }
      return { rows: [] }
    }) as any)
    const res = makeRes()
    await upsertReview(
      {
        user: { id: COACH_ID },
        params: { program: 'foundations', userId: USER_ID },
        body: { activityType: 'session', week: 1, day: 1, status: 'reviewed' },
      } as any,
      res
    )
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('inserts a review for a completed session', async () => {
    vi.mocked(query).mockImplementation((async (sql: string) => {
      if (sql.includes('coach_program_assignments')) return { rows: [{ '?column?': 1 }] }
      if (sql.includes('program_enrollments')) {
        return { rows: [{ user_id: USER_ID, program: 'foundations', status: 'active', enrolled_at: new Date() }] }
      }
      if (sql.includes('program_session_progress')) return { rows: [{ '?column?': 1 }] }
      if (sql.includes('SELECT id FROM coach_activity_reviews')) return { rows: [] }
      if (sql.includes('INSERT INTO coach_activity_reviews')) {
        return {
          rows: [
            {
              id: 'rev-1',
              activity_type: 'session',
              week: 1,
              day: 1,
              review_status: 'reviewed',
              note: null,
              reviewed_at: new Date(),
              updated_at: new Date(),
            },
          ],
        }
      }
      return { rows: [] }
    }) as any)

    const res = makeRes()
    await upsertReview(
      {
        user: { id: COACH_ID },
        params: { program: 'foundations', userId: USER_ID },
        body: { activityType: 'session', week: 1, day: 1, status: 'reviewed' },
      } as any,
      res
    )
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ review: expect.objectContaining({ status: 'reviewed', week: 1, day: 1 }) })
    )
    const writes = vi.mocked(query).mock.calls.map(([sql]) => String(sql))
    expect(writes.some((s) => s.includes('UPDATE program_session_progress'))).toBe(false)
    expect(writes.some((s) => s.includes('UPDATE program_checkins'))).toBe(false)
  })

  it('updates an existing check-in review', async () => {
    vi.mocked(query).mockImplementation((async (sql: string) => {
      if (sql.includes('coach_program_assignments')) return { rows: [{ '?column?': 1 }] }
      if (sql.includes('program_enrollments')) {
        return { rows: [{ user_id: USER_ID, program: 'foundations', status: 'active', enrolled_at: new Date() }] }
      }
      if (sql.includes('program_checkins')) return { rows: [{ '?column?': 1 }] }
      if (sql.includes('SELECT id FROM coach_activity_reviews')) return { rows: [{ id: 'rev-1' }] }
      if (sql.includes('UPDATE coach_activity_reviews')) {
        return {
          rows: [
            {
              id: 'rev-1',
              activity_type: 'checkin',
              week: 2,
              day: null,
              review_status: 'flagged',
              note: 'Pain?',
              reviewed_at: new Date(),
              updated_at: new Date(),
            },
          ],
        }
      }
      return { rows: [] }
    }) as any)

    const res = makeRes()
    await upsertReview(
      {
        user: { id: COACH_ID },
        params: { program: 'foundations', userId: USER_ID },
        body: { activityType: 'checkin', week: 2, status: 'flagged', note: 'Pain?' },
      } as any,
      res
    )
    expect(res.json.mock.calls[0][0].review.status).toBe('flagged')
  })
})

describe('feedback', () => {
  it('creates feedback for an assigned participant', async () => {
    vi.mocked(query).mockImplementation((async (sql: string) => {
      if (sql.includes('coach_program_assignments')) return { rows: [{ '?column?': 1 }] }
      if (sql.includes('program_enrollments')) {
        return { rows: [{ user_id: USER_ID, program: 'foundations', status: 'active', enrolled_at: new Date() }] }
      }
      if (sql.includes('INSERT INTO coach_feedback')) {
        return {
          rows: [{ id: 'fb-1', body: 'Great week', related_review_id: null, created_at: new Date() }],
        }
      }
      return { rows: [] }
    }) as any)

    const res = makeRes()
    await createFeedback(
      {
        user: { id: COACH_ID },
        params: { program: 'foundations', userId: USER_ID },
        body: { body: 'Great week' },
      } as any,
      res
    )
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json.mock.calls[0][0].feedback.body).toBe('Great week')
  })

  it('lists coach feedback', async () => {
    vi.mocked(query).mockImplementation((async (sql: string) => {
      if (sql.includes('coach_program_assignments')) return { rows: [{ '?column?': 1 }] }
      if (sql.includes('program_enrollments')) {
        return { rows: [{ user_id: USER_ID, program: 'foundations', status: 'active', enrolled_at: new Date() }] }
      }
      if (sql.includes('FROM coach_feedback')) {
        return { rows: [{ id: 'fb-1', body: 'Keep it up', related_review_id: null, created_at: new Date() }] }
      }
      return { rows: [] }
    }) as any)

    const res = makeRes()
    await listFeedback(
      { user: { id: COACH_ID }, params: { program: 'foundations', userId: USER_ID } } as any,
      res
    )
    expect(res.json.mock.calls[0][0].feedback).toHaveLength(1)
  })
})

describe('getCoachingFeedback (member)', () => {
  it('returns 403 when not enrolled', async () => {
    vi.mocked(requireEnrollment).mockResolvedValue(false)
    const res = makeRes()
    await getCoachingFeedback({ user: { id: USER_ID }, params: { program: 'foundations' } } as any, res)
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('returns feedback for the enrolled member', async () => {
    vi.mocked(requireEnrollment).mockResolvedValue(true)
    vi.mocked(query).mockResolvedValue({
      rows: [
        {
          id: 'fb-1',
          body: 'Nice pace',
          related_review_id: null,
          created_at: new Date('2026-11-16'),
          coach_name: 'Jane Coach',
        },
      ],
    } as any)
    const res = makeRes()
    await getCoachingFeedback({ user: { id: USER_ID }, params: { program: 'foundations' } } as any, res)
    expect(res.json).toHaveBeenCalledWith({
      feedback: [expect.objectContaining({ body: 'Nice pace', coachName: 'Jane Coach' })],
    })
  })
})
