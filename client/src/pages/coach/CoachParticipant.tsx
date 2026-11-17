import { FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Loader } from 'lucide-react'
import {
  ENGAGEMENT_REASON_LABELS,
  ENGAGEMENT_STATUS_LABELS,
  getCoachParticipant,
  getCoachThread,
  postCoachFeedback,
  postCoachMessage,
  REVIEW_STATUS_LABELS,
  upsertCoachReview,
  type CoachMessage,
  type CoachParticipantDetail,
  type EngagementStatus,
  type ReviewStatus,
} from '../../api/coaches'

const REVIEW_ACTIONS: ReviewStatus[] = ['reviewed', 'needs_clarification', 'flagged']

function statusChip(status: ReviewStatus | null) {
  if (!status) {
    return (
      <span className="inline-block px-2 py-0.5 text-[11px] font-barlow-condensed font-bold tracking-widest uppercase bg-white/10 light:bg-black/10 text-fog light:text-fog-light">
        Unreviewed
      </span>
    )
  }
  const tone =
    status === 'flagged'
      ? 'bg-red-500/20 text-red-300 light:text-red-700'
      : status === 'needs_clarification'
        ? 'bg-amber-500/20 text-amber-200 light:text-amber-800'
        : 'bg-emerald-500/20 text-emerald-200 light:text-emerald-800'
  return (
    <span className={`inline-block px-2 py-0.5 text-[11px] font-barlow-condensed font-bold tracking-widest uppercase ${tone}`}>
      {REVIEW_STATUS_LABELS[status]}
    </span>
  )
}

function engagementChip(status: EngagementStatus) {
  const tone =
    status === 'inactive'
      ? 'bg-red-500/20 text-red-300 light:text-red-700'
      : status === 'needs_attention'
        ? 'bg-amber-500/20 text-amber-200 light:text-amber-800'
        : status === 'completed'
          ? 'bg-white/10 light:bg-black/10 text-fog light:text-fog-light'
          : 'bg-emerald-500/20 text-emerald-200 light:text-emerald-800'
  return (
    <span className={`inline-block px-2 py-0.5 text-[11px] font-barlow-condensed font-bold tracking-widest uppercase ${tone}`}>
      {ENGAGEMENT_STATUS_LABELS[status]}
    </span>
  )
}

function engagementReasonLine(reasons: string[]): string {
  if (reasons.length === 0) return ''
  return reasons.map((r) => ENGAGEMENT_REASON_LABELS[r] ?? r).join(' · ')
}

