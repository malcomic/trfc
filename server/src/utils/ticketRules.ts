import { query } from '../config/db.js'

export interface TicketRules {
  creditDays: number
  earlyNoticeHours: number
  depositPct: number
  depositRoundTo: number
  defaultDeadlineDays: number
  priorityReleaseDays: number
  markPresentHours: number
  captainProfitShareEnabled: boolean
  captainProfitSharePct: number
  termsVersion: string
}

export const DEFAULT_TICKET_RULES: TicketRules = {
  creditDays: 60,
  earlyNoticeHours: 24,
  depositPct: 30,
  depositRoundTo: 10,
  defaultDeadlineDays: 3,
  priorityReleaseDays: 7,
  markPresentHours: 48,
  captainProfitShareEnabled: true,
  captainProfitSharePct: 20,
  termsVersion: '2026-10',
}

const CACHE_TTL_MS = 60_000
let cached: { value: TicketRules; expiresAt: number } | null = null

export async function getTicketRules({ fresh = false }: { fresh?: boolean } = {}): Promise<TicketRules> {
  if (!fresh && cached && cached.expiresAt > Date.now()) return cached.value
  const result = await query(
    `SELECT credit_days, early_notice_hours, deposit_pct::float AS deposit_pct, deposit_round_to,
            default_deadline_days, priority_release_days, mark_present_hours,
            captain_profit_share_enabled, captain_profit_share_pct::float AS captain_profit_share_pct, terms_version
     FROM ticket_rules_settings WHERE id = 1`
  )
  const row = result.rows[0]
  const value: TicketRules = row
    ? {
        creditDays: Number(row.credit_days),
        earlyNoticeHours: Number(row.early_notice_hours),
        depositPct: Number(row.deposit_pct),
        depositRoundTo: Number(row.deposit_round_to),
        defaultDeadlineDays: Number(row.default_deadline_days),
        priorityReleaseDays: Number(row.priority_release_days),
        markPresentHours: Number(row.mark_present_hours),
        captainProfitShareEnabled: Boolean(row.captain_profit_share_enabled),
        captainProfitSharePct: Number(row.captain_profit_share_pct),
        termsVersion: String(row.terms_version),
      }
    : DEFAULT_TICKET_RULES
  cached = { value, expiresAt: Date.now() + CACHE_TTL_MS }
  return value
}

export function clearTicketRulesCache() {
  cached = null
}

const INT_RANGES: Partial<Record<keyof TicketRules, [number, number]>> = {
  creditDays: [1, 365],
  earlyNoticeHours: [0, 720],
  depositRoundTo: [1, 1000],
  defaultDeadlineDays: [0, 30],
  priorityReleaseDays: [0, 60],
  markPresentHours: [0, 720],
}

/** Validates an admin update. Returns an error message, or the merged rules. */
export function parseTicketRules(body: any, current: TicketRules): TicketRules | string {
  const next: TicketRules = { ...current }
  for (const [key, [min, max]] of Object.entries(INT_RANGES) as [keyof TicketRules, [number, number]][]) {
    if (body?.[key] === undefined) continue
    const value = Number(body[key])
    if (!Number.isInteger(value) || value < min || value > max) return `${key} must be a whole number from ${min} to ${max}`
    ;(next as any)[key] = value
  }
  for (const key of ['depositPct', 'captainProfitSharePct'] as const) {
    if (body?.[key] === undefined) continue
    const value = Number(body[key])
    if (!Number.isFinite(value) || value < 0 || value > 100) return `${key} must be between 0 and 100`
    next[key] = value
  }
  if (body?.captainProfitShareEnabled !== undefined) {
    next.captainProfitShareEnabled = Boolean(body.captainProfitShareEnabled)
  }
  if (body?.termsVersion !== undefined) {
    const version = String(body.termsVersion).trim()
    if (!version || version.length > 20) return 'termsVersion must be 1 to 20 characters'
    next.termsVersion = version
  }
  return next
}

