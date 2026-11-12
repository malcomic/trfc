import type { PoolClient } from 'pg'
import { isActiveMember } from './seatPriority.js'

type Queryable = Pick<PoolClient, 'query'>

export const POLL_QUESTION_MIN = 3
export const POLL_QUESTION_MAX = 200
export const POLL_DESCRIPTION_MAX = 1000
export const POLL_OPTION_MAX = 120
export const POLL_MIN_OPTIONS = 2
export const POLL_MAX_OPTIONS = 8
/** Closed polls stay on the member page this long so people can see the final result. */
export const RECENTLY_CLOSED_DAYS = 60

export type PollStatus = 'upcoming' | 'open' | 'closed'

export class PollError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export interface PollTimes {
  opens_at: Date | string
  closes_at: Date | string
  closed_early_at?: Date | string | null
}

export function pollStatus(poll: PollTimes, now = new Date()): PollStatus {
  if (poll.closed_early_at) return 'closed'
  if (new Date(poll.closes_at).getTime() <= now.getTime()) return 'closed'
  if (new Date(poll.opens_at).getTime() > now.getTime()) return 'upcoming'
  return 'open'
}

/** Whole-number percentages that add up to 100 (largest remainder), or all zero when nobody has voted. */
export function percentages(counts: number[]): number[] {
  const total = counts.reduce((sum, n) => sum + n, 0)
  if (total === 0) return counts.map(() => 0)
  const exact = counts.map((n) => (n * 100) / total)
  const result = exact.map(Math.floor)
  let left = 100 - result.reduce((sum, n) => sum + n, 0)
  const order = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
  for (const { index } of order) {
    if (left <= 0) break
    result[index]++
    left--
  }
  return result
}

export interface PollOptionResult {
  id: string
  label: string
  votes: number
  percent: number
}

export interface PollResult {
  options: PollOptionResult[]
  total: number
  myVote: string | null
}

/** Per-option counts for each poll, plus the option this user picked (if a user is given). */
export async function pollResults(db: Queryable, pollIds: string[], userId: string | null): Promise<Map<string, PollResult>> {
  const results = new Map<string, PollResult>()
  if (pollIds.length === 0) return results
  const [options, mine] = await Promise.all([
    db.query(
      `SELECT o.id, o.poll_id, o.label, o.sort_order, COUNT(v.user_id)::int AS votes
       FROM member_poll_options o
       LEFT JOIN member_votes v ON v.option_id = o.id
       WHERE o.poll_id = ANY($1::uuid[])
       GROUP BY o.id
       ORDER BY o.poll_id, o.sort_order, o.label`,
      [pollIds]
    ),
    userId
      ? db.query('SELECT poll_id, option_id FROM member_votes WHERE user_id = $1 AND poll_id = ANY($2::uuid[])', [userId, pollIds])
      : Promise.resolve({ rows: [] as any[] }),
  ])
  const myVotes = new Map<string, string>(mine.rows.map((r: any) => [r.poll_id, r.option_id]))
  for (const id of pollIds) {
    const rows = options.rows.filter((r: any) => r.poll_id === id)
    const counts = rows.map((r: any) => Number(r.votes) || 0)
    const pct = percentages(counts)
    results.set(id, {
      options: rows.map((r: any, i: number) => ({ id: r.id, label: r.label, votes: counts[i], percent: pct[i] })),
      total: counts.reduce((sum: number, n: number) => sum + n, 0),
      myVote: myVotes.get(id) ?? null,
    })
  }
  return results
}

/** One vote per member per poll; voting again replaces the earlier choice while the poll is open. */
export async function castVote(db: Queryable, userId: string, pollId: string, optionId: string, now = new Date()) {
  if (!(await isActiveMember(db, userId))) throw new PollError(403, 'Only members can vote')
  const poll = await db.query('SELECT id, opens_at, closes_at, closed_early_at FROM member_polls WHERE id = $1', [pollId])
  if (!poll.rows[0]) throw new PollError(404, 'Poll not found')
  const status = pollStatus(poll.rows[0], now)
  if (status === 'upcoming') throw new PollError(400, 'This poll is not open yet')
  if (status === 'closed') throw new PollError(400, 'This poll has closed')
  const option = await db.query('SELECT id FROM member_poll_options WHERE id = $1 AND poll_id = $2', [optionId, pollId])
  if (!option.rows[0]) throw new PollError(400, 'Pick one of the options in this poll')
  await db.query(
    `INSERT INTO member_votes (poll_id, user_id, option_id) VALUES ($1, $2, $3)
     ON CONFLICT (poll_id, user_id) DO UPDATE SET option_id = EXCLUDED.option_id, updated_at = NOW()`,
    [pollId, userId, optionId]
  )
}

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

