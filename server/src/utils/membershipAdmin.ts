export const MEMBER_STATUS_FILTERS = ['active', 'expiring', 'grace', 'lapsed'] as const
export type MemberStatusFilter = (typeof MEMBER_STATUS_FILTERS)[number]
export const MEMBER_TYPE_FILTERS = ['founding', 'standard', 'renewal', 'gift'] as const
export const PERK_STATUSES = ['on', 'coming_soon', 'hidden'] as const
export const GRANT_MAX_MONTHS = 24
export const NOTE_MAX = 500

type Result<T> = { ok: true; value: T } | { ok: false; error: string }

export interface MembershipSettingsInput {
  standardPrice: number
  foundingPrice: number
  foundingLimit: number
  foundingDeadline: Date
  renewalPrice: number
  renewalGraceDays: number
  salesOpenAt: Date
  salesPaused: boolean
}

const isPositive = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v > 0
const isWholeInRange = (v: unknown, min: number, max: number) =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max
const toDate = (v: unknown) => {
  if (typeof v !== 'string' || !v.trim()) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

export function parseMembershipSettings(body: any): Result<MembershipSettingsInput> {
  const b = body ?? {}
  for (const [key, label] of [
    ['standardPrice', 'Standard price'],
    ['foundingPrice', 'Founding price'],
    ['renewalPrice', 'Renewal price'],
  ] as const) {
    if (!isPositive(b[key])) return { ok: false, error: `${label} must be more than 0` }
  }
  if (!isWholeInRange(b.foundingLimit, 0, 100_000)) return { ok: false, error: 'Founding places must be a whole number' }
  if (!isWholeInRange(b.renewalGraceDays, 0, 365)) return { ok: false, error: 'Renewal days must be between 0 and 365' }
  const foundingDeadline = toDate(b.foundingDeadline)
  if (!foundingDeadline) return { ok: false, error: 'Choose a valid founding deadline' }
  const salesOpenAt = toDate(b.salesOpenAt)
  if (!salesOpenAt) return { ok: false, error: 'Choose a valid opening date' }
  if (typeof b.salesPaused !== 'boolean') return { ok: false, error: 'Pause must be on or off' }
  return {
    ok: true,
    value: {
      standardPrice: b.standardPrice,
      foundingPrice: b.foundingPrice,
      foundingLimit: b.foundingLimit,
      foundingDeadline,
      renewalPrice: b.renewalPrice,
      renewalGraceDays: b.renewalGraceDays,
      salesOpenAt,
      salesPaused: b.salesPaused,
    },
  }
}

export interface PerkUpdate {
  title?: string
  description?: string
  status?: (typeof PERK_STATUSES)[number]
  icon?: string | null
  linkUrl?: string | null
  buttonLabel?: string | null
  sortOrder?: number
  settings?: Record<string, string | number | boolean | null>
}

const optionalText = (v: unknown, max: number): Result<string | null> => {
  if (v === null) return { ok: true, value: null }
  if (typeof v !== 'string') return { ok: false, error: 'must be text' }
  const t = v.trim()
  if (t.length > max) return { ok: false, error: `can be up to ${max} characters` }
  return { ok: true, value: t || null }
}

export function isSafeLink(value: string): boolean {
  if (value.startsWith('/') && !value.startsWith('//')) return true
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export function parsePerkUpdate(body: any): Result<PerkUpdate> {
  const b = body ?? {}
  const out: PerkUpdate = {}
  if (b.title !== undefined) {
    if (typeof b.title !== 'string' || !b.title.trim()) return { ok: false, error: 'Title is required' }
    if (b.title.trim().length > 160) return { ok: false, error: 'Title can be up to 160 characters' }
    out.title = b.title.trim()
  }
  if (b.description !== undefined) {
    if (typeof b.description !== 'string') return { ok: false, error: 'Description must be text' }
    if (b.description.trim().length > 1000) return { ok: false, error: 'Description can be up to 1000 characters' }
    out.description = b.description.trim()
  }
  if (b.status !== undefined) {
    if (!PERK_STATUSES.includes(b.status)) return { ok: false, error: 'Choose On, Coming soon or Hidden' }
    out.status = b.status
  }
  if (b.icon !== undefined) {
    const r = optionalText(b.icon, 40)
    if (!r.ok) return { ok: false, error: `Icon ${r.error}` }
    out.icon = r.value
  }
  if (b.linkUrl !== undefined) {
    const r = optionalText(b.linkUrl, 500)
    if (!r.ok) return { ok: false, error: `Link ${r.error}` }
    if (r.value && !isSafeLink(r.value)) return { ok: false, error: 'Link must start with https:// or /' }
    out.linkUrl = r.value
  }
  if (b.buttonLabel !== undefined) {
    const r = optionalText(b.buttonLabel, 60)
    if (!r.ok) return { ok: false, error: `Button label ${r.error}` }
    out.buttonLabel = r.value
  }
  if (b.sortOrder !== undefined) {
    if (!isWholeInRange(b.sortOrder, 0, 100_000)) return { ok: false, error: 'Order must be a whole number' }
    out.sortOrder = b.sortOrder
  }
  if (b.settings !== undefined) {
    if (!b.settings || typeof b.settings !== 'object' || Array.isArray(b.settings)) {
      return { ok: false, error: 'Settings must be a list of names and values' }
    }
    const entries = Object.entries(b.settings as Record<string, unknown>)
    if (entries.length > 30) return { ok: false, error: 'Settings can have up to 30 values' }
    const settings: Record<string, string | number | boolean | null> = {}
    for (const [key, value] of entries) {
      if (!/^[a-z][a-z0-9_]{0,39}$/i.test(key)) return { ok: false, error: `"${key}" is not a valid setting name` }
      if (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) {
        return { ok: false, error: `"${key}" must be text, a number, yes/no or empty` }
      }
      if (typeof value === 'string' && value.length > 1000) return { ok: false, error: `"${key}" is too long` }
      settings[key] = value as string | number | boolean | null
    }
    out.settings = settings
  }
  return { ok: true, value: out }
}

export function parseGrant(body: any): Result<{ userId: string; months: number; note: string }> {
  const b = body ?? {}
  if (typeof b.userId !== 'string') return { ok: false, error: 'Choose a member' }
  if (!isWholeInRange(b.months, 1, GRANT_MAX_MONTHS)) {
    return { ok: false, error: `Months must be between 1 and ${GRANT_MAX_MONTHS}` }
  }
  const note = typeof b.note === 'string' ? b.note.trim() : ''
  if (!note) return { ok: false, error: 'Add a note saying why' }
  if (note.length > NOTE_MAX) return { ok: false, error: `Note can be up to ${NOTE_MAX} characters` }
  return { ok: true, value: { userId: b.userId, months: b.months, note } }
}

/** SQL for the member status filters, against users u with grace days as a parameter placeholder. */
export function memberStatusSql(status: MemberStatusFilter, graceParam: string): string {
  switch (status) {
    case 'active':
      return `u.member_until > NOW()`
    case 'expiring':
      return `u.member_until > NOW() AND u.member_until <= NOW() + INTERVAL '30 days'`
    case 'grace':
      return `u.member_until <= NOW() AND u.member_until > NOW() - make_interval(days => ${graceParam})`
    case 'lapsed':
      return `u.member_until <= NOW() - make_interval(days => ${graceParam})`
  }
}

export const MEMBER_CSV_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'status', label: 'Status' },
  { key: 'price_type', label: 'Latest year type' },
  { key: 'amount', label: 'Amount (KSh)' },
  { key: 'starts_at', label: 'Year starts' },
  { key: 'member_until', label: 'Member until' },
  { key: 'is_founding', label: 'Founding member' },
  { key: 'over_limit', label: 'Founding over limit' },
  { key: 'mpesa_receipt', label: 'M-Pesa receipt' },
  { key: 'years', label: 'Years' },
]