export async function updateTicketRules(rules: TicketRules, updatedBy: string): Promise<void> {
  await query(
    `INSERT INTO ticket_rules_settings
       (id, credit_days, early_notice_hours, deposit_pct, deposit_round_to, default_deadline_days,
        priority_release_days, mark_present_hours, captain_profit_share_enabled, captain_profit_share_pct,
        terms_version, updated_at, updated_by)
     VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11)
     ON CONFLICT (id) DO UPDATE SET
       credit_days = EXCLUDED.credit_days, early_notice_hours = EXCLUDED.early_notice_hours,
       deposit_pct = EXCLUDED.deposit_pct, deposit_round_to = EXCLUDED.deposit_round_to,
       default_deadline_days = EXCLUDED.default_deadline_days, priority_release_days = EXCLUDED.priority_release_days,
       mark_present_hours = EXCLUDED.mark_present_hours,
       captain_profit_share_enabled = EXCLUDED.captain_profit_share_enabled,
       captain_profit_share_pct = EXCLUDED.captain_profit_share_pct, terms_version = EXCLUDED.terms_version,
       updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
    [
      rules.creditDays,
      rules.earlyNoticeHours,
      rules.depositPct,
      rules.depositRoundTo,
      rules.defaultDeadlineDays,
      rules.priorityReleaseDays,
      rules.markPresentHours,
      rules.captainProfitShareEnabled,
      rules.captainProfitSharePct,
      rules.termsVersion,
      updatedBy,
    ]
  )
  cached = null
}

/*
 * Nairobi calendar helpers. Africa/Nairobi is UTC+3 all year (no daylight saving).
 * Calendar days are passed around as 'YYYY-MM-DD' strings so that `events.event_date`
 * (a timestamp without time zone holding Nairobi wall-clock time) never goes through the
 * server's local time zone. Select it with to_char(e.event_date, 'YYYY-MM-DD').
 */
const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

function parseDay(day: string): [number, number, number] {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(day)
  if (!match) throw new Error(`Invalid calendar day: ${day}`)
  return [Number(match[1]), Number(match[2]) - 1, Number(match[3])]
}

/** The Nairobi calendar day an instant falls on. */
export function nairobiDay(at: Date): string {
  return new Date(at.getTime() + NAIROBI_OFFSET_MS).toISOString().slice(0, 10)
}

export function addDays(day: string, days: number): string {
  const [y, m, d] = parseDay(day)
  return new Date(Date.UTC(y, m, d + days)).toISOString().slice(0, 10)
}

/** The instant of hh:mm:ss Nairobi time on `day`. */
export function nairobiTime(day: string, hours = 0, minutes = 0, seconds = 0): Date {
  const [y, m, d] = parseDay(day)
  return new Date(Date.UTC(y, m, d, hours, minutes, seconds) - NAIROBI_OFFSET_MS)
}

export function endOfNairobiDay(day: string): Date {
  return nairobiTime(day, 23, 59, 59)
}

/** Day 1 is the day after the event; the credit ends at 23:59:59 Nairobi on day `creditDays`. */
export function creditExpiry(eventDay: string, creditDays: number): Date {
  return endOfNairobiDay(addDays(eventDay, creditDays))
}

/** Credit from a missed event appears on the wallet the morning after the event. */
export function creditAvailableFrom(eventDay: string): Date {
  return nairobiTime(addDays(eventDay, 1), 6)
}

/** A ticket paid in parts must be fully paid by the end of the day `deadlineDays` before the event. */
export function planDeadline(eventDay: string, deadlineDays: number): Date {
  return endOfNairobiDay(addDays(eventDay, -deadlineDays))
}

/** First payment: `pct`% of the total, rounded up to the next `roundTo` shillings, never more than the total. */
export function depositFor(total: number, pct: number, roundTo: number): number {
  if (!(total > 0)) return 0
  const raw = Math.round(total * pct) / 100
  const rounded = Math.ceil(raw / roundTo - 1e-9) * roundTo
  return Math.min(total, rounded)
}

/** Whole Nairobi days left including today, so the last day shows 1. */
export function daysLeft(expiresAt: Date, now: Date = new Date()): number {
  if (expiresAt.getTime() <= now.getTime()) return 0
  const [y1, m1, d1] = parseDay(nairobiDay(now))
  const [y2, m2, d2] = parseDay(nairobiDay(expiresAt))
  return Math.round((Date.UTC(y2, m2, d2) - Date.UTC(y1, m1, d1)) / DAY_MS) + 1
}

const WEDNESDAY = 3
const TUESDAY = 2
const DELIVERY_CUTOFF_HOUR = 20

/**
 * Clothing is delivered on Wednesdays. Orders placed before 8:00 pm Nairobi on Tuesday arrive that
 * Wednesday; from Tuesday 8:00 pm onward (including Wednesday) they arrive the following Wednesday.
 */
export function nextDeliveryWednesday(at: Date): string {
  const local = new Date(at.getTime() + NAIROBI_OFFSET_MS)
  const weekday = local.getUTCDay()
  const today = local.toISOString().slice(0, 10)
  let ahead = (WEDNESDAY - weekday + 7) % 7
  if (ahead === 0) ahead = 7
  if (weekday === TUESDAY && local.getUTCHours() >= DELIVERY_CUTOFF_HOUR) ahead += 7
  return addDays(today, ahead)
}

export function formatNairobiDate(at: Date | string, opts: Intl.DateTimeFormatOptions = {}): string {
  const date = typeof at === 'string' ? (at.length === 10 ? nairobiTime(at, 12) : new Date(at)) : at
  return date.toLocaleDateString('en-KE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Nairobi',
    ...opts,
  })
}
