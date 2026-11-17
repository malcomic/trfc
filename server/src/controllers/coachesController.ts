import { Request, Response } from 'express'
import { query } from '../config/db.js'
import { assertAssigned, assertParticipantInProgram, CoachAccessError, getAssignedProgramIds } from '../utils/coachAccess.js'
import {
  computeEngagementStatus,
  countMissedSessions,
  engagementPayload,
  loadLastActivityByUser,
} from '../utils/coachEngagement.js'
import { getPublishedContent } from '../utils/programCatalog.js'
import { loadProgress } from '../utils/programProgress.js'

function coachId(req: Request): string {
  return req.user!.id
}

function handleAccess(res: Response, error: unknown) {
  if (error instanceof CoachAccessError) {
    return res.status(error.status).json({ error: error.message })
  }
  console.error(error)
  return res.status(500).json({ error: 'Something went wrong' })
}

export async function getCoachMe(req: Request, res: Response) {
  try {
    const id = coachId(req)
    const [profile, programs] = await Promise.all([
      query(
        `SELECT u.id, u.name, u.email, u.phone, c.status, c.activated_at, c.application_id
         FROM users u
         JOIN coaches c ON c.user_id = u.id
         WHERE u.id = $1`,
        [id]
      ),
      getAssignedProgramIds(id),
    ])
    const row = profile.rows[0]
    if (!row) return res.status(404).json({ error: 'Coach profile not found' })
    res.json({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      status: row.status,
      activatedAt: row.activated_at,
      applicationId: row.application_id,
      assignedProgramCount: programs.length,
      assignedProgramIds: programs,
    })
  } catch (error) {
    handleAccess(res, error)
  }
}

export async function listMyPrograms(req: Request, res: Response) {
  try {
    const id = coachId(req)
    const result = await query(
      `SELECT p.id, p.slug, p.name, p.status, a.assigned_at,
              (SELECT COUNT(*)::int FROM program_enrollments pe
               WHERE pe.program = p.id AND pe.status = 'active') AS enrolled_count
       FROM coach_program_assignments a
       JOIN programs p ON p.id = a.program_id
       WHERE a.coach_id = $1
       ORDER BY p.sort_order, p.name`,
      [id]
    )
    res.json({
      programs: result.rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        status: r.status,
        assignedAt: r.assigned_at,
        enrolledCount: r.enrolled_count,
      })),
    })
  } catch (error) {
    handleAccess(res, error)
  }
}

export async function getMyProgram(req: Request, res: Response) {
  try {
    const program = await assertAssigned(coachId(req), req.params.program)
    const content = await getPublishedContent(program.id)
    const roster = await query(
      `SELECT u.id, u.name, pe.enrolled_at, pe.status,
              (SELECT COUNT(*)::int FROM program_checkins pc
               WHERE pc.user_id = u.id AND pc.program = pe.program) AS checkins_done,
              (SELECT COUNT(*)::int FROM program_session_progress psp
               WHERE psp.user_id = u.id AND psp.program = pe.program AND psp.completed_at IS NOT NULL) AS sessions_done
       FROM program_enrollments pe
       JOIN users u ON u.id = pe.user_id
       WHERE pe.program = $1
       ORDER BY pe.enrolled_at DESC`,
      [program.id]
    )

    const totalWeeks = content?.weeks?.length ?? 0
    const coach = coachId(req)
    const unreviewedRows = await query(
      `SELECT participant_id, COUNT(*)::int AS cnt FROM (
         SELECT psp.user_id AS participant_id
         FROM program_session_progress psp
         WHERE psp.program = $1 AND psp.completed_at IS NOT NULL
           AND NOT EXISTS (
             SELECT 1 FROM coach_activity_reviews r
             WHERE r.coach_id = $2 AND r.participant_id = psp.user_id AND r.program_id = psp.program
               AND r.activity_type = 'session' AND r.week = psp.week AND r.day = psp.day
           )
         UNION ALL
         SELECT pc.user_id AS participant_id
         FROM program_checkins pc
         WHERE pc.program = $1
           AND NOT EXISTS (
             SELECT 1 FROM coach_activity_reviews r
             WHERE r.coach_id = $2 AND r.participant_id = pc.user_id AND r.program_id = pc.program
               AND r.activity_type = 'checkin' AND r.week = pc.week
           )
       ) x
       GROUP BY participant_id`,
      [program.id, coach]
    )
    const unreviewedByUser = new Map(
      unreviewedRows.rows.map((r: { participant_id: string; cnt: number }) => [r.participant_id, Number(r.cnt)])
    )

    const userIds = roster.rows.map((r: { id: string }) => r.id)
    const lastByUser = await loadLastActivityByUser(program.id, userIds)

    const participants = await Promise.all(
      roster.rows.map(async (r) => {
        const progress = await loadProgress(r.id, program.id, totalWeeks)
        const lastActivityAt = lastByUser.get(r.id) ?? new Date(r.enrolled_at)
        const missedSessionCount = countMissedSessions(content, progress)
        const completedSessionCount = progress.completed.filter((c) => c.done).length
        const engagement = computeEngagementStatus({
          graduated: progress.graduated || r.status === 'completed',
          enrolledAt: new Date(r.enrolled_at),
          lastActivityAt,
          currentWeek: progress.currentWeek,
          totalWeeks: progress.totalWeeks,
          missedSessionCount,
          completedSessionCount,
        })
        return {
          id: r.id,
          name: r.name,
          enrolledAt: r.enrolled_at,
          status: r.status,
          currentWeek: progress.currentWeek,
          totalWeeks: progress.totalWeeks,
          sessionsDone: Number(r.sessions_done),
          checkinsDone: Number(r.checkins_done),
          graduated: progress.graduated,
          unreviewedCount: unreviewedByUser.get(r.id) ?? 0,
          ...engagementPayload(engagement, lastActivityAt),
        }
      })
    )

    res.json({
      id: program.id,
      slug: program.slug,
      name: program.name,
      status: program.status,
      description: content?.card?.blurb ?? content?.page?.tagline ?? null,
      objectives: content?.page?.forYou ?? [],
      durationLabel: content?.page?.startsLabel ?? null,
      totalWeeks,
      enrolledCount: participants.length,
      participants,
    })
  } catch (error) {
    handleAccess(res, error)
  }
}

