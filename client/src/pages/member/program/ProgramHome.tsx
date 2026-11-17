import { FormEvent, useEffect, useState } from 'react'
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
import {
  getCoachingFeedback,
  getProgramMessages,
  postProgramMessage,
  type CoachingFeedbackItem,
  type ProgramCoachMessage,
} from '../../../api/programs'

const copy = PROGRAM_COPY.home

function CoachFeedbackSection({ programId }: { programId: string }) {
  const [items, setItems] = useState<CoachingFeedbackItem[] | null>(null)

  useEffect(() => {
    let cancelled = false
    getCoachingFeedback(programId)
      .then((rows) => !cancelled && setItems(rows))
      .catch(() => !cancelled && setItems([]))
    return () => {
      cancelled = true
    }
  }, [programId])

  if (items === null) return null

  return (
    <section className={dashCard}>
      <h2 className={dashHeading}>Coach feedback</h2>
      {items.length === 0 ? (
        <p className={`${dashMuted} mt-3`}>No coaching feedback yet. Your coach’s notes will show up here.</p>
      ) : (
        <ul className="mt-3 m-0 p-0 list-none space-y-3">
          {items.map((item) => (
            <li key={item.id} className="border-t border-mist/40 light:border-mist-light/40 pt-3 first:border-0 first:pt-0">
              <div className="font-barlow text-xs uppercase tracking-widest text-fog light:text-fog-light">
                {item.coachName} · {new Date(item.createdAt).toLocaleDateString()}
              </div>
              <p className="m-0 mt-1 font-barlow text-chalk light:text-chalk-light whitespace-pre-wrap">{item.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function MessageYourCoachSection({ programId }: { programId: string }) {
  const [messages, setMessages] = useState<ProgramCoachMessage[] | null>(null)
  const [coach, setCoach] = useState<{ userId: string; name: string } | null>(null)
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [unreadHint, setUnreadHint] = useState(false)

  const load = () =>
    getProgramMessages(programId).then((data) => {
      setCoach(data.coach)
      setMessages(data.messages)
      setUnreadHint((data.unreadCount ?? 0) > 0)
    })

  useEffect(() => {
    let cancelled = false
    getProgramMessages(programId)
      .then((data) => {
        if (cancelled) return
        setCoach(data.coach)
        setMessages(data.messages)
        setUnreadHint((data.unreadCount ?? 0) > 0)
      })
      .catch(() => {
        if (cancelled) return
        setMessages([])
        setCoach(null)
      })
    return () => {
      cancelled = true
    }
  }, [programId])

  const send = async (e: FormEvent) => {
    e.preventDefault()
    if (!body.trim()) {
      setError('Write a message before sending.')
      return
    }
    try {
      setBusy(true)
      setError('')
      await postProgramMessage(programId, body)
      setBody('')
      await load()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not send message')
    } finally {
      setBusy(false)
    }
  }

  if (messages === null) return null

  return (
    <section className={dashCard}>
      <h2 className={dashHeading}>Message your coach</h2>
      {!coach ? (
        <p className={`${dashMuted} mt-3`}>No coach assigned yet.</p>
      ) : (
        <>
          <p className={`${dashMuted} mt-2`}>
            Chat with {coach.name}
            {unreadHint ? ' · New replies waiting' : ''}
          </p>
          {messages.length === 0 ? (
            <p className={`${dashMuted} mt-3`}>No messages yet. Say hello below.</p>
          ) : (
            <ul className="mt-3 m-0 p-0 list-none space-y-3 max-h-72 overflow-y-auto">
              {messages.map((m) => (
                <li
                  key={m.id}
                  className={`border-t border-mist/40 light:border-mist-light/40 pt-3 first:border-0 first:pt-0 ${
                    m.mine ? 'pl-4' : ''
                  }`}
                >
                  <div className="font-barlow text-xs uppercase tracking-widest text-fog light:text-fog-light">
                    {m.mine ? 'You' : coach.name} · {new Date(m.createdAt).toLocaleString()}
                  </div>
                  <p className="m-0 mt-1 font-barlow text-chalk light:text-chalk-light whitespace-pre-wrap">{m.body}</p>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={send} className="mt-4 space-y-3">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder={`Message ${coach.name}`}
              className="w-full px-3 py-2 bg-ash light:bg-smoke-light border border-mist/40 light:border-mist-light/40 text-chalk light:text-chalk-light font-barlow text-sm outline-none focus:border-accent/50"
            />
            {error && <p className="m-0 text-red-500 text-sm font-barlow">{error}</p>}
            <button type="submit" disabled={busy} className={`${ctaButton} disabled:opacity-50`}>
              {busy ? 'Sending…' : 'Send message'}
            </button>
          </form>
        </>
      )}
    </section>
  )
}

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

        <CoachFeedbackSection programId={plan.program} />
        <MessageYourCoachSection programId={plan.program} />

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
