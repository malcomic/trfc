import { getClient, query } from '../config/db.js'
import { ANSWER_VALUES, CHOICE_FIELDS, ZONE_EXTRAS, type ChoiceField } from '../config/signupQuestions.js'
import { isUuid } from './zones.js'

export const OUTREACH_STATUSES = ['not_contacted', 'contacted', 'replied', 'not_interested'] as const
export type OutreachStatus = (typeof OUTREACH_STATUSES)[number]

export const INACTIVE_DAY_OPTIONS = [7, 14, 30, 60] as const
export const NOTE_MAX = 1000
export const EXPORT_MAX_ROWS = 10_000
/** Filter value meaning "did not answer this question". */
export const UNANSWERED = 'none'

export type ReachOutFilters = Partial<Record<ChoiceField, string>> & {
  zone?: string
  status?: OutreachStatus
  inactive_days?: number
  has_other?: boolean
  unanswered?: boolean
  search?: string
}

/** Limits what a viewer may see. A captain role would pass its own region here. */
export interface ReachOutScope {
  regionId?: string
}

/** A team answer links to its region; extras ("not sure", "outside") have none; no answer falls back to the referral zone. */
const ZONE_REGION_SQL = 'CASE WHEN ma.zone IS NOT NULL THEN ma.zone_region_id ELSE u.referred_by_region_id END'
const ZONE_KEY_SQL = `COALESCE((${ZONE_REGION_SQL})::text, ma.zone)`
const ANY_ANSWER_SQL = [...CHOICE_FIELDS, 'zone'].map((f) => `ma.${f} IS NOT NULL`).join(' OR ')
const BASE_FROM = 'FROM users u LEFT JOIN member_answers ma ON ma.user_id = u.id'

const isTrue = (value: unknown) => value === true || value === 'true' || value === '1'