export interface PollInput {
  question: string
  description: string
  opensAt: Date
  closesAt: Date
  options: string[]
  announce: boolean
}

export type PollUpdate = Partial<Omit<PollInput, 'announce'>>

function parseQuestion(value: unknown): Parsed<string> {
  const question = typeof value === 'string' ? value.trim() : ''
  if (question.length < POLL_QUESTION_MIN || question.length > POLL_QUESTION_MAX) {
    return { ok: false, error: `The question must be between ${POLL_QUESTION_MIN} and ${POLL_QUESTION_MAX} characters` }
  }
  return { ok: true, value: question }
}

function parseDescription(value: unknown): Parsed<string> {
  const description = typeof value === 'string' ? value.trim() : ''
  if (description.length > POLL_DESCRIPTION_MAX) {
    return { ok: false, error: `Keep the description under ${POLL_DESCRIPTION_MAX} characters` }
  }
  return { ok: true, value: description }
}

export function parsePollOptions(value: unknown): Parsed<string[]> {
  if (!Array.isArray(value)) return { ok: false, error: `Add ${POLL_MIN_OPTIONS} to ${POLL_MAX_OPTIONS} options` }
  const options = value.map((o) => (typeof o === 'string' ? o.trim() : '')).filter(Boolean)
  if (options.length < POLL_MIN_OPTIONS || options.length > POLL_MAX_OPTIONS) {
    return { ok: false, error: `Add ${POLL_MIN_OPTIONS} to ${POLL_MAX_OPTIONS} options` }
  }
  if (options.some((o) => o.length > POLL_OPTION_MAX)) {
    return { ok: false, error: `Keep each option under ${POLL_OPTION_MAX} characters` }
  }
  if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) {
    return { ok: false, error: 'Each option must be different' }
  }
  return { ok: true, value: options }
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function parsePollInput(body: any, now = new Date()): Parsed<PollInput> {
  const question = parseQuestion(body?.question)
  if (!question.ok) return question
  const description = parseDescription(body?.description)
  if (!description.ok) return description
  const options = parsePollOptions(body?.options)
  if (!options.ok) return options
  const opensAt = body?.opensAt ? parseDate(body.opensAt) : now
  if (!opensAt) return { ok: false, error: 'Pick when the poll opens' }
  const closesAt = parseDate(body?.closesAt)
  if (!closesAt) return { ok: false, error: 'Pick when the poll closes' }
  if (closesAt.getTime() <= opensAt.getTime()) return { ok: false, error: 'The poll must close after it opens' }
  if (closesAt.getTime() <= now.getTime()) return { ok: false, error: 'The closing date must be in the future' }
  return {
    ok: true,
    value: {
      question: question.value,
      description: description.value,
      opensAt,
      closesAt,
      options: options.value,
      announce: body?.announce === true,
    },
  }
}

export function parsePollUpdate(body: any): Parsed<PollUpdate> {
  const value: PollUpdate = {}
  if (body?.question !== undefined) {
    const question = parseQuestion(body.question)
    if (!question.ok) return question
    value.question = question.value
  }
  if (body?.description !== undefined) {
    const description = parseDescription(body.description)
    if (!description.ok) return description
    value.description = description.value
  }
  if (body?.opensAt !== undefined) {
    const opensAt = parseDate(body.opensAt)
    if (!opensAt) return { ok: false, error: 'Pick when the poll opens' }
    value.opensAt = opensAt
  }
  if (body?.closesAt !== undefined) {
    const closesAt = parseDate(body.closesAt)
    if (!closesAt) return { ok: false, error: 'Pick when the poll closes' }
    value.closesAt = closesAt
  }
  if (body?.options !== undefined) {
    const options = parsePollOptions(body.options)
    if (!options.ok) return options
    value.options = options.value
  }
  return { ok: true, value }
}

export function pollFromRow(row: any, result: PollResult | undefined, now = new Date()) {
  return {
    id: row.id as string,
    question: row.question as string,
    description: (row.description as string) ?? '',
    opensAt: new Date(row.opens_at).toISOString(),
    closesAt: new Date(row.closes_at).toISOString(),
    closedEarlyAt: row.closed_early_at ? new Date(row.closed_early_at).toISOString() : null,
    status: pollStatus(row, now),
    options: result?.options ?? [],
    total: result?.total ?? 0,
    myVote: result?.myVote ?? null,
  }
}
