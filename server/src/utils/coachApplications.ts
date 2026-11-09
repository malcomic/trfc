import { config } from '../config/env.js'
import { toKenyanMsisdn } from './phone.js'
import { isHttpsUrl } from './videoLink.js'

export const COACH_VIDEO_FOLDER = 'trfc_coach_videos'
export const MAX_VIDEO_BYTES = 150 * 1024 * 1024

export const HOUR_OPTIONS = ['morning', 'afternoon', 'evening'] as const
export type HourOption = (typeof HOUR_OPTIONS)[number]

export const HIRING_STATUSES = ['new', 'reviewing', 'call_booked', 'accepted', 'not_now'] as const
export type HiringStatus = (typeof HIRING_STATUSES)[number]

export const STATUS_LABELS: Record<HiringStatus, string> = {
  new: 'New',
  reviewing: 'Reviewing',
  call_booked: 'Call booked',
  accepted: 'Accepted',
  not_now: 'Not now',
}

export const HOUR_LABELS: Record<HourOption, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
}

/** Forms sent faster than this after the page loaded are treated as bots. */
export const MIN_FILL_MS = 4000
export const NOTES_MAX = 5000

const LIMITS = {
  fullName: 120,
  email: 255,
  location: 120,
  socialUrl: 500,
  longText: 3000,
  videoUrl: 1000,
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SUBMISSION_KEY_PATTERN = /^[A-Za-z0-9-]{8,64}$/

export function isHiringStatus(value: unknown): value is HiringStatus {
  return typeof value === 'string' && (HIRING_STATUSES as readonly string[]).includes(value)
}

export function isHourOption(value: unknown): value is HourOption {
  return typeof value === 'string' && (HOUR_OPTIONS as readonly string[]).includes(value)
}

export interface CoachApplicationInput {
  fullName: string
  phone: string
  email: string
  location: string
  socialUrl: string
  experience: string
  canGive3Hours: boolean
  hours: HourOption[]
  workedHarder: string
  videoSource: 'upload' | 'link'
  videoUrl: string
  videoPublicId: string | null
  submissionKey: string
}

export type CleanResult =
  | { ok: true; value: CoachApplicationInput }
  | { ok: false; errors: Record<string, string> }

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

/** Upload links must point at our own Cloudinary account and the coach video folder. */
export function isOwnCoachVideo(url: string, publicId: string, cloudName = config.cloudinary.cloudName): boolean {
  if (!cloudName || !publicId.startsWith(`${COACH_VIDEO_FOLDER}/`)) return false
  try {
    const parsed = new URL(url)
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'res.cloudinary.com' &&
      parsed.pathname.startsWith(`/${cloudName}/video/upload/`) &&
      parsed.pathname.includes(`/${publicId}`)
    )
  } catch {
    return false
  }
}

