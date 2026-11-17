import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader } from 'lucide-react'
import {
  ENGAGEMENT_STATUS_LABELS,
  getCoachMe,
  getEngagementAttention,
  getReviewQueue,
  listCoachPrograms,
  REVIEW_STATUS_LABELS,
  type CoachMe,
  type CoachProgramSummary,
  type EngagementAttentionItem,
  type ReviewAttentionItem,
  type ReviewQueueItem,
} from '../../api/coaches'

export default function CoachOverview() {
  const [me, setMe] = useState<CoachMe | null>(null)
  const [programs, setPrograms] = useState<CoachProgramSummary[]>([])
  const [queue, setQueue] = useState<ReviewQueueItem[]>([])
  const [attention, setAttention] = useState<ReviewAttentionItem[]>([])
  const [unreviewedCount, setUnreviewedCount] = useState(0)
  const [engagementItems, setEngagementItems] = useState<EngagementAttentionItem[]>([])
  const [needsAttentionCount, setNeedsAttentionCount] = useState(0)
  const [inactiveCount, setInactiveCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([getCoachMe(), listCoachPrograms(), getReviewQueue(), getEngagementAttention()])
      .then(([profile, rows, reviews, engagement]) => {
        if (cancelled) return
        setMe(profile)
        setPrograms(rows)
        setQueue(reviews.items.slice(0, 8))
        setAttention(reviews.attention.slice(0, 5))
        setUnreviewedCount(reviews.unreviewedCount)
        setEngagementItems(engagement.items.slice(0, 8))
        setNeedsAttentionCount(engagement.items.filter((i) => i.engagementStatus === 'needs_attention').length)
        setInactiveCount(engagement.items.filter((i) => i.engagementStatus === 'inactive').length)
      })
      .catch(() => !cancelled && setError('Could not load your workspace.'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-fog light:text-fog-light font-barlow">
        <Loader className="animate-spin" size={18} /> Loading workspace…
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="m-0 font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light">
          Coach workspace
        </p>
        <h1 className="m-0 mt-2 font-bebas text-4xl sm:text-5xl text-chalk light:text-chalk-light">
          Welcome{me?.name ? `, ${me.name.split(' ')[0]}` : ''}
        </h1>
        <p className="m-0 mt-2 font-barlow text-fog light:text-fog-light max-w-xl">
          Review submitted activities and spot participants who are quiet or falling behind.
        </p>
      </div>

      {error && <p className="m-0 text-red-500 font-barlow text-sm">{error}</p>}

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <h2 className="m-0 font-bebas text-2xl text-chalk light:text-chalk-light">
            Needs review ({unreviewedCount})
          </h2>
        </div>
        {queue.length === 0 ? (
          <p className="m-0 font-barlow text-fog light:text-fog-light">No unreviewed activities right now.</p>
        ) : (
          <ul className="m-0 p-0 list-none divide-y divide-white/10 light:divide-black/10 border border-white/10 light:border-black/10">
            {queue.map((item) => (
              <li key={`${item.activityType}-${item.participantId}-${item.week}-${item.day ?? 'c'}`}>
                <Link
                  to={`/dashboard/coach/programs/${item.programSlug}/participants/${item.participantId}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 no-underline hover:bg-white/5 light:hover:bg-black/5"
                >
                  <div>
                    <div className="font-barlow font-semibold text-chalk light:text-chalk-light">
                      {item.participantName}
                    </div>
                    <div className="font-barlow text-sm text-fog light:text-fog-light">
                      {item.programName} ·{' '}
                      {item.activityType === 'session'
                        ? `Week ${item.week}, day ${item.day}`
                        : `Week ${item.week} check-in`}
                    </div>
                  </div>
                  <span className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light">
                    Review
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {attention.length > 0 && (
          <div className="space-y-2">
            <h3 className="m-0 font-bebas text-xl text-chalk light:text-chalk-light">Flagged / needs clarification</h3>
            <ul className="m-0 p-0 list-none space-y-2">
              {attention.map((item) => (
                <li key={item.id}>
                  <Link
                    to={`/dashboard/coach/programs/${item.programSlug}/participants/${item.participantId}`}
                    className="block px-4 py-3 border border-white/10 light:border-black/10 no-underline hover:border-accent/40"
                  >
                    <div className="font-barlow font-semibold text-chalk light:text-chalk-light">
                      {item.participantName} · {REVIEW_STATUS_LABELS[item.status]}
                    </div>
                    <div className="font-barlow text-sm text-fog light:text-fog-light">
                      {item.programName} ·{' '}
                      {item.activityType === 'session'
                        ? `Week ${item.week}, day ${item.day}`
                        : `Week ${item.week} check-in`}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="m-0 font-bebas text-2xl text-chalk light:text-chalk-light">Engagement</h2>
          <p className="m-0 mt-1 font-barlow text-sm text-fog light:text-fog-light">
            Participants who are quiet or behind — separate from unreviewed activities above.
          </p>
          <p className="m-0 mt-2 font-barlow text-sm text-fog light:text-fog-light">
            Needs Attention: {needsAttentionCount} · Inactive: {inactiveCount}
          </p>
        </div>
        {engagementItems.length === 0 ? (
          <p className="m-0 font-barlow text-fog light:text-fog-light">
            Everyone assigned looks on track right now.
          </p>
        ) : (
          <ul className="m-0 p-0 list-none divide-y divide-white/10 light:divide-black/10 border border-white/10 light:border-black/10">
            {engagementItems.map((item) => (
              <li key={`${item.programId}-${item.participantId}`}>
                <Link
                  to={`/dashboard/coach/programs/${item.programSlug}/participants/${item.participantId}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 no-underline hover:bg-white/5 light:hover:bg-black/5"
                >
                  <div>
                    <div className="font-barlow font-semibold text-chalk light:text-chalk-light">
                      {item.participantName}
                    </div>
                    <div className="font-barlow text-sm text-fog light:text-fog-light">
                      {item.programName} · Week {item.currentWeek}/{item.totalWeeks} ·{' '}
                      {item.daysSinceActivity}d since activity
                    </div>
                  </div>
                  <span
                    className={`font-barlow-condensed font-bold text-xs tracking-widest uppercase ${
                      item.engagementStatus === 'inactive'
                        ? 'text-red-300 light:text-red-700'
                        : 'text-amber-200 light:text-amber-800'
                    }`}
                  >
                    {ENGAGEMENT_STATUS_LABELS[item.engagementStatus]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <h2 className="m-0 font-bebas text-2xl text-chalk light:text-chalk-light">Assigned programs</h2>
          <Link
            to="/dashboard/coach/programs"
            className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light no-underline"
          >
            View all
          </Link>
        </div>

        {programs.length === 0 ? (
          <p className="m-0 font-barlow text-fog light:text-fog-light">
            No programs assigned yet. An admin will assign programs from the Coaches page.
          </p>
        ) : (
          <ul className="m-0 p-0 list-none grid gap-3 sm:grid-cols-2">
            {programs.map((program) => (
              <li key={program.id}>
                <Link
                  to={`/dashboard/coach/programs/${program.slug}`}
                  className="block p-4 border border-white/10 light:border-black/10 no-underline hover:border-accent/40 light:hover:border-accent-light/40 transition-colors"
                >
                  <div className="font-bebas text-2xl text-chalk light:text-chalk-light">{program.name}</div>
                  <div className="mt-1 font-barlow text-sm text-fog light:text-fog-light">
                    {program.enrolledCount} participant{program.enrolledCount === 1 ? '' : 's'}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
