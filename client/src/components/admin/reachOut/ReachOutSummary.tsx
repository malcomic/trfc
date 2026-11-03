import { Activity, ClipboardCheck, Users } from 'lucide-react'
import type { AnswerCount, ReachOutStats } from '../../../api/admin/reachOut'
import type { Zone } from '../../../api/zones'
import { CHOICE_QUESTIONS, QUESTION_SHORT_TITLES, ZONE_EXTRAS, type AnswerField } from '../../../content/signupQuestions'
import { UNANSWERED } from './filterParams'

const NO_ANSWER = 'No answer'

function optionLabel(field: AnswerField, row: AnswerCount, zones: Zone[]): string {
  if (row.value === null) return NO_ANSWER
  if (field === 'zone') {
    const name = row.label ?? zones.find((z) => z.id === row.value)?.name
    if (name) return `Team ${name}`
    return ZONE_EXTRAS.find((o) => o.value === row.value)?.label ?? row.value
  }
  const question = CHOICE_QUESTIONS.find((q) => q.field === field)
  return question?.options.find((o) => o.value === row.value)?.label ?? row.value
}

function TotalCard({ icon: Icon, label, value, hint }: { icon: typeof Users; label: string; value: number; hint?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex items-center gap-4">
      <Icon className="w-8 h-8 text-primary dark:text-primary-dark flex-none" />
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</p>
        {hint && <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
      </div>
    </div>
  )
}

export default function ReachOutSummary({
  stats,
  zones,
  onPick,
}: {
  stats: ReachOutStats | null
  zones: Zone[]
  onPick: (field: AnswerField, value: string) => void
}) {
  if (!stats) {
    return <div className="h-24 mb-6 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
  }

  const pct = (n: number) => (stats.total > 0 ? Math.round((n / stats.total) * 100) : 0)
  const fields: AnswerField[] = [...CHOICE_QUESTIONS.map((q) => q.field), 'zone']

  return (
    <section className="mb-8 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <TotalCard icon={Users} label="Total members" value={stats.total} />
        <TotalCard icon={ClipboardCheck} label="Answered at least one question" value={stats.answered} hint={`${pct(stats.answered)}% of members`} />
        <TotalCard icon={Activity} label="Active in the last 14 days" value={stats.active_14d} hint={`${pct(stats.active_14d)}% of members`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {fields.map((field) => {
          const rows = stats.questions[field] ?? []
          const max = Math.max(1, ...rows.map((r) => r.count))
          return (
            <div key={field} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{QUESTION_SHORT_TITLES[field]}</h3>
              {rows.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No members yet.</p>
              ) : (
                <ul className="space-y-1.5 list-none m-0 p-0">
                  {rows.map((row) => {
                    const label = optionLabel(field, row, zones)
                    return (
                      <li key={row.value ?? 'none'}>
                        <button
                          type="button"
                          onClick={() => onPick(field, row.value ?? UNANSWERED)}
                          title={`Show members: ${label}`}
                          className="w-full text-left group"
                        >
                          <div className="flex justify-between gap-2 text-xs text-gray-700 dark:text-gray-300">
                            <span className={`group-hover:underline ${row.value === null ? 'italic text-gray-500 dark:text-gray-400' : ''}`}>{label}</span>
                            <span className="font-semibold tabular-nums">{row.count}</span>
                          </div>
                          <div className="h-2 mt-0.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${row.value === null ? 'bg-gray-300 dark:bg-gray-600' : 'bg-amber-500'}`}
                              style={{ width: `${(row.count / max) * 100}%` }}
                            />
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
