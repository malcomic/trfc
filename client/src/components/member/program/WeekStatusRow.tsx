import { Link } from 'react-router-dom'
import { CheckCircle2, ChevronRight, Lock } from 'lucide-react'
import type { PlanWeekSummary } from '../../../api/programs'
import { PROGRAM_COPY, weekStatus } from '../../../content/programPages'

const copy = PROGRAM_COPY.home

interface WeekStatusRowProps {
  week: PlanWeekSummary
  to: string
}

export default function WeekStatusRow({ week, to }: WeekStatusRowProps) {
  const status = weekStatus(week)
  const content = (
    <>
      <span
        className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bebas text-xl ${
          status === 'locked'
            ? 'bg-smoke light:bg-smoke-light text-fog light:text-fog-light'
            : 'bg-cta text-cta-ink'
        }`}
        aria-hidden="true"
      >
        {status === 'done' ? <CheckCircle2 size={20} /> : week.week_number}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-barlow font-semibold text-chalk light:text-chalk-light">
          {copy.weekLabel(week.week_number)}: {week.title}
        </span>
        <span className="block text-sm text-fog light:text-fog-light">{week.summary}</span>
      </span>
      <span
        className={`shrink-0 inline-flex items-center gap-1 text-xs font-semibold tracking-wide ${
          status === 'locked' ? 'text-fog light:text-fog-light' : 'text-cta light:text-chalk-light'
        }`}
      >
        {status === 'locked' && <Lock size={12} aria-hidden="true" />}
        {copy.status[status]}
        {status !== 'locked' && <ChevronRight size={16} aria-hidden="true" />}
      </span>
    </>
  )

  const rowClass = 'flex items-center gap-4 py-3 px-2 -mx-2 rounded-lg'
  if (status === 'locked') {
    return (
      <li className={`${rowClass} opacity-70`} aria-disabled="true">
        {content}
      </li>
    )
  }
  return (
    <li>
      <Link to={to} className={`${rowClass} no-underline hover:bg-smoke/60 light:hover:bg-smoke-light/60 transition-colors`}>
        {content}
      </Link>
    </li>
  )
}