export function parseReachOutFilters(input: unknown): ReachOutFilters {
  const filters: ReachOutFilters = {}
  if (!input || typeof input !== 'object' || Array.isArray(input)) return filters
  const body = input as Record<string, unknown>

  for (const field of CHOICE_FIELDS) {
    const value = body[field]
    if (typeof value !== 'string') continue
    if (value === UNANSWERED || (ANSWER_VALUES[field] as readonly string[]).includes(value)) filters[field] = value
  }

  const zone = body.zone
  if (typeof zone === 'string' && (zone === UNANSWERED || isUuid(zone) || (ZONE_EXTRAS as readonly string[]).includes(zone))) {
    filters.zone = zone
  }

  if (typeof body.status === 'string' && (OUTREACH_STATUSES as readonly string[]).includes(body.status)) {
    filters.status = body.status as OutreachStatus
  }

  const days = Number(body.inactive_days)
  if ((INACTIVE_DAY_OPTIONS as readonly number[]).includes(days)) filters.inactive_days = days

  if (isTrue(body.has_other)) filters.has_other = true
  if (isTrue(body.unanswered)) filters.unanswered = true

  if (typeof body.search === 'string') {
    const search = body.search.trim().slice(0, 100)
    if (search) filters.search = search
  }

  return filters
}

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`)

/** Builds the WHERE clause; every value is a bound parameter. */
export function buildReachOutWhere(filters: ReachOutFilters, scope: ReachOutScope = {}): { where: string; params: unknown[] } {
  const params: unknown[] = []
  const bind = (value: unknown) => {
    params.push(value)
    return `$${params.length}`
  }
  const conditions = ["u.role NOT IN ('admin', 'scanner')"]

  for (const field of CHOICE_FIELDS) {
    const value = filters[field]
    if (!value) continue
    conditions.push(value === UNANSWERED ? `ma.${field} IS NULL` : `ma.${field} = ${bind(value)}`)
  }

  if (filters.zone) {
    if (filters.zone === UNANSWERED) conditions.push(`${ZONE_KEY_SQL} IS NULL`)
    else if (isUuid(filters.zone)) conditions.push(`(${ZONE_REGION_SQL}) = ${bind(filters.zone)}::uuid`)
    else conditions.push(`ma.zone = ${bind(filters.zone)}`)
  }

  if (filters.status) conditions.push(`COALESCE(ma.outreach_status, 'not_contacted') = ${bind(filters.status)}`)

  if (filters.inactive_days) {
    conditions.push(`(u.last_active_at IS NULL OR u.last_active_at < NOW() - make_interval(days => ${bind(filters.inactive_days)}::int))`)
  }

  if (filters.has_other) conditions.push('ma.hardest_now_other IS NOT NULL')
  if (filters.unanswered) conditions.push(`NOT COALESCE(${ANY_ANSWER_SQL}, false)`)

  if (filters.search) {
    const text = bind(`%${escapeLike(filters.search)}%`)
    const searchParts = [`u.name ILIKE ${text}`, `u.email ILIKE ${text}`, `u.phone ILIKE ${text}`]
    const digits = filters.search.replace(/\D/g, '').replace(/^0+/, '')
    if (digits.length >= 3) searchParts.push(`u.phone_normalized LIKE ${bind(`%${digits}%`)}`)
    conditions.push(`(${searchParts.join(' OR ')})`)
  }

  if (scope.regionId) conditions.push(`(${ZONE_REGION_SQL}) = ${bind(scope.regionId)}::uuid`)

  return { where: `WHERE ${conditions.join(' AND ')}`, params }
}

export interface ReachOutMember {
  id: string
  name: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  created_at: string
  last_active_at: string | null
  hardest_now: string | null
  hardest_now_other: string | null
  goal_3m: string | null
  time_with_trfc: string | null
  want_more: string | null
  exercise_frequency: string | null
  zone: string | null
  zone_name: string | null
  outreach_status: OutreachStatus
  events_attended: number
  last_contacted_at: string | null
  last_contacted_by: string | null
  last_note: string | null
}

// contact_consent is deliberately not selected until the owner confirms the consent box.
const MEMBER_SELECT = `
  SELECT u.id, u.name, u.phone, u.whatsapp, u.email, u.created_at, u.last_active_at,
         ma.hardest_now, ma.hardest_now_other, ma.goal_3m, ma.time_with_trfc, ma.want_more,
         ma.exercise_frequency, ma.zone, r.name AS zone_name,
         COALESCE(ma.outreach_status, 'not_contacted') AS outreach_status,
         (SELECT COUNT(*)::int FROM tickets t
          WHERE t.user_id = u.id AND t.payment_status = 'paid'
            AND (t.checked_in_at IS NOT NULL OR t.attendance_status = 'attended')) AS events_attended,
         last_log.created_at AS last_contacted_at, last_log.note AS last_note, cb.name AS last_contacted_by
  ${BASE_FROM}
  LEFT JOIN regions r ON r.id = (${ZONE_REGION_SQL})
  LEFT JOIN LATERAL (
    SELECT l.created_at, l.note, l.contacted_by FROM outreach_log l
    WHERE l.user_id = u.id ORDER BY l.created_at DESC LIMIT 1
  ) last_log ON true
  LEFT JOIN users cb ON cb.id = last_log.contacted_by`

export async function countReachOutMembers(filters: ReachOutFilters, scope: ReachOutScope = {}): Promise<number> {
  const { where, params } = buildReachOutWhere(filters, scope)
  const result = await query(`SELECT COUNT(*)::int AS total ${BASE_FROM} ${where}`, params)
  return result.rows[0]?.total ?? 0
}

export async function listReachOutMembers(
  filters: ReachOutFilters,
  scope: ReachOutScope,
  page: { limit: number; offset: number }
): Promise<ReachOutMember[]> {
  const { where, params } = buildReachOutWhere(filters, scope)
  const limitParam = `$${params.length + 1}`
  const offsetParam = `$${params.length + 2}`
  const result = await query(
    `${MEMBER_SELECT} ${where} ORDER BY u.created_at DESC, u.id LIMIT ${limitParam} OFFSET ${offsetParam}`,
    [...params, page.limit, page.offset]
  )
  return result.rows
}

export interface AnswerCount {
  value: string | null
  label?: string | null
  count: number
}

export interface ReachOutStats {
  total: number
  answered: number
  active_14d: number
  questions: Record<ChoiceField | 'zone', AnswerCount[]>
}

export async function getReachOutStats(scope: ReachOutScope = {}): Promise<ReachOutStats> {
  const { where, params } = buildReachOutWhere({}, scope)
  const answerValues = CHOICE_FIELDS.map((field) => `('${field}', ma.${field})`).join(', ')

  const [totals, answers, zones] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE ${ANY_ANSWER_SQL})::int AS answered,
              COUNT(*) FILTER (WHERE u.last_active_at > NOW() - INTERVAL '14 days')::int AS active_14d
       ${BASE_FROM} ${where}`,
      params
    ),
    query(
      `SELECT a.q, a.v AS value, COUNT(*)::int AS count
       ${BASE_FROM}
       CROSS JOIN LATERAL (VALUES ${answerValues}) AS a(q, v)
       ${where}
       GROUP BY a.q, a.v`,
      params
    ),
    query(
      `SELECT ${ZONE_KEY_SQL} AS value, MIN(r.name) AS label, COUNT(*)::int AS count
       ${BASE_FROM}
       LEFT JOIN regions r ON r.id = (${ZONE_REGION_SQL})
       ${where}
       GROUP BY 1`,
      params
    ),
  ])

  const questions = Object.fromEntries([...CHOICE_FIELDS, 'zone'].map((f) => [f, [] as AnswerCount[]])) as ReachOutStats['questions']
  for (const row of answers.rows) {
    questions[row.q as ChoiceField]?.push({ value: row.value, count: row.count })
  }
  questions.zone = zones.rows.map((row) => ({ value: row.value, label: row.label, count: row.count }))
  for (const list of Object.values(questions)) list.sort((a, b) => b.count - a.count)

  const row = totals.rows[0] ?? {}
  return { total: row.total ?? 0, answered: row.answered ?? 0, active_14d: row.active_14d ?? 0, questions }
}

