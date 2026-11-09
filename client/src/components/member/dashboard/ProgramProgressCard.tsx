import { Link } from 'react-router-dom'
import type { MemberDashboard } from '../../../api/users'
import { FREE_PROGRAM_SLUG, dashboardProgramPath, formatKsh, programPath } from '../../../content/programs'
import { usePrograms } from '../../../context/ProgramsContext'
import { DASHBOARD_COPY } from '../../../content/dashboard'
import { PROGRAM_COPY, dayName, programPercent } from '../../../content/programPages'
import { loadQuizResult } from '../../../content/quiz'
import { useMemberDashboard } from '../../../context/MemberDashboardContext'
import { useProgramWeek } from '../../../hooks/useProgramWeek'
import CtaButton from '../../programs/CtaButton'
import { DoneBox, ProgressBar } from '../program/ProgramBits'
import { dashCard, dashHeading, dashLink, dashMuted } from './ui'

const copy = DASHBOARD_COPY.program

type EnrolledProgram = NonNullable<MemberDashboard['program']>

function EnrolledCard({ enrolled }: { enrolled: EnrolledProgram }) {
  const { byId } = usePrograms()
  const listed = byId(enrolled.id)
  const slug = enrolled.slug
  const currentWeek = enrolled.currentWeek ?? 1
  const total = enrolled.totalWeeks || listed?.lengthWeeks || 1
  const graduated = enrolled.graduated ?? false
  const percent = graduated ? 100 : programPercent(currentWeek - 1, total)
  const { data: week, loading, setDayDone } = useProgramWeek(enrolled.id, currentWeek)

  return (
    <div className={dashCard}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className={dashHeading}>{copy.heading(enrolled.name)}</h2>
        {listed && (
          <span className="rounded-full bg-cta text-cta-ink px-3 py-1 font-barlow font-semibold text-sm">
            {formatKsh(listed.price)}
          </span>
        )}
      </div>
      <div className="mt-5">
        <ProgressBar percent={percent} label={copy.weekOf(currentWeek, total)} />
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-2">
        <span className="font-barlow font-semibold text-chalk light:text-chalk-light">
          {graduated ? PROGRAM_COPY.home.graduatedLine : copy.weekOf(currentWeek, total)}
        </span>
        {week && <span className={dashMuted}>{week.week.title}</span>}
      </div>

      <h3 className="mt-6 mb-3 font-barlow font-semibold text-chalk light:text-chalk-light">{copy.thisWeek}</h3>
      {loading ? (
        <p className={dashMuted}>…</p>
      ) : week ? (
        <ul className="space-y-1">
          {week.days.map((day) => (
            <li key={day.day_number} className="flex items-center gap-3">
              <DoneBox
                checked={day.done}
                onChange={(done) => setDayDone(day.day_number, done)}
                label={PROGRAM_COPY.week.markDone(day.title)}
              />
              <Link
                to={dashboardProgramPath(slug, currentWeek, day.kind === 'rest' ? '' : `/day/${day.day_number}`)}
                className={`min-w-0 no-underline ${day.done ? 'text-fog light:text-fog-light line-through' : 'text-chalk light:text-chalk-light'}`}
              >
                <span className="font-semibold">{dayName(day.day_number)}:</span> {day.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className={dashMuted}>{PROGRAM_COPY.loadFailed}</p>
      )}

      <CtaButton to={dashboardProgramPath(slug)} size="sm" className="mt-6">
        {copy.guide}
      </CtaButton>
    </div>
  )
}

function NotEnrolledCard() {
  const { byId } = usePrograms()
  const quiz = loadQuizResult()
  const match = quiz ? byId(quiz.program) : undefined
  return (
    <div className={dashCard}>
      <h2 className={dashHeading}>{copy.noneHeading}</h2>
      <p className={`${dashMuted} mt-2`}>{copy.noneBody}</p>
      {match && <p className="mt-3 font-barlow font-semibold text-chalk light:text-chalk-light">{copy.matchLine(match.name)}</p>}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <CtaButton to={programPath(FREE_PROGRAM_SLUG)} size="sm">
          {copy.startFree}
        </CtaButton>
        {match && match.id !== 'foundations' && (
          <Link to={programPath(match.slug)} className={dashLink}>
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

export default function ProgramProgressCard() {
  const { data } = useMemberDashboard()
  return data?.program ? <EnrolledCard enrolled={data.program} /> : <NotEnrolledCard />
}
