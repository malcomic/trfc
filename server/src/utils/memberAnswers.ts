import { query } from '../config/db.js'
import { ANSWER_VALUES, CHOICE_FIELDS, OTHER_TEXT_MAX, ZONE_EXTRAS, type ChoiceField } from '../config/signupQuestions.js'

export type MemberAnswers = Record<ChoiceField, string | null> & {
  hardest_now_other: string | null
  zone: string | null
}

export interface StoredMemberAnswers extends MemberAnswers {
  answers_saved_at: string | null
  answers_updated_at: string | null
}

const ZONE_SLUG_PATTERN = /^[a-z0-9-]{1,100}$/

export function emptyAnswers(): MemberAnswers {
  return {
    hardest_now: null,
    hardest_now_other: null,
    goal_3m: null,
    time_with_trfc: null,
    want_more: null,
    exercise_frequency: null,
    zone: null,
  }
}

/** Keeps only known values; anything unknown or blank becomes null. Never throws. */
export function parseAnswers(input: unknown): MemberAnswers {
  const answers = emptyAnswers()
  if (!input || typeof input !== 'object' || Array.isArray(input)) return answers
  const body = input as Record<string, unknown>

  for (const field of CHOICE_FIELDS) {
    const value = body[field]
    if (typeof value === 'string' && (ANSWER_VALUES[field] as readonly string[]).includes(value)) {
      answers[field] = value
    }
  }

  if (answers.hardest_now === 'other' && typeof body.hardest_now_other === 'string') {
    const text = body.hardest_now_other.trim().slice(0, OTHER_TEXT_MAX)
    answers.hardest_now_other = text || null
  }

  if (typeof body.zone === 'string') {
    const zone = body.zone.trim().toLowerCase()
    if ((ZONE_EXTRAS as readonly string[]).includes(zone) || ZONE_SLUG_PATTERN.test(zone)) answers.zone = zone
  }

  return answers
}

export function hasAnyAnswer(answers: MemberAnswers): boolean {
  return Object.values(answers).some((value) => value !== null)
}

/**
 * Resolves the zone answer to a stored value and region link. Team slugs must match an active
 * region; when no zone was given, `fallbackRegionId` (the referral zone) is used instead.
 */
export async function resolveZone(
  zone: string | null,
  fallbackRegionId?: string | null
): Promise<{ zone: string | null; zone_region_id: string | null }> {
  if (zone && (ZONE_EXTRAS as readonly string[]).includes(zone)) return { zone, zone_region_id: null }
  if (zone) {
    const result = await query('SELECT id, slug FROM regions WHERE slug = $1 AND is_active = true', [zone])
    const region = result.rows[0]
    if (region) return { zone: region.slug, zone_region_id: region.id }
  }
  if (fallbackRegionId) {
    const result = await query('SELECT id, slug FROM regions WHERE id = $1', [fallbackRegionId])
    const region = result.rows[0]
    if (region) return { zone: region.slug, zone_region_id: region.id }
  }
  return { zone: null, zone_region_id: null }
}

export async function saveMemberAnswers(
  userId: string,
  answers: MemberAnswers,
  options: { fallbackRegionId?: string | null } = {}
): Promise<void> {
  const { zone, zone_region_id } = await resolveZone(answers.zone, options.fallbackRegionId)
  await query(
    `INSERT INTO member_answers
       (user_id, hardest_now, hardest_now_other, goal_3m, time_with_trfc, want_more,
        exercise_frequency, zone, zone_region_id, answers_saved_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       hardest_now = EXCLUDED.hardest_now,
       hardest_now_other = EXCLUDED.hardest_now_other,
       goal_3m = EXCLUDED.goal_3m,
       time_with_trfc = EXCLUDED.time_with_trfc,
       want_more = EXCLUDED.want_more,
       exercise_frequency = EXCLUDED.exercise_frequency,
       zone = EXCLUDED.zone,
       zone_region_id = EXCLUDED.zone_region_id,
       answers_saved_at = COALESCE(member_answers.answers_saved_at, EXCLUDED.answers_saved_at),
       answers_updated_at = NOW()`,
    [
      userId,
      answers.hardest_now,
      answers.hardest_now_other,
      answers.goal_3m,
      answers.time_with_trfc,
      answers.want_more,
      answers.exercise_frequency,
      zone,
      zone_region_id,
    ]
  )
}

export async function getMemberAnswers(userId: string): Promise<StoredMemberAnswers> {
  const result = await query(
    `SELECT hardest_now, hardest_now_other, goal_3m, time_with_trfc, want_more, exercise_frequency,
            zone, answers_saved_at, answers_updated_at
     FROM member_answers WHERE user_id = $1`,
    [userId]
  )
  return result.rows[0] ?? { ...emptyAnswers(), answers_saved_at: null, answers_updated_at: null }
}

/** Clears every answer. The row stays because it also holds the team's outreach status. */
export async function deleteMemberAnswers(userId: string): Promise<void> {
  await query(
    `UPDATE member_answers
     SET hardest_now = NULL, hardest_now_other = NULL, goal_3m = NULL, time_with_trfc = NULL, want_more = NULL,
         exercise_frequency = NULL, zone = NULL, zone_region_id = NULL,
         answers_saved_at = NULL, answers_updated_at = NOW()
     WHERE user_id = $1`,
    [userId]
  )
}
