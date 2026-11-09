import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { useMemberDashboard } from '../../../context/MemberDashboardContext'
import { dashboardProgramPath, programPath } from '../../../content/programs'
import { useMemberProgram } from '../../../hooks/useMemberProgram'
import { PROGRAM_COPY, dayName } from '../../../content/programPages'
import { useProgramWeek } from '../../../hooks/useProgramWeek'
import MemberPageHeader from '../../../components/member/MemberPageHeader'
import CtaButton from '../../../components/programs/CtaButton'
import RoundChecklist from '../../../components/member/program/RoundChecklist'
import SessionTimer from '../../../components/member/program/SessionTimer'
import { BackLink, BulletList, LoadError, NotEnrolledCard, PageSpinner } from '../../../components/member/program/ProgramBits'
import { dashCard, dashHeading, dashLink, dashMuted } from '../../../components/member/dashboard/ui'
import { parseRouteNumber } from './routeParams'

const copy = PROGRAM_COPY.session

export default function ProgramSession() {
  const params = useParams()
  const navigate = useNavigate()
  const { notify } = useMemberDashboard()
  const program = useMemberProgram(params.slug)
  const weekNumber = parseRouteNumber(params.week)
  const dayNumber = parseRouteNumber(params.day)
  const { data, loading, error, reload, setDayDone, setRounds } = useProgramWeek(program?.slug ?? null, weekNumber)
  const [saving, setSaving] = useState(false)

  if (!program || !weekNumber || !dayNumber || dayNumber > 7) return <Navigate to="/dashboard/programs" replace />
  const weekPath = dashboardProgramPath(program.slug, weekNumber)
  const day = data?.days.find((d) => d.day_number === dayNumber) ?? null

  const finish = async () => {
    setSaving(true)
    const ok = await setDayDone(dayNumber, true)
    setSaving(false)
    if (ok) {
      notify('success', copy.saved)
      navigate(weekPath)
    }
  }

  const body = () => {
    if (loading) return <PageSpinner />
    if (error?.notEnrolled) return <NotEnrolledCard programPagePath={programPath(program.slug)} />
    if (error?.locked) return <LoadError message={PROGRAM_COPY.week.locked} />
    if (error || !data) return <LoadError message={error?.message ?? PROGRAM_COPY.loadFailed} onRetry={reload} />
    if (!day) return <Navigate to={weekPath} replace />

    const { steps } = day
    const isRest = day.kind === 'rest'

    return (
      <div className="space-y-6">
        {isRest ? (
          <section className={dashCard}>
            <p className="text-chalk light:text-chalk-light">{copy.restDay}</p>
            {steps.coolDown?.length > 0 && <BulletList items={steps.coolDown} />}
          </section>
        ) : (
          <>
            <section className={dashCard}>
              <SessionTimer />
            </section>

            {steps.warmUp?.length > 0 && (
              <section className={dashCard}>
                <h2 className={dashHeading}>{copy.warmUp}</h2>
                <BulletList items={steps.warmUp} />
              </section>
            )}

            {steps.mainSet && (
              <section className={dashCard}>
                <h2 className={dashHeading}>{steps.mainSet.label || copy.mainSet}</h2>
                <div className="mt-4">
                  <RoundChecklist
                    rounds={steps.mainSet.rounds}
                    roundsDone={day.rounds_done}
                    work={steps.mainSet.work}
                    rest={steps.mainSet.rest}
                    onChange={(n) => setRounds(dayNumber, n)}
                  />
                </div>
              </section>
            )}

            {steps.coolDown?.length > 0 && (
              <section className={dashCard}>
                <h2 className={dashHeading}>{copy.coolDown}</h2>
                <BulletList items={steps.coolDown} />
              </section>
            )}

            {day.kind === 'community' && (
              <section className={dashCard}>
                <p className={dashMuted}>{copy.communityNote}</p>
                <Link to="/dashboard/calendar" className={`${dashLink} inline-block mt-2`}>
                  {PROGRAM_COPY.week.seeCalendar}
                </Link>
              </section>
            )}
          </>
        )}

        <section className={dashCard}>
          {day.done ? (
            <div className="flex flex-wrap items-center gap-4">
              <p className="flex items-center gap-2 font-barlow font-semibold text-chalk light:text-chalk-light">
                <CheckCircle2 size={20} aria-hidden="true" className="text-cta" /> {copy.doneAlready}
              </p>
              <button type="button" onClick={() => setDayDone(dayNumber, false)} className={`${dashLink} text-sm`}>
                {copy.undo}
              </button>
            </div>
          ) : (
            <CtaButton onClick={finish} disabled={saving}>
              {copy.done}
            </CtaButton>
          )}
        </section>
      </div>
    )
  }

  const subtitle = [
    `Week ${weekNumber}`,
    dayName(dayNumber),
    day?.steps.durationMinutes ? copy.minutes(day.steps.durationMinutes) : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <BackLink to={weekPath}>{PROGRAM_COPY.back.week(weekNumber)}</BackLink>
      <MemberPageHeader title={(day?.title ?? dayName(dayNumber)).toUpperCase()} subtitle={subtitle} />
      {body()}
    </>
  )
}