export async function getMyParticipant(req: Request, res: Response) {
  try {
    const { program, enrollment } = await assertParticipantInProgram(
      coachId(req),
      req.params.userId,
      req.params.program
    )
    const user = await query(`SELECT id, name FROM users WHERE id = $1`, [req.params.userId])
    if (!user.rows[0]) return res.status(404).json({ error: 'Participant not found' })

    const content = await getPublishedContent(program.id)
    const totalWeeks = content?.weeks?.length ?? 0
    const progress = await loadProgress(req.params.userId, program.id, totalWeeks)

    const coach = coachId(req)
    const [checkins, reviews, feedback] = await Promise.all([
      query(
        `SELECT week, answers, submitted_at
         FROM program_checkins
         WHERE user_id = $1 AND program = $2
         ORDER BY week`,
        [req.params.userId, program.id]
      ),
      query(
        `SELECT id, activity_type, week, day, review_status, note, reviewed_at, updated_at
         FROM coach_activity_reviews
         WHERE coach_id = $1 AND participant_id = $2 AND program_id = $3
         ORDER BY reviewed_at DESC`,
        [coach, req.params.userId, program.id]
      ),
      query(
        `SELECT id, body, related_review_id, created_at
         FROM coach_feedback
         WHERE coach_id = $1 AND participant_id = $2 AND program_id = $3
         ORDER BY created_at DESC`,
        [coach, req.params.userId, program.id]
      ),
    ])

    const reviewByKey = new Map<string, { status: string; note: string | null; id: string }>()
    for (const r of reviews.rows) {
      const key =
        r.activity_type === 'session' ? `session:${r.week}:${r.day}` : `checkin:${r.week}`
      reviewByKey.set(key, { status: r.review_status, note: r.note, id: r.id })
    }

    // Derive pending/missed at a high level from plan weeks vs completed sessions.
    const planDays: { week: number; day: number }[] = []
    for (const week of content?.weeks ?? []) {
      for (const day of week.days ?? []) {
        planDays.push({ week: week.week, day: day.day })
      }
    }
    const completedKeys = new Set(progress.completed.filter((c) => c.done).map((c) => `${c.week}:${c.day}`))
    const pending: { week: number; day: number }[] = []
    const missed: { week: number; day: number }[] = []
    for (const d of planDays) {
      if (completedKeys.has(`${d.week}:${d.day}`)) continue
      if (d.week < progress.currentWeek) missed.push(d)
      else if (d.week === progress.currentWeek) pending.push(d)
    }

    const completedActivities = progress.completed
      .filter((c) => c.done)
      .map((c) => {
        const review = reviewByKey.get(`session:${c.week}:${c.day}`)
        return {
          week: c.week,
          day: c.day,
          rounds_done: c.rounds_done,
          done: c.done,
          reviewStatus: review?.status ?? null,
          reviewNote: review?.note ?? null,
          reviewId: review?.id ?? null,
        }
      })

    const lastByUser = await loadLastActivityByUser(program.id, [req.params.userId])
    const lastActivityAt = lastByUser.get(req.params.userId) ?? new Date(enrollment.enrolled_at)
    const engagement = computeEngagementStatus({
      graduated: progress.graduated || enrollment.status === 'completed',
      enrolledAt: new Date(enrollment.enrolled_at),
      lastActivityAt,
      currentWeek: progress.currentWeek,
      totalWeeks: progress.totalWeeks,
      missedSessionCount: missed.length,
      completedSessionCount: completedActivities.length,
    })

    res.json({
      id: user.rows[0].id,
      name: user.rows[0].name,
      program: { id: program.id, slug: program.slug, name: program.name },
      enrolledAt: enrollment.enrolled_at,
      enrollmentStatus: enrollment.status,
      ...engagementPayload(engagement, lastActivityAt),
      progress,
      completedActivities,
      pendingActivities: pending,
      missedActivities: missed,
      checkins: checkins.rows.map((c) => {
        const review = reviewByKey.get(`checkin:${c.week}`)
        return {
          week: Number(c.week),
          answers: c.answers,
          submittedAt: c.submitted_at,
          reviewStatus: review?.status ?? null,
          reviewNote: review?.note ?? null,
          reviewId: review?.id ?? null,
        }
      }),
      reviews: reviews.rows.map((r) => ({
        id: r.id,
        activityType: r.activity_type,
        week: Number(r.week),
        day: r.day == null ? null : Number(r.day),
        status: r.review_status,
        note: r.note ?? null,
        reviewedAt: r.reviewed_at,
        updatedAt: r.updated_at,
      })),
      feedback: feedback.rows.map((f) => ({
        id: f.id,
        body: f.body,
        relatedReviewId: f.related_review_id ?? null,
        createdAt: f.created_at,
      })),
    })
  } catch (error) {
    handleAccess(res, error)
  }
}
