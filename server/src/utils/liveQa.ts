import type { PoolClient } from 'pg'
import { query } from '../config/db.js'
import { getPerk } from './memberPerks.js'
import { publishAnnouncement } from './publishAnnouncement.js'

type Queryable = Pick<PoolClient, 'query'>
const poolDb = { query } as unknown as Queryable

const HOUR_MS = 60 * 60 * 1000
export const JOIN_OPENS_BEFORE_MS = HOUR_MS
export const JOIN_CLOSES_AFTER_MS = 2 * HOUR_MS
/** The hourly job sends the reminder once the session is inside this window. */
export const REMINDER_FROM_MS = 28 * HOUR_MS
export const REMINDER_UNTIL_MS = 20 * HOUR_MS
export const LIVE_QA_TITLE_MAX = 120
export const LIVE_QA_NOTES_MAX = 1000

export interface LiveQaSettings {
  nextAt: Date | null
  zoomUrl: string
  title: string
  notes: string
}

export interface LiveQa extends LiveQaSettings {
  on: boolean
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function liveQaFromSettings(settings: Record<string, unknown> | null | undefined): LiveQaSettings {
  const raw = text(settings?.next_at)
  const nextAt = raw ? new Date(raw) : null
  return {
    nextAt: nextAt && !Number.isNaN(nextAt.getTime()) ? nextAt : null,
    zoomUrl: text(settings?.zoom_url),
    title: text(settings?.title),
    notes: text(settings?.notes),
  }
}

export async function getLiveQa(db: Queryable = poolDb): Promise<LiveQa> {
  const perk = await getPerk(db, 'live_qa')
  return { on: perk?.status === 'on', ...liveQaFromSettings(perk?.settings) }
}

/** What a viewer may see. The Zoom link only goes to members, from 1 hour before until 2 hours after the start. */
export function liveQaView(liveQa: LiveQa, isMember: boolean, now: Date) {
  const nextAt = liveQa.on ? liveQa.nextAt : null
  const start = nextAt?.getTime() ?? 0
  const inWindow =
    nextAt != null && now.getTime() >= start - JOIN_OPENS_BEFORE_MS && now.getTime() <= start + JOIN_CLOSES_AFTER_MS
  const visible = nextAt != null && now.getTime() <= start + JOIN_CLOSES_AFTER_MS
  return {
    nextAt: visible ? nextAt!.toISOString() : null,
    title: visible ? liveQa.title : '',
    notes: visible && isMember ? liveQa.notes : '',
    joinOpensAt: visible ? new Date(start - JOIN_OPENS_BEFORE_MS).toISOString() : null,
    joinUrl: isMember && inWindow && liveQa.zoomUrl ? liveQa.zoomUrl : null,
  }
}

export async function liveQaFor(isMember: boolean, now = new Date(), db: Queryable = poolDb) {
  return liveQaView(await getLiveQa(db), isMember, now)
}

function isHttps(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

/** An empty date clears the session; otherwise the date must be in the future and the link https. */
export function parseLiveQaUpdate(body: any, now = new Date()): Parsed<LiveQaSettings> {
  const rawDate = text(body?.nextAt)
  const zoomUrl = text(body?.zoomUrl)
  const title = text(body?.title)
  const notes = text(body?.notes)
  if (title.length > LIVE_QA_TITLE_MAX) return { ok: false, error: `Keep the title under ${LIVE_QA_TITLE_MAX} characters` }
  if (notes.length > LIVE_QA_NOTES_MAX) return { ok: false, error: `Keep the notes under ${LIVE_QA_NOTES_MAX} characters` }
  if (!rawDate) return { ok: true, value: { nextAt: null, zoomUrl: '', title, notes } }
  const nextAt = new Date(rawDate)
  if (Number.isNaN(nextAt.getTime())) return { ok: false, error: 'Pick a date and time for the session' }
  if (nextAt.getTime() <= now.getTime()) return { ok: false, error: 'The session must be in the future' }
  if (!zoomUrl || !isHttps(zoomUrl)) return { ok: false, error: 'Add the Zoom link, starting with https://' }
  return { ok: true, value: { nextAt, zoomUrl, title, notes } }
}

export function liveQaToSettings(value: LiveQaSettings) {
  return {
    next_at: value.nextAt ? value.nextAt.toISOString() : '',
    zoom_url: value.zoomUrl,
    title: value.title,
    notes: value.notes,
  }
}

export function formatSessionTime(at: Date): string {
  return at.toLocaleString('en-KE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi',
  })
}

export function reminderDue(nextAt: Date | null, now: Date): boolean {
  if (!nextAt) return false
  const diff = nextAt.getTime() - now.getTime()
  return diff >= REMINDER_UNTIL_MS && diff <= REMINDER_FROM_MS
}

/** Posts the day-before reminder for the next session once; the claim row stops repeats on later ticks. */
export async function sendLiveQaReminder(now = new Date()): Promise<boolean> {
  const liveQa = await getLiveQa()
  if (!liveQa.on || !reminderDue(liveQa.nextAt, now)) return false
  const claimed = await query(
    `INSERT INTO live_qa_reminders (session_at) VALUES ($1) ON CONFLICT DO NOTHING RETURNING session_at`,
    [liveQa.nextAt]
  )
  if (claimed.rows.length === 0) return false
  const name = liveQa.title || 'Monthly live Q&A with Coach Maurice'
  await publishAnnouncement(
    {
      title: `Tomorrow: ${name}`.slice(0, 150),
      body: `${name} is on ${formatSessionTime(liveQa.nextAt!)} (Nairobi time). The Zoom link appears in your account 1 hour before it starts.`,
      linkUrl: '/dashboard/membership',
      linkLabel: 'See the details',
      kind: 'news',
      audience: 'members',
      sendEmail: true,
    },
    null
  )
  return true
}
