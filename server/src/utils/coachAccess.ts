import { query } from '../config/db.js'
import { findProgram } from './programCatalog.js'

export class CoachAccessError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message)
  }
}

export async function getAssignedProgramIds(coachId: string): Promise<string[]> {
  const result = await query(
    `SELECT program_id FROM coach_program_assignments WHERE coach_id = $1 ORDER BY assigned_at`,
    [coachId]
  )
  return result.rows.map((r: { program_id: string }) => r.program_id)
}

/** Current coach for a program (at most one). */
export async function getAssignedCoach(programId: string): Promise<{
  userId: string
  name: string
} | null> {
  const result = await query(
    `SELECT u.id, u.name
     FROM coach_program_assignments a
     JOIN users u ON u.id = a.coach_id
     JOIN coaches c ON c.user_id = a.coach_id
     WHERE a.program_id = $1 AND c.status = 'active'
     LIMIT 1`,
    [programId]
  )
  if (!result.rows[0]) return null
  return { userId: result.rows[0].id, name: result.rows[0].name }
}

/** Resolves id or slug and ensures the coach is assigned to that program. */
export async function assertAssigned(coachId: string, programKey: string) {
  const program = await findProgram(programKey)
  if (!program) throw new CoachAccessError('Program not found', 404)
  const result = await query(
    `SELECT 1 FROM coach_program_assignments WHERE coach_id = $1 AND program_id = $2`,
    [coachId, program.id]
  )
  if (result.rows.length === 0) throw new CoachAccessError('Program not assigned to you', 403)
  return program
}

export async function assertParticipantInProgram(coachId: string, participantId: string, programKey: string) {
  const program = await assertAssigned(coachId, programKey)
  const enrollment = await query(
    `SELECT user_id, program, status, enrolled_at
     FROM program_enrollments
     WHERE user_id = $1 AND program = $2`,
    [participantId, program.id]
  )
  if (enrollment.rows.length === 0) {
    throw new CoachAccessError('Participant not found in this program', 404)
  }
  return { program, enrollment: enrollment.rows[0] }
}

export type ReviewActivityType = 'session' | 'checkin'

/** Ensures the activity exists and is complete enough to review. */
export async function assertReviewableActivity(
  participantId: string,
  programId: string,
  activityType: ReviewActivityType,
  week: number,
  day?: number | null
) {
  if (!Number.isInteger(week) || week < 1) {
    throw new CoachAccessError('Week must be a positive whole number', 400)
  }

  if (activityType === 'session') {
    if (!Number.isInteger(day) || (day as number) < 1) {
      throw new CoachAccessError('Day is required for session reviews', 400)
    }
    const result = await query(
      `SELECT 1 FROM program_session_progress
       WHERE user_id = $1 AND program = $2 AND week = $3 AND day = $4 AND completed_at IS NOT NULL`,
      [participantId, programId, week, day]
    )
    if (result.rows.length === 0) {
      throw new CoachAccessError('That session is not completed yet', 400)
    }
    return
  }

  if (activityType === 'checkin') {
    if (day != null) {
      throw new CoachAccessError('Check-in reviews do not use a day', 400)
    }
    const result = await query(
      `SELECT 1 FROM program_checkins WHERE user_id = $1 AND program = $2 AND week = $3`,
      [participantId, programId, week]
    )
    if (result.rows.length === 0) {
      throw new CoachAccessError('That check-in has not been submitted', 400)
    }
    return
  }

  throw new CoachAccessError('Unknown activity type', 400)
}
