import { Request, Response } from 'express'
import { query } from '../config/db.js'
import {
  assertParticipantInProgram,
  assertReviewableActivity,
  CoachAccessError,
  getAssignedProgramIds,
} from '../utils/coachAccess.js'
import {
  isReviewActivityType,
  isReviewStatus,
  normalizeFeedbackBody,
  normalizeReviewNote,
  REVIEW_QUEUE_LIMIT,
} from '../utils/coachReviews.js'
import { isUuid } from '../utils/zones.js'

function coachId(req: Request): string {
  return req.user!.id
}

function handleAccess(res: Response, error: unknown) {
  if (error instanceof CoachAccessError) {
    return res.status(error.status).json({ error: error.message })
  }
  if (error && typeof error === 'object' && 'status' in error && typeof (error as { status: unknown }).status === 'number') {
    return res.status((error as { status: number; message: string }).status).json({
      error: (error as { message: string }).message,
    })
  }
  console.error(error)
  return res.status(500).json({ error: 'Something went wrong' })
}

function mapReview(row: Record<string, unknown>) {
  return {
    id: row.id,
    activityType: row.activity_type,
    week: Number(row.week),
    day: row.day == null ? null : Number(row.day),
    status: row.review_status,
    note: row.note ?? null,
    reviewedAt: row.reviewed_at,
    updatedAt: row.updated_at,
  }
}

function mapFeedback(row: Record<string, unknown>) {
  return {
    id: row.id,
    body: row.body,
    relatedReviewId: row.related_review_id ?? null,
    createdAt: row.created_at,
    coachName: row.coach_name ?? undefined,
  }
}

export async function getReviewQueue(req: Request, res: Response) {
  try {
    const id = coachId(req)
    const assigned = await getAssignedProgramIds(id)
    if (assigned.length === 0) {
      return res.json({ items: [], attention: [], unreviewedCount: 0 })
    }

    const programFilter = typeof req.query.program === 'string' ? req.query.program : null
    let programIds = assigned
    if (programFilter) {
      const { assertAssigned } = await import('../utils/coachAccess.js')
      const program = await assertAssigned(id, programFilter)
      programIds = [program.id]
    }

    const sessions = await query(
      `SELECT psp.user_id AS participant_id, u.name AS participant_name,
              psp.program AS program_id, p.slug AS program_slug, p.name AS program_name,
              'session'::text AS activity_type, psp.week, psp.day,
              psp.completed_at AS activity_at, psp.rounds_done
       FROM program_session_progress psp
       JOIN users u ON u.id = psp.user_id
       JOIN programs p ON p.id = psp.program
       JOIN program_enrollments pe ON pe.user_id = psp.user_id AND pe.program = psp.program
       WHERE psp.program = ANY($1::varchar[])
         AND psp.completed_at IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM coach_activity_reviews r
           WHERE r.coach_id = $2
             AND r.participant_id = psp.user_id
             AND r.program_id = psp.program
             AND r.activity_type = 'session'
             AND r.week = psp.week
             AND r.day = psp.day
         )
       ORDER BY psp.completed_at DESC
       LIMIT $3`,
      [programIds, id, REVIEW_QUEUE_LIMIT]
    )

    const checkins = await query(
      `SELECT pc.user_id AS participant_id, u.name AS participant_name,
              pc.program AS program_id, p.slug AS program_slug, p.name AS program_name,
              'checkin'::text AS activity_type, pc.week, NULL::int AS day,
              pc.submitted_at AS activity_at, NULL::int AS rounds_done
       FROM program_checkins pc
       JOIN users u ON u.id = pc.user_id
       JOIN programs p ON p.id = pc.program
       JOIN program_enrollments pe ON pe.user_id = pc.user_id AND pe.program = pc.program
       WHERE pc.program = ANY($1::varchar[])
         AND NOT EXISTS (
           SELECT 1 FROM coach_activity_reviews r
           WHERE r.coach_id = $2
             AND r.participant_id = pc.user_id
             AND r.program_id = pc.program
             AND r.activity_type = 'checkin'
             AND r.week = pc.week
             AND r.day IS NULL
         )
       ORDER BY pc.submitted_at DESC
       LIMIT $3`,
      [programIds, id, REVIEW_QUEUE_LIMIT]
    )

    const attention = await query(
      `SELECT r.id, r.participant_id, u.name AS participant_name,
              r.program_id, p.slug AS program_slug, p.name AS program_name,
              r.activity_type, r.week, r.day, r.review_status, r.note, r.reviewed_at, r.updated_at
       FROM coach_activity_reviews r
       JOIN users u ON u.id = r.participant_id
       JOIN programs p ON p.id = r.program_id
       WHERE r.coach_id = $1
         AND r.program_id = ANY($2::varchar[])
         AND r.review_status IN ('needs_clarification', 'flagged')
       ORDER BY r.updated_at DESC
       LIMIT $3`,
      [id, programIds, REVIEW_QUEUE_LIMIT]
    )

    const unreviewed = [...sessions.rows, ...checkins.rows]
      .sort((a, b) => new Date(b.activity_at).getTime() - new Date(a.activity_at).getTime())
      .slice(0, REVIEW_QUEUE_LIMIT)
      .map((r) => ({
        participantId: r.participant_id,
        participantName: r.participant_name,
        programId: r.program_id,
        programSlug: r.program_slug,
        programName: r.program_name,
        activityType: r.activity_type,
        week: Number(r.week),
        day: r.day == null ? null : Number(r.day),
        activityAt: r.activity_at,
        roundsDone: r.rounds_done == null ? null : Number(r.rounds_done),
      }))

    res.json({
      items: unreviewed,
      attention: attention.rows.map((r) => ({
        ...mapReview(r),
        participantId: r.participant_id,
        participantName: r.participant_name,
        programId: r.program_id,
        programSlug: r.program_slug,
        programName: r.program_name,
      })),
      unreviewedCount: unreviewed.length,
    })
  } catch (error) {
    handleAccess(res, error)
  }
}

