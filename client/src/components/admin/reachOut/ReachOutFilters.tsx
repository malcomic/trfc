import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { ReachOutFilters as Filters } from '../../../api/admin/reachOut'
import type { Zone } from '../../../api/zones'
import {
  CHOICE_QUESTIONS,
  OUTREACH_STATUSES,
  QUESTION_SHORT_TITLES,
  ZONE_EXTRAS,
  type OutreachStatus,
} from '../../../content/signupQuestions'
import { INACTIVE_DAY_OPTIONS, UNANSWERED, hasFilters } from './filterParams'

const SEARCH_DELAY_MS = 300

export const adminSelectClass =
  'w-full px-3 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm'

export default function ReachOutFilters({
  filters,
  zones,
  onChange,
}: {
  filters: Filters
  zones: Zone[]
  onChange: (next: Filters) => void
}) {
  const [search, setSearch] = useState(filters.search ?? '')

  useEffect(() => setSearch(filters.search ?? ''), [filters.search])

  useEffect(() => {
    const trimmed = search.trim()
    if (trimmed === (filters.search ?? '')) return
    const timer = setTimeout(() => onChange({ ...filters, search: trimmed || undefined }), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
    // Only the typed text should restart the timer.
  }, [search])

  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })

  return (
    <section className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <label className="relative flex-1">
          <span className="sr-only">Search by name or phone</span>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone"
            className={`${adminSelectClass} pl-9`}
          />
        </label>
        {hasFilters(filters) && (
          <button
            type="button"
            onClick={() => onChange({})}
            className="inline-flex items-center justify-center gap-1.5 px-4 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={14} /> Clear filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <select aria-label="Zone" value={filters.zone ?? ''} onChange={(e) => set({ zone: e.target.value || undefined })} className={adminSelectClass}>
          <option value="">All zones</option>
          {zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              Team {zone.name}
            </option>
          ))}
          {ZONE_EXTRAS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
          <option value={UNANSWERED}>No zone</option>
        </select>

        {CHOICE_QUESTIONS.map((question) => (
          <select
            key={question.field}
            aria-label={QUESTION_SHORT_TITLES[question.field]}
            value={filters[question.field] ?? ''}
            onChange={(e) => set({ [question.field]: e.target.value || undefined })}
            className={adminSelectClass}
          >
            <option value="">{QUESTION_SHORT_TITLES[question.field]}: any</option>
            {question.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
            <option value={UNANSWERED}>No answer</option>
          </select>
        ))}

        <select
          aria-label="Status"
          value={filters.status ?? ''}
          onChange={(e) => set({ status: (e.target.value || undefined) as OutreachStatus | undefined })}
          className={adminSelectClass}
        >
          <option value="">Any status</option>
          {OUTREACH_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Last active"
          value={filters.inactive_days ?? ''}
          onChange={(e) => set({ inactive_days: Number(e.target.value) || undefined })}
          className={adminSelectClass}
        >
          <option value="">Any activity</option>
          {INACTIVE_DAY_OPTIONS.map((days) => (
            <option key={days} value={days}>
              Not active in {days} days
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-700 dark:text-gray-200">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4" checked={!!filters.has_other} onChange={(e) => set({ has_other: e.target.checked || undefined })} />
          Typed an "Other" answer
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4" checked={!!filters.unanswered} onChange={(e) => set({ unanswered: e.target.checked || undefined })} />
          Answered nothing
        </label>
      </div>
    </section>
  )
}
