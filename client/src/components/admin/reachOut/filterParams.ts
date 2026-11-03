import type { ReachOutFilters } from '../../../api/admin/reachOut'
import type { OutreachStatus } from '../../../content/signupQuestions'

export const CHOICE_FILTER_KEYS = ['hardest_now', 'goal_3m', 'time_with_trfc', 'want_more', 'exercise_frequency'] as const
const STRING_KEYS = [...CHOICE_FILTER_KEYS, 'zone', 'status', 'search'] as const

export const INACTIVE_DAY_OPTIONS = [7, 14, 30, 60]

/** Filter value meaning "did not answer this question". */
export const UNANSWERED = 'none'

export function filtersFromParams(params: URLSearchParams): ReachOutFilters {
  const filters: ReachOutFilters = {}
  for (const key of STRING_KEYS) {
    const value = params.get(key)?.trim()
    if (!value) continue
    if (key === 'status') filters.status = value as OutreachStatus
    else filters[key] = value
  }
  const days = Number(params.get('inactive_days'))
  if (INACTIVE_DAY_OPTIONS.includes(days)) filters.inactive_days = days
  if (params.get('has_other') === 'true') filters.has_other = true
  if (params.get('unanswered') === 'true') filters.unanswered = true
  return filters
}

export function filtersToParams(filters: ReachOutFilters): URLSearchParams {
  const params = new URLSearchParams()
  for (const key of STRING_KEYS) {
    const value = filters[key]
    if (value) params.set(key, value)
  }
  if (filters.inactive_days) params.set('inactive_days', String(filters.inactive_days))
  if (filters.has_other) params.set('has_other', 'true')
  if (filters.unanswered) params.set('unanswered', 'true')
  return params
}

export function hasFilters(filters: ReachOutFilters): boolean {
  return filtersToParams(filters).toString() !== ''
}