function ReviewControls({
  status,
  note,
  busy,
  onSave,
}: {
  status: ReviewStatus | null
  note: string | null
  busy: boolean
  onSave: (status: ReviewStatus, note: string) => Promise<void>
}) {
  const [draftNote, setDraftNote] = useState(note ?? '')
  const [error, setError] = useState('')

  useEffect(() => {
    setDraftNote(note ?? '')
  }, [note, status])

  const save = async (next: ReviewStatus) => {
    try {
      setError('')
      await onSave(next, draftNote)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not save review')
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {statusChip(status)}
        {REVIEW_ACTIONS.map((action) => (
          <button
            key={action}
            type="button"
            disabled={busy}
            onClick={() => save(action)}
            className={`px-3 min-h-[36px] text-xs font-barlow-condensed font-bold tracking-widest uppercase border disabled:opacity-50 ${
              status === action
                ? 'border-accent text-accent light:border-accent-light light:text-accent-light'
                : 'border-white/15 light:border-black/15 text-fog light:text-fog-light'
            }`}
          >
            {REVIEW_STATUS_LABELS[action]}
          </button>
        ))}
      </div>
      <textarea
        value={draftNote}
        onChange={(e) => setDraftNote(e.target.value)}
        rows={2}
        placeholder="Optional note for this review"
        className="w-full px-3 py-2 bg-ash light:bg-smoke-light border border-white/10 light:border-black/10 text-chalk light:text-chalk-light font-barlow text-sm outline-none focus:border-accent/50"
      />
      {error && <p className="m-0 text-red-500 text-xs font-barlow">{error}</p>}
    </div>
  )
}

export default function CoachParticipantPage() {
  const { slug = '', userId = '' } = useParams()
  const [data, setData] = useState<CoachParticipantDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [feedbackBody, setFeedbackBody] = useState('')
  const [feedbackError, setFeedbackError] = useState('')
  const [feedbackBusy, setFeedbackBusy] = useState(false)
  const [messages, setMessages] = useState<CoachMessage[]>([])
  const [messageBody, setMessageBody] = useState('')
  const [messageError, setMessageError] = useState('')
  const [messageBusy, setMessageBusy] = useState(false)
  const messagesRef = useRef<HTMLElement | null>(null)

  const reload = () => getCoachParticipant(slug, userId).then(setData)
  const reloadMessages = () => getCoachThread(slug, userId).then((t) => setMessages(t.messages))

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([getCoachParticipant(slug, userId), getCoachThread(slug, userId)])
      .then(([row, thread]) => {
        if (cancelled) return
        setData(row)
        setMessages(thread.messages)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.response?.data?.error || 'Could not load this participant.')
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [slug, userId])

  useEffect(() => {
    if (!loading && window.location.hash === '#messages') {
      messagesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [loading, data])

  const saveReview = async (
    key: string,
    payload: { activityType: 'session' | 'checkin'; week: number; day?: number | null; status: ReviewStatus; note?: string }
  ) => {
    setBusyKey(key)
    try {
      await upsertCoachReview(slug, userId, payload)
      await reload()
    } finally {
      setBusyKey(null)
    }
  }

  const submitFeedback = async (e: FormEvent) => {
    e.preventDefault()
    if (!feedbackBody.trim()) {
      setFeedbackError('Write a short note before sending.')
      return
    }
    try {
      setFeedbackBusy(true)
      setFeedbackError('')
      await postCoachFeedback(slug, userId, { body: feedbackBody })
      setFeedbackBody('')
      await reload()
    } catch (err: any) {
      setFeedbackError(err.response?.data?.error || 'Could not send feedback')
    } finally {
      setFeedbackBusy(false)
    }
  }

  const submitMessage = async (e: FormEvent) => {
    e.preventDefault()
    if (!messageBody.trim()) {
      setMessageError('Write a message before sending.')
      return
    }
    try {
      setMessageBusy(true)
      setMessageError('')
      await postCoachMessage(slug, userId, messageBody)
      setMessageBody('')
      await reloadMessages()
    } catch (err: any) {
      setMessageError(err.response?.data?.error || 'Could not send message')
    } finally {
      setMessageBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-fog light:text-fog-light font-barlow">
        <Loader className="animate-spin" size={18} /> Loading participant…
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-3">
        <p className="m-0 text-red-500 font-barlow">{error || 'Participant not found.'}</p>
        <Link to={`/dashboard/coach/programs/${slug}`} className="font-barlow text-accent light:text-accent-light">
          Back to program
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          to={`/dashboard/coach/programs/${data.program.slug}`}
          className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog light:text-fog-light no-underline"
        >
          ← {data.program.name}
        </Link>
        <h1 className="m-0 mt-3 font-bebas text-4xl text-chalk light:text-chalk-light">{data.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {engagementChip(data.engagementStatus)}
          {engagementReasonLine(data.engagementReasons) && (
            <span className="font-barlow text-sm text-fog light:text-fog-light">
              {engagementReasonLine(data.engagementReasons)}
            </span>
          )}
        </div>
        <p className="m-0 mt-2 font-barlow text-sm text-fog light:text-fog-light">
          Enrolled {new Date(data.enrolledAt).toLocaleDateString()} · {data.enrollmentStatus}
          {data.progress.graduated
            ? ' · Completed'
            : ` · Week ${data.progress.currentWeek} of ${data.progress.totalWeeks}`}
          {' · '}
          {data.daysSinceActivity}d since activity
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Completed sessions" value={String(data.completedActivities.length)} />
        <Stat label="Pending this week" value={String(data.pendingActivities.length)} />
        <Stat label="Missed earlier" value={String(data.missedActivities.length)} />
      </section>

      <section className="space-y-3">
        <h2 className="m-0 font-bebas text-2xl text-chalk light:text-chalk-light">Completed activities</h2>
        {data.completedActivities.length === 0 ? (
          <p className="m-0 font-barlow text-fog light:text-fog-light">None yet.</p>
        ) : (
          <ul className="m-0 p-0 list-none space-y-3 font-barlow text-sm">
            {data.completedActivities.map((a) => {
              const key = `session:${a.week}:${a.day}`
              return (
                <li key={key} className="px-3 py-3 border border-white/10 light:border-black/10">
                  <div className="text-chalk light:text-chalk-light font-semibold">
                    Week {a.week}, day {a.day}
                    {a.rounds_done > 0 ? ` · ${a.rounds_done} rounds` : ''}
                  </div>
                  <ReviewControls
                    status={a.reviewStatus}
                    note={a.reviewNote}
                    busy={busyKey === key}
                    onSave={(status, note) =>
                      saveReview(key, { activityType: 'session', week: a.week, day: a.day, status, note })
                    }
                  />
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="m-0 font-bebas text-2xl text-chalk light:text-chalk-light">Check-ins</h2>
        {data.checkins.length === 0 ? (
          <p className="m-0 font-barlow text-fog light:text-fog-light">No check-ins submitted yet.</p>
        ) : (
          <ul className="m-0 p-0 list-none space-y-3">
            {data.checkins.map((c) => {
              const key = `checkin:${c.week}`
              return (
                <li key={key} className="p-4 border border-white/10 light:border-black/10">
                  <div className="font-barlow font-semibold text-chalk light:text-chalk-light">
                    Week {c.week} · {new Date(c.submittedAt).toLocaleString()}
                  </div>
                  <dl className="mt-2 space-y-1 font-barlow text-sm text-fog light:text-fog-light">
                    {Object.entries(c.answers || {}).map(([k, value]) => (
                      <div key={k}>
                        <dt className="inline font-semibold capitalize">{k}: </dt>
                        <dd className="inline m-0">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <ReviewControls
                    status={c.reviewStatus}
                    note={c.reviewNote}
                    busy={busyKey === key}
                    onSave={(status, note) =>
                      saveReview(key, { activityType: 'checkin', week: c.week, status, note })
                    }
                  />
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section ref={messagesRef} id="messages" className="space-y-4 scroll-mt-4">
        <h2 className="m-0 font-bebas text-2xl text-chalk light:text-chalk-light">Messages</h2>
        {messages.length === 0 ? (
          <p className="m-0 font-barlow text-fog light:text-fog-light">No messages yet. Start the conversation below.</p>
        ) : (
          <ul className="m-0 p-0 list-none space-y-3 max-h-80 overflow-y-auto">
            {messages.map((m) => (
              <li
                key={m.id}
                className={`p-3 border border-white/10 light:border-black/10 ${
                  m.mine ? 'ml-6' : 'mr-6'
                }`}
              >
                <div className="font-barlow text-xs uppercase tracking-widest text-fog light:text-fog-light">
                  {m.mine ? 'You' : data.name} · {new Date(m.createdAt).toLocaleString()}
                </div>
                <p className="m-0 mt-1 font-barlow text-sm text-chalk light:text-chalk-light whitespace-pre-wrap">
                  {m.body}
                </p>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={submitMessage} className="space-y-3">
          <textarea
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            rows={3}
            placeholder="Message this participant"
            className="w-full px-3 py-2 bg-ash light:bg-smoke-light border border-white/10 light:border-black/10 text-chalk light:text-chalk-light font-barlow text-sm outline-none focus:border-accent/50"
          />
          {messageError && <p className="m-0 text-red-500 text-sm font-barlow">{messageError}</p>}
          <button
            type="submit"
            disabled={messageBusy}
            className="px-4 min-h-[44px] font-barlow-condensed font-bold tracking-widest uppercase bg-cta text-cta-ink disabled:opacity-50"
          >
            {messageBusy ? 'Sending…' : 'Send message'}
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="m-0 font-bebas text-2xl text-chalk light:text-chalk-light">Coaching feedback</h2>
        <form onSubmit={submitFeedback} className="space-y-3">
          <textarea
            value={feedbackBody}
            onChange={(e) => setFeedbackBody(e.target.value)}
            rows={4}
            placeholder="Encouragement, tips, or next-step guidance for this participant"
            className="w-full px-3 py-2 bg-ash light:bg-smoke-light border border-white/10 light:border-black/10 text-chalk light:text-chalk-light font-barlow text-sm outline-none focus:border-accent/50"
          />
          {feedbackError && <p className="m-0 text-red-500 text-sm font-barlow">{feedbackError}</p>}
          <button
            type="submit"
            disabled={feedbackBusy}
            className="px-4 min-h-[44px] font-barlow-condensed font-bold tracking-widest uppercase bg-cta text-cta-ink disabled:opacity-50"
          >
            {feedbackBusy ? 'Sending…' : 'Send feedback'}
          </button>
        </form>

        {data.feedback.length === 0 ? (
          <p className="m-0 font-barlow text-fog light:text-fog-light">No feedback yet.</p>
        ) : (
          <ul className="m-0 p-0 list-none space-y-3">
            {data.feedback.map((f) => (
              <li key={f.id} className="p-4 border border-white/10 light:border-black/10">
                <div className="font-barlow text-xs uppercase tracking-widest text-fog light:text-fog-light">
                  {new Date(f.createdAt).toLocaleString()}
                </div>
                <p className="m-0 mt-2 font-barlow text-chalk light:text-chalk-light whitespace-pre-wrap">{f.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 border border-white/10 light:border-black/10">
      <div className="font-bebas text-3xl text-chalk light:text-chalk-light">{value}</div>
      <div className="mt-1 font-barlow text-xs uppercase tracking-widest text-fog light:text-fog-light">{label}</div>
    </div>
  )
}
