import { query } from '../config/db.js'
import { sendEmail } from './emailService.js'
import {
  buildCaptainMemberJoinedEmailHTML,
  buildCaptainMemberJoinedEmailText,
  buildCaptainMemberLeftEmailHTML,
  buildCaptainMemberLeftEmailText,
} from './emailTemplates.js'

/** A member can change their captain once in this many days. Choosing a first captain is always allowed. */
export const CAPTAIN_CHANGE_DAYS = 30
const DAY_MS = 86_400_000
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class CaptainChangeError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

export interface CaptainChoice {
  id: string
  name: string
  region_id: string
  zone: string
}

export interface CaptainOptions {
  /** Members can only pick captains in this zone; null when they have no zone yet. */
  zone: { id: string; name: string } | null
  current_captain_id: string | null
  /** When the member may change captain again; null when they can change now. */
  next_change_at: string | null
  change_days: number
  captains: CaptainChoice[]
}

interface MemberCaptainState {
  captain_id: string | null
  captain_chosen_at: Date | null
  captain_active: boolean
  zone_id: string | null
  zone_name: string | null
}

/**
 * The member's zone is the zone they were referred to, or else their current captain's zone.
 * A member with neither can pick any captain, and that choice sets their zone.
 */
async function loadState(userId: string): Promise<MemberCaptainState | null> {
  const result = await query(
    `SELECT u.captain_id, u.captain_chosen_at,
            (oc.status = 'active') AS captain_active,
            z.id AS zone_id, z.name AS zone_name
     FROM users u
     LEFT JOIN captains oc ON oc.user_id = u.captain_id
     LEFT JOIN regions z ON z.id = COALESCE(u.referred_by_region_id, oc.region_id)
     WHERE u.id = $1`,
    [userId]
  )
  const row = result.rows[0]
  if (!row) return null
  return { ...row, captain_active: Boolean(row.captain_active) }
}

/** When the member may next change captain, or null if they can change now. */
export function nextChangeAt(state: Pick<MemberCaptainState, 'captain_id' | 'captain_chosen_at' | 'captain_active'>, now = new Date()): Date | null {
  if (!state.captain_id || !state.captain_chosen_at || !state.captain_active) return null
  const next = new Date(new Date(state.captain_chosen_at).getTime() + CAPTAIN_CHANGE_DAYS * DAY_MS)
  return next.getTime() > now.getTime() ? next : null
}

export async function getCaptainOptions(userId: string): Promise<CaptainOptions> {
  const state = await loadState(userId)
  if (!state) throw new CaptainChangeError('User not found', 404)
  const captains = await query(
    `SELECT c.user_id AS id, u.name, r.id AS region_id, r.name AS zone
     FROM captains c
     JOIN users u ON u.id = c.user_id
     JOIN regions r ON r.id = c.region_id
     WHERE c.status = 'active' AND r.is_active = true AND c.user_id <> $1
       AND ($2::uuid IS NULL OR c.region_id = $2::uuid)
     ORDER BY r.name ASC, u.name ASC`,
    [userId, state.zone_id]
  )
  const next = nextChangeAt(state)
  return {
    zone: state.zone_id ? { id: state.zone_id, name: state.zone_name ?? '' } : null,
    current_captain_id: state.captain_id,
    next_change_at: next ? next.toISOString() : null,
    change_days: CAPTAIN_CHANGE_DAYS,
    captains: captains.rows.map((row) => ({
      id: row.id,
      name: (row.name ?? '').trim().split(/\s+/)[0] || 'Captain',
      region_id: row.region_id,
      zone: row.zone,
    })),
  }
}

const longDate = (date: Date) =>
  date.toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Nairobi' })

/**
 * Sets the member's personal captain. Never touches the referral, so commission stays with the zone.
 * The checks are repeated in the UPDATE so two quick requests cannot get around the 30-day limit.
 */