export function cleanApplication(body: unknown, cloudName = config.cloudinary.cloudName): CleanResult {
  const input = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const errors: Record<string, string> = {}

  const required = (field: string, label: string, max: number) => {
    const value = text(input[field])
    if (!value) errors[field] = `Please add ${label}`
    else if (value.length > max) errors[field] = `Keep this under ${max} characters`
    return value
  }

  const fullName = required('fullName', 'your full name', LIMITS.fullName)
  const location = required('location', 'where you are based', LIMITS.location)
  const experience = required('experience', 'your coaching experience', LIMITS.longText)
  const workedHarder = required('workedHarder', 'your answer', LIMITS.longText)

  const email = text(input.email).toLowerCase()
  if (!email) errors.email = 'Please add your email address'
  else if (email.length > LIMITS.email || !EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address'

  const phone = toKenyanMsisdn(text(input.phone))
  if (!phone) errors.phone = 'Enter a valid WhatsApp number, e.g. 0712 345 678'

  const socialUrl = text(input.socialUrl)
  if (!socialUrl) errors.socialUrl = 'Please add a link to your Instagram, TikTok or Facebook'
  else if (socialUrl.length > LIMITS.socialUrl || !isHttpsUrl(socialUrl)) errors.socialUrl = 'Enter a full link starting with https://'

  const canGive3Hours = input.canGive3Hours
  if (typeof canGive3Hours !== 'boolean') errors.canGive3Hours = 'Please choose Yes or No'

  const rawHours = Array.isArray(input.hours) ? input.hours : []
  const hours = HOUR_OPTIONS.filter((h) => rawHours.includes(h))
  if (hours.length === 0 || rawHours.some((h) => !isHourOption(h))) errors.hours = 'Tick at least one time of day'

  const video = input.video && typeof input.video === 'object' ? (input.video as Record<string, unknown>) : {}
  const videoSource = video.source === 'upload' || video.source === 'link' ? video.source : null
  const videoUrl = text(video.url)
  const videoPublicId = text(video.publicId)
  if (!videoSource || !videoUrl) {
    errors.video = 'Please upload your 1 minute video or paste a link to it'
  } else if (videoUrl.length > LIMITS.videoUrl) {
    errors.video = 'That video link is too long'
  } else if (videoSource === 'upload' && !isOwnCoachVideo(videoUrl, videoPublicId, cloudName)) {
    errors.video = 'The video upload did not finish. Please upload it again.'
  } else if (videoSource === 'link' && !isHttpsUrl(videoUrl)) {
    errors.video = 'Enter a full video link starting with https://'
  }

  if (input.agreeStandards !== true) errors.agreeStandards = 'Please confirm you will follow the coach standards'
  if (input.agreeStorage !== true) errors.agreeStorage = 'Please agree so we can keep your details for hiring'

  const submissionKey = text(input.submissionKey)
  if (!SUBMISSION_KEY_PATTERN.test(submissionKey)) errors.form = 'Please refresh the page and try again'

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return {
    ok: true,
    value: {
      fullName,
      phone: phone!,
      email,
      location,
      socialUrl,
      experience,
      canGive3Hours: canGive3Hours as boolean,
      hours,
      workedHarder,
      videoSource: videoSource!,
      videoUrl,
      videoPublicId: videoSource === 'upload' ? videoPublicId : null,
      submissionKey,
    },
  }
}

/** A filled honeypot or a form sent within seconds of the page loading. */
export function isLikelySpam(body: unknown, now = Date.now()): boolean {
  const input = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  if (text(input.website)) return true
  const startedAt = Number(input.startedAt)
  if (!Number.isFinite(startedAt)) return true
  return now - startedAt < MIN_FILL_MS
}

export interface HiringFilters {
  status?: HiringStatus
  q?: string
  hours?: HourOption
  threeHours?: boolean
  from?: string
  to?: string
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function parseHiringFilters(input: unknown): HiringFilters {
  const filters: HiringFilters = {}
  if (!input || typeof input !== 'object') return filters
  const body = input as Record<string, unknown>
  if (isHiringStatus(body.status)) filters.status = body.status
  if (isHourOption(body.hours)) filters.hours = body.hours
  if (body.threeHours === 'yes') filters.threeHours = true
  if (body.threeHours === 'no') filters.threeHours = false
  if (typeof body.from === 'string' && DATE_PATTERN.test(body.from)) filters.from = body.from
  if (typeof body.to === 'string' && DATE_PATTERN.test(body.to)) filters.to = body.to
  const q = text(body.q).slice(0, 100)
  if (q) filters.q = q
  return filters
}

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`)
const LOCAL_DATE = "(a.created_at AT TIME ZONE 'Africa/Nairobi')::date"

/** Every value is a bound parameter. `ignoreStatus` is used for the per-status counts. */
export function buildHiringWhere(filters: HiringFilters, options: { ignoreStatus?: boolean } = {}) {
  const params: unknown[] = []
  const bind = (value: unknown) => {
    params.push(value)
    return `$${params.length}`
  }
  const conditions: string[] = []

  if (filters.status && !options.ignoreStatus) conditions.push(`a.status = ${bind(filters.status)}`)
  if (filters.hours) conditions.push(`${bind(filters.hours)} = ANY(a.hours)`)
  if (filters.threeHours !== undefined) conditions.push(`a.can_give_3_hours = ${bind(filters.threeHours)}`)
  if (filters.from) conditions.push(`${LOCAL_DATE} >= ${bind(filters.from)}::date`)
  if (filters.to) conditions.push(`${LOCAL_DATE} <= ${bind(filters.to)}::date`)
  if (filters.q) {
    const like = bind(`%${escapeLike(filters.q)}%`)
    const parts = ['full_name', 'email', 'location', 'phone'].map((col) => `a.${col} ILIKE ${like}`)
    const digits = filters.q.replace(/\D/g, '').replace(/^0+/, '')
    if (digits.length >= 3) parts.push(`a.phone LIKE ${bind(`%${digits}%`)}`)
    conditions.push(`(${parts.join(' OR ')})`)
  }

  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params }
}

export const HIRING_CSV_COLUMNS = [
  { key: 'created_at', label: 'Applied on' },
  { key: 'full_name', label: 'Full name' },
  { key: 'phone', label: 'Phone (WhatsApp)' },
  { key: 'email', label: 'Email' },
  { key: 'location', label: 'Based in' },
  { key: 'social_url', label: 'Social link' },
  { key: 'experience', label: 'Coaching experience' },
  { key: 'three_hours', label: 'Can give 3 hours a day' },
  { key: 'hours_label', label: 'Hours they can give' },
  { key: 'worked_harder', label: 'Worked harder than anyone' },
  { key: 'video_url', label: 'Video' },
  { key: 'status_label', label: 'Status' },
  { key: 'handled_by_name', label: 'Handled by' },
  { key: 'notes', label: 'Notes' },
]

export function toHiringCsvRow(row: Record<string, any>): Record<string, unknown> {
  const hours: string[] = Array.isArray(row.hours) ? row.hours : []
  return {
    ...row,
    three_hours: row.can_give_3_hours ? 'Yes' : 'No',
    hours_label: hours.map((h) => HOUR_LABELS[h as HourOption] ?? h).join(', '),
    status_label: STATUS_LABELS[row.status as HiringStatus] ?? row.status,
  }
}
