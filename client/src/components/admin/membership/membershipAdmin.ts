import type { MemberStatusFilter } from '../../../api/admin/membership'

const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000

/** ISO instant to a `datetime-local` value in Nairobi time. */
export function toNairobiInput(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Date(d.getTime() + NAIROBI_OFFSET_MS).toISOString().slice(0, 16)
}

/** A `datetime-local` value read as Nairobi time, back to an ISO instant. */
export function fromNairobiInput(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null
  const d = new Date(`${value}:00+03:00`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export const MEMBER_STATUS_LABELS: Record<MemberStatusFilter, string> = {
  active: 'Active',
  expiring: 'Ends within 30 days',
  grace: 'Renewal window',
  lapsed: 'Lapsed',
}

export const PRICE_TYPE_LABELS: Record<string, string> = {
  founding: 'Founding',
  standard: 'Standard',
  renewal: 'Renewal',
  gift: 'Gift',
}

export const PERK_STATUS_LABELS = { on: 'On', coming_soon: 'Coming soon', hidden: 'Hidden' } as const

export type SettingRow = { key: string; value: string }

/** Settings JSON as editable rows; numbers and yes/no stay typed when saved. */
export function settingsToRows(settings: Record<string, string | number | boolean | null>): SettingRow[] {
  return Object.entries(settings).map(([key, value]) => ({ key, value: value === null ? '' : String(value) }))
}

export function rowsToSettings(rows: SettingRow[]): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {}
  for (const { key, value } of rows) {
    const k = key.trim()
    if (!k) continue
    const v = value.trim()
    if (v === '') out[k] = null
    else if (v === 'true' || v === 'false') out[k] = v === 'true'
    else if (/^-?\d+(\.\d+)?$/.test(v)) out[k] = Number(v)
    else out[k] = v
  }
  return out
}

/** Moves one item up or down, for the perk order buttons. */
export function moveItem<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta
  if (target < 0 || target >= list.length) return list
  const next = [...list]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}
