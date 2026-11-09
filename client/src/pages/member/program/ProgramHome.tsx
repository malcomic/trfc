import { Link, Navigate, useParams } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { useMemberDashboard } from '../../../context/MemberDashboardContext'
import { dashboardProgramPath, programPath } from '../../../content/programs'
import { useMemberProgram } from '../../../hooks/useMemberProgram'
import { PROGRAM_COPY, programPercent, splitHeading } from '../../../content/programPages'
import { supportLink } from '../../../content/dashboard'
import { useProgramPlan } from '../../../hooks/useProgramPlan'
import MemberPageHeader from '../../../components/member/MemberPageHeader'
import CtaButton from '../../../components/programs/CtaButton'
import WeekStatusRow from '../../../components/member/program/WeekStatusRow'
import {
  BackLink,
  BulletList,
  LoadError,
  NotEnrolledCard,
  PageSpinner,
  ProgressBar,
} from '../../../components/member/program/ProgramBits'
import { dashCard, dashHeading, dashLink, dashMuted } from '../../../components/member/dashboard/ui'
import { ctaButton } from '../../../utils/themeClasses'

const copy = PROGRAM_COPY.home

export default function ProgramHome() {
  const { slug } = useParams()
  const program = useMemberProgram(slug)
  const { data } = useMemberDashboard()
  const { plan, loading, error, reload } = useProgramPlan(program?.slug ?? null)

  if (!program) return <Navigate to="/dashboard/programs" replace />
  const heading = splitHeading(program.name || plan?.name || '')

  const body = () => {
    if (loading) return <PageSpinner />
    if (error?.notEnrolled) return <NotEnrolledCard programPagePath={programPath(program.slug)} />
    if (error || !plan) return <LoadError message={error?.message ?? PROGRAM_COPY.loadFailed} onRetry={reload} />

    const { progress } = plan
    const percent = programPercent(progress.checkedInWeeks.length, progress.totalWeeks)
    const captain = data?.captain ?? null
    const support = supportLink(captain)

    return (
      <div className="space-y-6">
        <section className={dashCard}>
          <h2 className={dashHeading}>{program.title || plan.name}</h2>
          <div className="mt-5">
            <ProgressBar percent={percent} label={copy.weekOf(progress.currentWeek, progress.totalWeeks)} />
          </div>
          <p className="mt-2 font-barlow font-semibold text-chalk light:text-chalk-light">
            {progress.graduated ? copy.graduatedLine : copy.weekOf(progress.currentWeek, progress.totalWeeks)}
          </p>
          {!progress.graduated && (
            <CtaButton to={dashboardProgramPath(program.slug, progress.currentWeek)} size="sm" className="mt-5">
              {copy.openWeek(progress.currentWeek)}
            </CtaButton>
          )}
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <section className={dashCard}>
            <h2 className={dashHeading}>{copy.howYourWeekWorks}</h2>
            <BulletList items={plan.howYourWeekWorks} />
          </section>
          <section className={dashCard}>
            <h2 className={dashHeading}>{copy.howWeeksOpen}</h2>
            <BulletList items={plan.howWeeksOpen} />
          </section>
        </div>

        <section className={dashCard}>
          <h2 className={dashHeading}>{copy.yourWeeks(progress.totalWeeks)}</h2>
          <ul className="mt-3 divide-y divide-mist/40 light:divide-mist-light/40">
            {plan.weeks.map((week) => (
              <WeekStatusRow
                key={week.week_number}
                week={week}
                to={dashboardProgramPath(program.slug, week.week_number)}
              />
            ))}
          </ul>
        </section>

        <section className={dashCard}>
          <h2 className={dashHeading}>{plan.graduation.heading || copy.graduation}</h2>
          {plan.graduation.body && <p className="mt-3 text-fog light:text-fog-light">{plan.graduation.body}</p>}
        </section>

        <section className={dashCard}>
          <h2 className={dashHeading}>{copy.captainHeading}</h2>
          <p className={`${dashMuted} mt-2`}>{captain ? copy.captainBody(captain.name) : copy.noCaptainBody}</p>
          {captain ? (
            support.external ? (
              <a
                href={support.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-5 inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-lg font-barlow font-semibold no-underline ${ctaButton}`}
              >
                <MessageCircle size={18} aria-hidden="true" /> {copy.messageCaptain}
              </a>
            ) : (
              <Link to={support.href} className={`${dashLink} inline-block mt-4`}>
                {copy.messageCaptain}
              </Link>
            )
          ) : (
            <Link to="/dashboard/zone" className={`${dashLink} inline-block mt-4`}>
              {copy.pickCaptain}
            </Link>
          )}
        </section>
      </div>
    )
  }

  return (
    <>
      <BackLink to="/dashboard">{PROGRAM_COPY.back.dashboard}</BackLink>
      <MemberPageHeader title={heading.title} highlight={heading.highlight} subtitle={program.tagline} />
      {body()}
    </>
  )
}
