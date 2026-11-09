import { Navigate, useParams } from 'react-router-dom'
import { Lock, Mic } from 'lucide-react'
import { dashboardProgramPath, programPath } from '../../../content/programs'
import { useMemberProgram } from '../../../hooks/useMemberProgram'
import { PROGRAM_COPY } from '../../../content/programPages'
import { useProgramWeek } from '../../../hooks/useProgramWeek'
import MemberPageHeader from '../../../components/member/MemberPageHeader'
import CtaButton from '../../../components/programs/CtaButton'
import DayDoneRow from '../../../components/member/program/DayDoneRow'
import { BackLink, LoadError, NotEnrolledCard, PageSpinner } from '../../../components/member/program/ProgramBits'
import { dashCard, dashHeading, dashMuted } from '../../../components/member/dashboard/ui'
import { parseRouteNumber } from './routeParams'

const copy = PROGRAM_COPY.week

export default function ProgramWeek() {
  const params = useParams()
  const program = useMemberProgram(params.slug)
  const weekNumber = parseRouteNumber(params.week)
  const { data, loading, error, reload, setDayDone } = useProgramWeek(program?.slug ?? null, weekNumber)

  if (!program || !weekNumber) return <Navigate to="/dashboard/programs" replace />
  const home = dashboardProgramPath(program.slug)

  const body = () => {
    if (loading) return <PageSpinner />
    if (error?.notEnrolled) return <NotEnrolledCard programPagePath={programPath(program.slug)} />
    if (error?.locked) {
      return (
        <div className={`${dashCard} max-w-xl flex items-start gap-3`}>
          <Lock size={20} aria-hidden="true" className="shrink-0 mt-0.5 text-fog light:text-fog-light" />
          <p className="text-chalk light:text-chalk-light">{copy.locked}</p>
        </div>
      )
    }
    if (error || !data) return <LoadError message={error?.message ?? PROGRAM_COPY.loadFailed} onRetry={reload} />

    const { week, days } = data
    const unticked = days.filter((d) => d.kind !== 'rest' && !d.done).length
    const hasNext = weekNumber < data.totalWeeks

    return (
      <div className="space-y-6">
        <section className={dashCard}>
          {week.voice_note_url && (
            <div className="mb-5">
              <p className={`${dashMuted} flex items-center gap-2 mb-2`}>
                <Mic size={14} aria-hidden="true" /> {copy.playVoiceNote}
              </p>
              <audio controls preload="none" src={week.voice_note_url} className="w-full" />
            </div>
          )}
          <h2 className={dashHeading}>{copy.why}</h2>
          <p className="mt-3 text-fog light:text-fog-light">{week.purpose}</p>
          {week.coach_note && (
            <blockquote className="mt-5 border-l-4 border-cta pl-4">
              <p className="text-chalk light:text-chalk-light">{week.coach_note}</p>
              <footer className={`${dashMuted} mt-1`}>{copy.coachNote}</footer>
            </blockquote>
          )}
        </section>

        <section className={dashCard}>
          <h2 className={dashHeading}>{copy.yourDays}</h2>
          <ul className="mt-3 divide-y divide-mist/40 light:divide-mist-light/40">
            {days.map((day) => (
              <DayDoneRow
                key={day.day_number}
                day={day}
                sessionPath={dashboardProgramPath(program.slug, weekNumber, `/day/${day.day_number}`)}
                onToggle={(done) => setDayDone(day.day_number, done)}
              />
            ))}
          </ul>
        </section>

        {week.tip && (
          <section className={dashCard}>
            <h2 className={dashHeading}>{copy.tip}</h2>
            <p className="mt-3 text-fog light:text-fog-light">{week.tip}</p>
          </section>
        )}

        <section className={dashCard}>
          <h2 className={dashHeading}>{copy.finish(weekNumber)}</h2>
          {data.checkedIn ? (
            <>
              <p className="mt-3 text-chalk light:text-chalk-light">{copy.checkedIn}</p>
              {hasNext && (
                <CtaButton to={dashboardProgramPath(program.slug, weekNumber + 1)} size="sm" className="mt-5">
                  {copy.nextWeek(weekNumber + 1)}
                </CtaButton>
              )}
            </>
          ) : (
            <>
              <p className={`${dashMuted} mt-2`}>{copy.finishBody}</p>
              {unticked > 0 && <p className="mt-2 text-sm text-fog light:text-fog-light">{copy.unticked(unticked)}</p>}
              <CtaButton
                to={dashboardProgramPath(program.slug, weekNumber, '/check-in')}
                size="sm"
                className="mt-5"
                disabled={!data.isCurrentWeek}
              >
                {copy.checkin}
              </CtaButton>
            </>
          )}
        </section>
      </div>
    )
  }

  return (
    <>
      <BackLink to={home}>{PROGRAM_COPY.back.program}</BackLink>
      <MemberPageHeader
        title={copy.title(weekNumber)}
        highlight={data?.week.title.toUpperCase()}
        subtitle={data?.week.summary}
      />
      {body()}
    </>
  )
}