export async function upsertReview(req: Request, res: Response) {
  try {
    const id = coachId(req)
    const { program, enrollment } = await assertParticipantInProgram(id, req.params.userId, req.params.program)
    const body = req.body ?? {}

    if (!isReviewActivityType(body.activityType)) {
      return res.status(400).json({ error: 'activityType must be session or checkin' })
    }
    if (!isReviewStatus(body.status)) {
      return res.status(400).json({ error: 'Choose a valid review status' })
    }
    const week = Number(body.week)
    const day = body.activityType === 'session' ? Number(body.day) : null
    if (!Number.isInteger(week) || week < 1) {
      return res.status(400).json({ error: 'Week must be a positive whole number' })
    }
    if (body.activityType === 'session' && (!Number.isInteger(day) || (day as number) < 1)) {
      return res.status(400).json({ error: 'Day is required for session reviews' })
    }

    await assertReviewableActivity(enrollment.user_id, program.id, body.activityType, week, day)
    const note = normalizeReviewNote(body.note)

    const existing =
      body.activityType === 'session'
        ? await query(
            `SELECT id FROM coach_activity_reviews
             WHERE coach_id = $1 AND participant_id = $2 AND program_id = $3
               AND activity_type = 'session' AND week = $4 AND day = $5`,
            [id, enrollment.user_id, program.id, week, day]
          )
        : await query(
            `SELECT id FROM coach_activity_reviews
             WHERE coach_id = $1 AND participant_id = $2 AND program_id = $3
               AND activity_type = 'checkin' AND week = $4`,
            [id, enrollment.user_id, program.id, week]
          )

    let result
    if (existing.rows[0]) {
      result = await query(
        `UPDATE coach_activity_reviews
         SET review_status = $1, note = $2, reviewed_at = NOW(), updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [body.status, note, existing.rows[0].id]
      )
    } else {
      result = await query(
        `INSERT INTO coach_activity_reviews
           (coach_id, participant_id, program_id, activity_type, week, day, review_status, note, reviewed_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         RETURNING *`,
        [id, enrollment.user_id, program.id, body.activityType, week, day, body.status, note]
      )
    }

    res.json({ review: mapReview(result.rows[0]) })
  } catch (error) {
    handleAccess(res, error)
  }
}

export async function listReviews(req: Request, res: Response) {
  try {
    const id = coachId(req)
    const { program, enrollment } = await assertParticipantInProgram(id, req.params.userId, req.params.program)
    const result = await query(
      `SELECT * FROM coach_activity_reviews
       WHERE coach_id = $1 AND participant_id = $2 AND program_id = $3
       ORDER BY reviewed_at DESC`,
      [id, enrollment.user_id, program.id]
    )
    res.json({ reviews: result.rows.map(mapReview) })
  } catch (error) {
    handleAccess(res, error)
  }
}

export async function createFeedback(req: Request, res: Response) {
  try {
    const id = coachId(req)
    const { program, enrollment } = await assertParticipantInProgram(id, req.params.userId, req.params.program)
    const bodyText = normalizeFeedbackBody(req.body?.body)
    const relatedReviewId = req.body?.relatedReviewId ?? null

    if (relatedReviewId != null) {
      if (!isUuid(relatedReviewId)) {
        return res.status(400).json({ error: 'relatedReviewId is invalid' })
      }
      const review = await query(
        `SELECT id FROM coach_activity_reviews
         WHERE id = $1 AND coach_id = $2 AND participant_id = $3 AND program_id = $4`,
        [relatedReviewId, id, enrollment.user_id, program.id]
      )
      if (review.rows.length === 0) {
        return res.status(400).json({ error: 'Related review was not found' })
      }
    }

    const result = await query(
      `INSERT INTO coach_feedback (coach_id, participant_id, program_id, body, related_review_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, enrollment.user_id, program.id, bodyText, relatedReviewId]
    )
    res.status(201).json({ feedback: mapFeedback(result.rows[0]) })
  } catch (error) {
    handleAccess(res, error)
  }
}

export async function listFeedback(req: Request, res: Response) {
  try {
    const id = coachId(req)
    const { program, enrollment } = await assertParticipantInProgram(id, req.params.userId, req.params.program)
    const result = await query(
      `SELECT f.* FROM coach_feedback f
       WHERE f.coach_id = $1 AND f.participant_id = $2 AND f.program_id = $3
       ORDER BY f.created_at DESC`,
      [id, enrollment.user_id, program.id]
    )
    res.json({ feedback: result.rows.map(mapFeedback) })
  } catch (error) {
    handleAccess(res, error)
  }
}