export async function changeMyCaptain(userId: string, captainId: unknown): Promise<{ captainId: string; previousCaptainId: string | null }> {
  if (typeof captainId !== 'string' || !UUID_PATTERN.test(captainId)) {
    throw new CaptainChangeError('Choose a captain')
  }
  const state = await loadState(userId)
  if (!state) throw new CaptainChangeError('User not found', 404)
  if (state.captain_id === captainId) throw new CaptainChangeError('This is already your captain')
  const next = nextChangeAt(state)
  if (next) {
    throw new CaptainChangeError(
      `You can change your captain once every ${CAPTAIN_CHANGE_DAYS} days. You can change again on ${longDate(next)}.`,
      429
    )
  }

  const updated = await query(
    `WITH me AS (
       SELECT u.id, u.captain_id AS previous_captain_id,
              COALESCE(u.referred_by_region_id, oc.region_id) AS zone_id,
              (oc.status = 'active') AS captain_active
       FROM users u
       LEFT JOIN captains oc ON oc.user_id = u.captain_id
       WHERE u.id = $1
       FOR UPDATE OF u
     )
     UPDATE users u
     SET captain_id = c.user_id, captain_chosen_at = NOW()
     FROM me, captains c
     JOIN regions r ON r.id = c.region_id
     WHERE u.id = me.id
       AND c.user_id = $2
       AND c.status = 'active'
       AND r.is_active = true
       AND c.user_id <> u.id
       AND (me.zone_id IS NULL OR c.region_id = me.zone_id)
       AND u.captain_id IS DISTINCT FROM c.user_id
       AND (
         u.captain_id IS NULL OR u.captain_chosen_at IS NULL OR me.captain_active IS NOT TRUE
         OR u.captain_chosen_at <= NOW() - make_interval(days => $3)
       )
     RETURNING me.previous_captain_id`,
    [userId, captainId, CAPTAIN_CHANGE_DAYS]
  )
  if (updated.rows.length === 0) {
    throw new CaptainChangeError(
      state.zone_id
        ? `Choose an active captain in the ${state.zone_name ?? 'your'} zone`
        : 'Choose an active captain'
    )
  }
  const previousCaptainId: string | null = updated.rows[0].previous_captain_id ?? null
  notifyCaptains(userId, captainId, previousCaptainId).catch((error) =>
    console.error('Failed to notify captains about a captain change:', error)
  )
  return { captainId, previousCaptainId }
}

function maskName(name: string | null | undefined): string {
  if (!name) return 'A member'
  const [first, ...rest] = name.trim().split(/\s+/)
  const lastInitial = rest.length ? ` ${rest[rest.length - 1][0].toUpperCase()}.` : ''
  return `${first}${lastInitial}`
}

/** Emails the new captain that a member chose them, and the previous captain that the member moved on. */
export async function notifyCaptains(userId: string, captainId: string, previousCaptainId: string | null): Promise<void> {
  const result = await query(
    `SELECT u.id, u.name, u.email FROM users u WHERE u.id = ANY($1::uuid[])`,
    [[userId, captainId, previousCaptainId].filter(Boolean)]
  )
  const byId = new Map(result.rows.map((row: { id: string; name: string | null; email: string | null }) => [row.id, row]))
  const memberName = maskName(byId.get(userId)?.name)

  const joined = byId.get(captainId)
  if (joined?.email) {
    const data = { name: joined.name, memberName }
    await sendEmail({
      to: joined.email,
      subject: `${memberName} chose you as their captain`,
      html: buildCaptainMemberJoinedEmailHTML(data),
      text: buildCaptainMemberJoinedEmailText(data),
    })
  }
  const left = previousCaptainId ? byId.get(previousCaptainId) : null
  if (left?.email) {
    const data = { name: left.name, memberName }
    await sendEmail({
      to: left.email,
      subject: `${memberName} moved to another captain`,
      html: buildCaptainMemberLeftEmailHTML(data),
      text: buildCaptainMemberLeftEmailText(data),
    })
  }
}
