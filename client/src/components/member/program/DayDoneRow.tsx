import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { ProgramDay } from '../../../api/programs'
import { PROGRAM_COPY, dayName, hasSessionPage } from '../../../content/programPages'
import { DoneBox } from './ProgramBits'

const copy = PROGRAM_COPY.week

interface DayDoneRowProps {
  day: ProgramDay
  sessionPath: string
  onToggle: (done: boolean) => void
}

export default function DayDoneRow({ day, sessionPath, onToggle }: DayDoneRowProps) {
  const minutes = day.steps?.durationMinutes
  const label = (
    <span className="min-w-0 flex-1">
      <span className="block text-xs uppercase tracking-wide text-fog light:text-fog-light">{dayName(day.day_number)}</span>
      <span
        className={`block font-barlow font-semibold ${
          day.done ? 'text-fog light:text-fog-light line-through' : 'text-chalk light:text-chalk-light'
        }`}
      >
        {day.title}
      </span>
      {minutes ? <span className="block text-xs text-fog light:text-fog-light">{PROGRAM_COPY.session.minutes(minutes)}</span> : null}
    </span>
  )

  return (
    <li className="flex items-center gap-3 py-2">
      <DoneBox checked={day.done} onChange={onToggle} label={copy.markDone(day.title)} />
      {hasSessionPage(day.kind) ? (
        <Link to={sessionPath} className="flex flex-1 min-w-0 items-center gap-2 no-underline group">
          {label}
          <span className="shrink-0 inline-flex items-center text-sm font-semibold text-cta light:text-chalk-light group-hover:underline">
            {copy.openSession}
            <ChevronRight size={16} aria-hidden="true" />
          </span>
        </Link>
      ) : (
        label
      )}
    </li>
  )
}
