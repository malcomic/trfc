import { useState, type FormEvent } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { PartyPopper } from 'lucide-react'
import { sendCheckin, type CheckinResult } from '../../../api/programs'
import { useMemberDashboard } from '../../../context/MemberDashboardContext'
import { dashboardProgramPath, programPath } from '../../../content/programs'
import { useMemberProgram } from '../../../hooks/useMemberProgram'
import { PROGRAM_COPY, firstMissingAnswer } from '../../../content/programPages'
import { useProgramPlan } from '../../../hooks/useProgramPlan'
import MemberPageHeader from '../../../components/member/MemberPageHeader'
import CtaButton from '../../../components/programs/CtaButton'
import CheckinField from '../../../components/member/program/CheckinField'
import { BackLink, LoadError, NotEnrolledCard, PageSpinner } from '../../../components/member/program/ProgramBits'
import { dashCard, dashHeading, dashMuted } from '../../../components/member/dashboard/ui'
import { ctaButton } from '../../../utils/themeClasses'
import { parseRouteNumber } from './routeParams'

const copy = PROGRAM_COPY.checkin

export default function ProgramCheckin() {
  const params = useParams()
  const program = useMemberProgram(params.slug)
  const weekNumber = parseRouteNumber(params.week)
  const { notify, refreshAll } = useMemberDashboard()
  const { plan, loading, error, reload } = useProgramPlan(program?.slug ?? null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<CheckinResult | null>(null)

  if (!program || !weekNumber) return <Navigate to="/dashboard/programs" replace />
  const home = dashboardProgramPath(program.slug)
  const weekPath = dashboardProgramPath(program.slug, weekNumber)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!plan || sending) return
    const missing = firstMissingAnswer(plan.checkinQuestions, answers)
    if (missing) {
      setFormError(copy.missing(missing.label))
      return
    }
    setFormError('')
    setSending(true)
    try {
      const sent = await sendCheckin(program.slug, weekNumber, answers)
      setResult(sent)
      refreshAll()
    } catch (err: any) {
      const message = err.response?.data?.error || copy.failed
      setFormError(message)
      notify('error', copy.failed, message)
    } finally {
      setSending(false)
    }
  }

  const body = () => {
    if (result) {
      return result.graduated || !result.nextWeek ? (
        <section className={`${dashCard} max-w-xl`}>
          <PartyPopper size={32} aria-hidden="true" className="text-cta" />
          <h2 className={`${dashHeading} mt-3`}>{copy.graduatedHeading}</h2>
          <p className={`${dashMuted} mt-2`}>{copy.graduatedBody}</p>
          <CtaButton to={home} size="sm" className="mt-5">
            {copy.backHome}
          </CtaButton>
        </section>
      ) : (
        <section className={`${dashCard} max-w-xl`}>
          <PartyPopper size={32} aria-hidden="true" className="text-cta" />
          <h2 className={`${dashHeading} mt-3`}>{copy.successHeading(result.week, result.nextWeek)}</h2>
          <CtaButton to={dashboardProgramPath(program.slug, result.nextWeek)} size="sm" className="mt-5">
            {copy.goToWeek(result.nextWeek)}
          </CtaButton>
        </section>
      )
    }
    if (loading) return <PageSpinner />
    if (error?.notEnrolled) return <NotEnrolledCard programPagePath={programPath(program.slug)} />
    if (error || !plan) return <LoadError message={error?.message ?? PROGRAM_COPY.loadFailed} onRetry={reload} />

    const { progress } = plan
    if (progress.checkedInWeeks.includes(weekNumber)) {
      const next = weekNumber < progress.totalWeeks ? weekNumber + 1 : null
      return (
        <section className={`${dashCard} max-w-xl`}>
          <p className="text-chalk light:text-chalk-light">{copy.alreadyDone}</p>
          <CtaButton to={next ? dashboardProgramPath(program.slug, next) : home} size="sm" className="mt-5">
            {next ? copy.goToWeek(next) : copy.backHome}
          </CtaButton>
        </section>
      )
    }
    if (progress.graduated || weekNumber !== progress.currentWeek) {
      return <LoadError message={copy.notThisWeek} />
    }

    return (
      <form onSubmit={submit} className={`${dashCard} max-w-2xl space-y-6`} noValidate>
        <div>
          <h2 className={dashHeading}>{copy.heading}</h2>
          <p className={`${dashMuted} mt-2`}>{copy.body(weekNumber)}</p>
        </div>
        {plan.checkinQuestions.map((question) => (
          <CheckinField
            key={question.id}
            question={question}
            value={answers[question.id] ?? ''}
            onChange={(value) => setAnswers((a) => ({ ...a, [question.id]: value }))}
          />
        ))}
        {formError && (
          <p role="alert" className="text-sm text-red-400 light:text-red-600">
            {formError}
          </p>
        )}
        <button
          type="submit"
          disabled={sending}
          className={`inline-flex items-center justify-center min-h-[56px] px-8 rounded-lg font-barlow font-semibold text-lg ${ctaButton} disabled:opacity-60`}
        >
          {sending ? copy.sending : copy.send}
        </button>
      </form>
    )
  }

  return (
    <>
      <BackLink to={weekPath}>{PROGRAM_COPY.back.week(weekNumber)}</BackLink>
      <MemberPageHeader title={copy.title} highlight={copy.highlight} />
      {body()}
    </>
  )
}
