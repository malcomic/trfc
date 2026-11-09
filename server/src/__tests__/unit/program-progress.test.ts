import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))
vi.mock('../../utils/programCheckinNotify.js', () => ({
  notifyCaptainOfCheckin: vi.fn().mockResolvedValue(true),
}))

import { query } from '../../config/db.js'
import { notifyCaptainOfCheckin } from '../../utils/programCheckinNotify.js'
import {
  getProgramPlan,
  getProgramWeek,
  setSessionProgress,
  submitCheckin,
} from '../../controllers/programsController.js'
import { currentWeekFrom, isWeekOpen, validateCheckinAnswers } from '../../utils/programProgress.js'
import { COUCH_TO_5K_PLAN, COUCH_TO_5K_WEEKS } from '../../config/programSeed.js'
import { CORE_PROGRAMS, buildCatalogSeedSql } from '../../config/programCatalogSeed.js'

const USER_ID = '22222222-2222-4222-8222-222222222222'
const QUESTIONS = COUCH_TO_5K_PLAN.checkinQuestions
const VALID_ANSWERS = { feel: 'Just right', workouts: 'All of them', saturday: 'Yes', pain: 'No' }
const FOUNDATIONS = { id: 'foundations', slug: 'couch-to-5k', name: 'Couch to 5K', status: 'published', is_core: true, sort_order: 1 }

interface State {
  enrolled: boolean
  totalWeeks: number
  checkins: number[]
  insertedCheckin: boolean
}

let state: State

function routeQueries() {
  vi.mocked(query).mockImplementation((async (sql: string, params: any[] = []) => {
    if (sql.includes('FROM programs WHERE id = $1 OR slug = $1')) {
      return { rows: [FOUNDATIONS.id, FOUNDATIONS.slug].includes(params[0]) ? [FOUNDATIONS] : [] }
    }
    if (sql.includes("FROM program_versions WHERE program_id = $1 AND state = 'published'")) {
      const content = { page: {}, card: {}, plan: COUCH_TO_5K_PLAN, weeks: COUCH_TO_5K_WEEKS.slice(0, state.totalWeeks) }
      return { rows: [{ content }] }
    }
    if (sql.includes('FROM program_enrollments')) return { rows: state.enrolled ? [{ '?column?': 1 }] : [] }
    if (sql.includes('SELECT week FROM program_checkins')) return { rows: state.checkins.map((week) => ({ week })) }
    if (sql.includes('FROM program_session_progress')) return { rows: [] }
    if (sql.includes('INSERT INTO program_session_progress')) {
      return { rows: [{ week: 1, day: 1, rounds_done: 0, done: true }] }
    }
    if (sql.includes('INSERT INTO program_checkins')) {
      if (!state.insertedCheckin) return { rows: [] }
      state.checkins = [...state.checkins, params[2]]
      return { rows: [{ week: params[2] }] }
    }
    return { rows: [] }
  }) as any)
}

const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as any
const makeReq = (params: Record<string, string>, body: any = {}) =>
  ({ params, body, user: { id: USER_ID, email: 'a@b.c', role: 'member' } }) as any

beforeEach(() => {
  vi.mocked(query).mockReset()
  vi.mocked(notifyCaptainOfCheckin).mockClear()
  state = { enrolled: true, totalWeeks: 8, checkins: [], insertedCheckin: true }
  routeQueries()
})

describe('currentWeekFrom', () => {
  it('opens one week more than the check-ins sent', () => {
    expect(currentWeekFrom(0, 8)).toBe(1)
    expect(currentWeekFrom(3, 8)).toBe(4)
  })

  it('never goes past the last week', () => {
    expect(currentWeekFrom(8, 8)).toBe(8)
    expect(currentWeekFrom(12, 8)).toBe(8)
  })

  it('stays on Week 1 when the program has no weeks yet', () => {
    expect(currentWeekFrom(0, 0)).toBe(1)
  })
})

