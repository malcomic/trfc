export const REVIEW_STATUSES = ['reviewed', 'needs_clarification', 'flagged'] as const
export type ReviewStatus = (typeof REVIEW_STATUSES)[number]

export const REVIEW_NOTE_MAX = 2000
export const FEEDBACK_BODY_MAX = 5000
export const REVIEW_QUEUE_LIMIT = 50

export function isReviewStatus(value: unknown): value is ReviewStatus {
  return typeof value === 'string' && (REVIEW_STATUSES as readonly string[]).includes(value)
}

export function isReviewActivityType(value: unknown): value is 'session' | 'checkin' {
  return value === 'session' || value === 'checkin'
}

export function normalizeReviewNote(note: unknown): string | null {
  if (note == null || note === '') return null
  if (typeof note !== 'string') throw Object.assign(new Error('Note must be text'), { status: 400 })
  const trimmed = note.trim()
  if (trimmed.length > REVIEW_NOTE_MAX) {
    throw Object.assign(new Error(`Note can be up to ${REVIEW_NOTE_MAX} characters`), { status: 400 })
  }
  return trimmed || null
}

export function normalizeFeedbackBody(body: unknown): string {
  if (typeof body !== 'string' || !body.trim()) {
    throw Object.assign(new Error('Feedback cannot be empty'), { status: 400 })
  }
  const trimmed = body.trim()
  if (trimmed.length > FEEDBACK_BODY_MAX) {
    throw Object.assign(new Error(`Feedback can be up to ${FEEDBACK_BODY_MAX} characters`), { status: 400 })
  }
  return trimmed
}