export async function logReachOutAccess(
  userId: string | undefined,
  action: 'view' | 'export',
  filters: ReachOutFilters,
  rowCount: number | null
): Promise<void> {
  await query(
    'INSERT INTO reach_out_access_log (user_id, action, filters, row_count) VALUES ($1, $2, $3, $4)',
    [userId ?? null, action, JSON.stringify(filters), rowCount]
  )
}

export interface OutreachEntry {
  id: string
  status: OutreachStatus
  note: string | null
  created_at: string
  contacted_by_name: string | null
}

export async function getOutreachLog(userId: string): Promise<OutreachEntry[]> {
  const result = await query(
    `SELECT l.id, l.status, l.note, l.created_at, cb.name AS contacted_by_name
     FROM outreach_log l
     LEFT JOIN users cb ON cb.id = l.contacted_by
     WHERE l.user_id = $1
     ORDER BY l.created_at DESC`,
    [userId]
  )
  return result.rows
}

export class OutreachInputError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

/** Appends a history entry and sets the member's current status. Log rows are never changed afterwards. */
export async function addOutreachEntry(memberId: string, actorId: string, status: unknown, note: unknown): Promise<OutreachEntry> {
  if (!isUuid(memberId)) throw new OutreachInputError('Member not found', 404)
  if (typeof status !== 'string' || !(OUTREACH_STATUSES as readonly string[]).includes(status)) {
    throw new OutreachInputError('Choose a valid status')
  }
  const cleanNote = typeof note === 'string' ? note.trim() : ''
  if (cleanNote.length > NOTE_MAX) throw new OutreachInputError(`Notes can be up to ${NOTE_MAX} characters`)

  const member = await query("SELECT id FROM users WHERE id = $1 AND role NOT IN ('admin', 'scanner')", [memberId])
  if (member.rows.length === 0) throw new OutreachInputError('Member not found', 404)

  const client = await getClient()
  try {
    await client.query('BEGIN')
    const inserted = await client.query(
      `INSERT INTO outreach_log (user_id, status, note, contacted_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, status, note, created_at`,
      [memberId, status, cleanNote || null, actorId]
    )
    await client.query(
      `INSERT INTO member_answers (user_id, outreach_status) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET outreach_status = EXCLUDED.outreach_status`,
      [memberId, status]
    )
    await client.query('COMMIT')
    const actor = await query('SELECT name FROM users WHERE id = $1', [actorId])
    return { ...inserted.rows[0], contacted_by_name: actor.rows[0]?.name ?? null }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/** Blank answers and "Prefer not to say" show as a dash. */
export function formatAnswer(value: string | null | undefined): string {
  return !value || value === 'prefer_not_to_say' ? '-' : value
}

const FORMULA_START = /^[=+\-@\t\r]/

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '""'
  let text = value instanceof Date ? value.toISOString() : String(value)
  // Stops spreadsheet apps from running a cell as a formula.
  if (text !== '-' && FORMULA_START.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export function toCsv(columns: { key: string; label: string }[], rows: Record<string, unknown>[]): string {
  const lines = [columns.map((c) => csvCell(c.label)).join(',')]
  for (const row of rows) lines.push(columns.map((c) => csvCell(row[c.key])).join(','))
  return `\uFEFF${lines.join('\r\n')}\r\n`
}

const ANSWER_EXPORT_FIELDS: (keyof ReachOutMember)[] = ['time_with_trfc', 'hardest_now', 'goal_3m', 'want_more', 'exercise_frequency']

export const EXPORT_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'zone', label: 'Zone' },
  { key: 'joined_on', label: 'Joined on' },
  { key: 'time_with_trfc', label: 'Time with TRFC' },
  { key: 'hardest_now', label: 'Hardest right now' },
  { key: 'hardest_now_other', label: 'Hardest right now (Other)' },
  { key: 'goal_3m', label: 'Wants most in 3 months' },
  { key: 'want_more', label: 'Wants more of' },
  { key: 'exercise_frequency', label: 'How often they exercise' },
  { key: 'last_active_at', label: 'Last active' },
  { key: 'events_attended', label: 'Events attended' },
  { key: 'outreach_status', label: 'Status' },
  { key: 'last_contacted_by', label: 'Last contacted by' },
  { key: 'last_contacted_at', label: 'Last contacted on' },
  { key: 'last_note', label: 'Last note' },
]

export function toExportRow(member: ReachOutMember): Record<string, unknown> {
  const row: Record<string, unknown> = {
    ...member,
    zone: member.zone_name ?? formatAnswer(member.zone),
    joined_on: member.created_at,
    hardest_now_other: member.hardest_now_other ?? '',
  }
  for (const field of ANSWER_EXPORT_FIELDS) row[field] = formatAnswer(member[field] as string | null)
  return row
}

export async function listSavedFilters(scope: ReachOutScope = {}) {
  const result = await query(
    `SELECT f.id, f.name, f.filters, f.created_at, u.name AS created_by_name
     FROM reach_out_saved_filters f
     LEFT JOIN users u ON u.id = f.created_by
     ORDER BY f.created_at ASC`
  )
  return Promise.all(
    result.rows.map(async (row) => {
      const filters = parseReachOutFilters(row.filters)
      return { ...row, filters, count: await countReachOutMembers(filters, scope) }
    })
  )
}