describe('isWeekOpen', () => {
  it('opens weeks up to and including the current week', () => {
    expect(isWeekOpen(1, 2)).toBe(true)
    expect(isWeekOpen(2, 2)).toBe(true)
    expect(isWeekOpen(3, 2)).toBe(false)
    expect(isWeekOpen(0, 2)).toBe(false)
  })
})

describe('validateCheckinAnswers', () => {
  it('accepts complete answers and drops unknown keys', () => {
    const result = validateCheckinAnswers(QUESTIONS, { ...VALID_ANSWERS, note: '  sore calves ', hack: 'x' })
    expect(result).toEqual({ ok: true, answers: { ...VALID_ANSWERS, note: 'sore calves' } })
  })

  it('requires the required questions', () => {
    const { feel, ...rest } = VALID_ANSWERS
    expect(validateCheckinAnswers(QUESTIONS, rest)).toMatchObject({ ok: false })
  })

  it('refuses a choice that is not one of the options', () => {
    expect(validateCheckinAnswers(QUESTIONS, { ...VALID_ANSWERS, feel: 'Amazing' })).toMatchObject({ ok: false })
  })

  it('refuses answers that are not an object', () => {
    expect(validateCheckinAnswers(QUESTIONS, null)).toMatchObject({ ok: false })
    expect(validateCheckinAnswers(QUESTIONS, ['x'])).toMatchObject({ ok: false })
  })
})

