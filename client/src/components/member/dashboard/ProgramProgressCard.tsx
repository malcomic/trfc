import { Link } from 'react-router-dom'
import { Circle } from 'lucide-react'
import type { ProgramId } from '../../../content/programs'
import { PROGRAMS, formatKsh, programPath, programWeek } from '../../../content/programs'
import { DASHBOARD_COPY } from '../../../content/dashboard'
import { loadQuizResult } from '../../../content/quiz'
import { nairobiToday } from '../../../utils/calendarGrid'
import CtaButton from '../../programs/CtaButton'
import { dashCard, dashHeading, dashLink, dashMuted } from './ui'

const copy = DASHBOARD_COPY.program

function EnrolledCard({ programId }: { programId: ProgramId }) {
  const program = PROGRAMS[programId]
  const week = programWeek(program, nairobiToday())
  return (
    <div className={dashCard}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className={dashHeading}>{copy.heading(program.name)}</h2>
        <span className="rounded-full bg-cta text-cta-ink px-3 py-1 font-barlow font-semibold text-sm">
          {formatKsh(program.price)}
        </span>
      </div>
      <div
        className="mt-5 h-2.5 rounded-full bg-smoke light:bg-smoke-light overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={week.percent}
        aria-label={copy.weekOf(week.week, week.total)}
      >
        <div className="h-full bg-cta rounded-full" style={{ width: `${week.percent}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-2">
        <span className="font-barlow font-semibold text-chalk light:text-chalk-light">{copy.weekOf(week.week, week.total)}</span>
        {!week.started && <span className={dashMuted}>{copy.starts(program.starts)}</span>}
      </div>

      <h3 className="mt-6 mb-3 font-barlow font-semibold text-chalk light:text-chalk-light">{copy.thisWeek}</h3>
      <ul className="space-y-2">
        {copy.sessions.map((session) => (
          <li key={session} className="flex items-center gap-3 text-fog light:text-fog-light">
            <Circle size={16} aria-hidden="true" className="shrink-0 text-mist light:text-mist-light" />
            {session}
          </li>
        ))}
      </ul>

      <CtaButton to="/dashboard/programs" size="sm" className="mt-6">
        {copy.guide}
      </CtaButton>
    </div>
  )
}

function NotEnrolledCard() {
  const quiz = loadQuizResult()
  const match = quiz ? PROGRAMS[quiz.program] : null
  return (
    <div className={dashCard}>
      <h2 className={dashHeading}>{copy.noneHeading}</h2>
      <p className={`${dashMuted} mt-2`}>{copy.noneBody}</p>
      {match && <p className="mt-3 font-barlow font-semibold text-chalk light:text-chalk-light">{copy.matchLine(match.name)}</p>}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <CtaButton to={programPath('foundations')} size="sm">
          {copy.startFree}
        </CtaButton>
        {match && match.id !== 'foundations' && (
          <Link to={programPath(match.id)} className={dashLink}>
            {copy.seeMatch(match.name)}
          </Link>
        )}
        <Link to="/programs" className={dashLink}>
          {copy.explore}
        </Link>
      </div>
    </div>
  )
}

export default function ProgramProgressCard({ programId }: { programId: ProgramId | null }) {
  return programId ? <EnrolledCard programId={programId} /> : <NotEnrolledCard />
}
