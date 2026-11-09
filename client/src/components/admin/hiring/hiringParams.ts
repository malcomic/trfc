import { HIRING_STATUSES, type HiringFilters, type HiringStatus } from '../../../api/admin/hiring'

const HOURS = ['morning', 'afternoon', 'evening'] as const
const DATE = /^\d{4}-\d{2}-\d{2}$/

/** Reads Hiring filters from the address bar, dropping anything invalid. */
export function hiringFiltersFromParams(params: URLSearchParams): HiringFilters {
  const filters: HiringFilters = {}
  const status = params.get('status')
  if (status && (HIRING_STATUSES as readonly string[]).includes(status)) filters.status = status as HiringStatus
  const q = params.get('q')?.trim()
  if (q) filters.q = q
  const hours = params.get('hours')
  if (hours && (HOURS as readonly string[]).includes(hours)) filters.hours = hours as HiringFilters['hours']
  const threeHours = params.get('threeHours')
  if (threeHours === 'yes' || threeHours === 'no') filters.threeHours = threeHours
  const from = params.get('from')
  if (from && DATE.test(from)) filters.from = from
  const to = params.get('to')
  if (to && DATE.test(to)) filters.to = to
  return filters
}

export function hiringFiltersToParams(filters: HiringFilters): URLSearchParams {
  const params = new URLSearchParams()
  for (const key of ['status', 'q', 'hours', 'threeHours', 'from', 'to'] as const) {
    const value = filters[key]
    if (value) params.set(key, value)
  }
  return params
}