describe('getProgramPlan', () => {
  it('refuses members who have not joined with 403', async () => {
    state.enrolled = false
    const res = makeRes()
    await getProgramPlan(makeReq({ program: 'foundations' }), res)
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('rejects unknown programs with 400', async () => {
    const res = makeRes()
    await getProgramPlan(makeReq({ program: 'nope' }), res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('accepts the slug as well as the id', async () => {
    const res = makeRes()
    await getProgramPlan(makeReq({ program: 'couch-to-5k' }), res)
    expect(res.json.mock.calls[0][0]).toMatchObject({ program: 'foundations', slug: 'couch-to-5k', name: 'Couch to 5K' })
  })

  it('locks the weeks after the current one', async () => {
    state.checkins = [1]
    const res = makeRes()
    await getProgramPlan(makeReq({ program: 'foundations' }), res)
    const body = res.json.mock.calls[0][0]
    expect(body.progress.currentWeek).toBe(2)
    expect(body.weeks.map((w: any) => w.locked)).toEqual([false, false, true, true, true, true, true, true])
    expect(body.weeks[0].checkedIn).toBe(true)
  })
})

describe('getProgramWeek', () => {
  it('refuses a locked week with 403', async () => {
    const res = makeRes()
    await getProgramWeek(makeReq({ program: 'foundations', week: '2' }), res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json.mock.calls[0][0]).toMatchObject({ locked: true })
  })

  it('returns an open week with its days', async () => {
    const res = makeRes()
    await getProgramWeek(makeReq({ program: 'foundations', week: '1' }), res)
    const body = res.json.mock.calls[0][0]
    expect(body.week.title).toBe("Let's start")
    expect(body.days).toHaveLength(7)
    expect(body.days[0]).toMatchObject({ day_number: 1, kind: 'run', title: 'Your first jog', done: false, rounds_done: 0 })
    expect(body.week).toMatchObject({ week_number: 1, coach_note: expect.any(String), voice_note_url: null })
    expect(body.isCurrentWeek).toBe(true)
  })

  it('returns 404 past the last week', async () => {
    const res = makeRes()
    await getProgramWeek(makeReq({ program: 'foundations', week: '9' }), res)
    expect(res.status).toHaveBeenCalledWith(404)
  })
})

describe('setSessionProgress', () => {
  it('saves an open day', async () => {
    const res = makeRes()
    await setSessionProgress(makeReq({ program: 'foundations', week: '1', day: '1' }, { done: true }), res)
    expect(res.json).toHaveBeenCalledWith({ week: 1, day: 1, rounds_done: 0, done: true })
    const insert = vi.mocked(query).mock.calls.find(([sql]) => String(sql).includes('INSERT INTO program_session_progress'))!
    expect(insert[1]).toEqual([USER_ID, 'foundations', 1, 1, null, true])
  })

  it('refuses a day in a locked week', async () => {
    const res = makeRes()
    await setSessionProgress(makeReq({ program: 'foundations', week: '3', day: '1' }, { done: true }), res)
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('requires done to be true or false', async () => {
    const res = makeRes()
    await setSessionProgress(makeReq({ program: 'foundations', week: '1', day: '1' }, { done: 'yes' }), res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('refuses days outside 1 to 7', async () => {
    const res = makeRes()
    await setSessionProgress(makeReq({ program: 'foundations', week: '1', day: '8' }, { done: true }), res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('refuses negative rounds', async () => {
    const res = makeRes()
    await setSessionProgress(makeReq({ program: 'foundations', week: '1', day: '1' }, { done: false, roundsDone: -1 }), res)
    expect(res.status).toHaveBeenCalledWith(400)
  })
})

describe('submitCheckin', () => {
  it('saves the current week, opens the next and tells the captain', async () => {
    const res = makeRes()
    await submitCheckin(makeReq({ program: 'foundations', week: '1' }, { answers: VALID_ANSWERS }), res)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json.mock.calls[0][0]).toMatchObject({ week: 1, nextWeek: 2, graduated: false })
    expect(notifyCaptainOfCheckin).toHaveBeenCalledWith(USER_ID, 'foundations', 1, VALID_ANSWERS)
  })

  it('refuses a week that is not the current one', async () => {
    const res = makeRes()
    await submitCheckin(makeReq({ program: 'foundations', week: '2' }, { answers: VALID_ANSWERS }), res)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(notifyCaptainOfCheckin).not.toHaveBeenCalled()
  })

  it('refuses a second check-in for the same week', async () => {
    state.checkins = [1]
    const res = makeRes()
    await submitCheckin(makeReq({ program: 'foundations', week: '1' }, { answers: VALID_ANSWERS }), res)
    expect(res.status).toHaveBeenCalledWith(409)
  })

  it('refuses when the insert finds an existing row', async () => {
    state.insertedCheckin = false
    const res = makeRes()
    await submitCheckin(makeReq({ program: 'foundations', week: '1' }, { answers: VALID_ANSWERS }), res)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(notifyCaptainOfCheckin).not.toHaveBeenCalled()
  })

  it('refuses missing answers with 400', async () => {
    const res = makeRes()
    await submitCheckin(makeReq({ program: 'foundations', week: '1' }, { answers: { feel: 'Easy' } }), res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('reports graduation after the last week', async () => {
    state.totalWeeks = 2
    state.checkins = [1]
    const res = makeRes()
    await submitCheckin(makeReq({ program: 'foundations', week: '2' }, { answers: VALID_ANSWERS }), res)
    expect(res.json.mock.calls[0][0]).toMatchObject({ graduated: true, nextWeek: null })
  })
})

describe('buildCatalogSeedSql', () => {
  it('escapes quotes and never overwrites what admins have saved', () => {
    const sql = buildCatalogSeedSql()
    expect(sql).toContain("Let''s start")
    expect(sql.match(/ON CONFLICT \(id\) DO NOTHING/g)?.length).toBe(4)
    expect(sql.match(/IF EXISTS \(SELECT 1 FROM program_versions/g)?.length).toBe(4)
    expect(sql).not.toMatch(/DO UPDATE/)
  })

  it('seeds the four core programs with 7 days in every week', () => {
    expect(CORE_PROGRAMS.map((p) => [p.id, p.slug, p.content.weeks.length])).toEqual([
      ['foundations', 'couch-to-5k', 8],
      ['fat_loss', 'fat-loss', 12],
      ['endurance', 'endurance', 10],
      ['hiking', 'hiking', 6],
    ])
    for (const p of CORE_PROGRAMS) {
      for (const week of p.content.weeks) expect(week.days.map((d) => d.day)).toEqual([1, 2, 3, 4, 5, 6, 7])
    }
  })
})
