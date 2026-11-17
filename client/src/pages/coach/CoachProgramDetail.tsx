import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Loader } from 'lucide-react'
import {
  ENGAGEMENT_STATUS_LABELS,
  getCoachProgram,
  type CoachProgramDetail,
  type EngagementStatus,
} from '../../api/coaches'

type StatusFilter = 'all' | EngagementStatus

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'on_track', label: ENGAGEMENT_STATUS_LABELS.on_track },
  { value: 'needs_attention', label: ENGAGEMENT_STATUS_LABELS.needs_attention },
  { value: 'inactive', label: ENGAGEMENT_STATUS_LABELS.inactive },
  { value: 'completed', label: ENGAGEMENT_STATUS_LABELS.completed },
]

function engagementRank(status: EngagementStatus): number {
  if (status === 'inactive') return 0
  if (status === 'needs_attention') return 1
  if (status === 'on_track') return 2
  return 3
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

export default function CoachProgramDetailPage() {
  const { slug = '' } = useParams()
  const [data, setData] = useState<CoachProgramDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getCoachProgram(slug)
      .then((row) => !cancelled && setData(row))
      .catch((err) => {
        if (cancelled) return
        setError(err.response?.data?.error || 'Could not load this program.')
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [slug])

  const participants = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    let rows = data.participants
    if (statusFilter !== 'all') {
      rows = rows.filter((p) => p.engagementStatus === statusFilter)
    }
    if (q) {
      rows = rows.filter((p) => p.name.toLowerCase().includes(q))
    }
    if (statusFilter === 'all') {
      rows = [...rows].sort((a, b) => engagementRank(a.engagementStatus) - engagementRank(b.engagementStatus))
    }
    return rows
  }, [data, query, statusFilter])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-fog light:text-fog-light font-barlow">
        <Loader className="animate-spin" size={18} /> Loading program…
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-3">
        <p className="m-0 text-red-500 font-barlow">{error || 'Program not found.'}</p>
        <Link to="/dashboard/coach/programs" className="font-barlow text-accent light:text-accent-light">
          Back to programs
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/dashboard/coach/programs"
          className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog light:text-fog-light no-underline"
        >
          ← My programs
        </Link>
        <h1 className="m-0 mt-3 font-bebas text-4xl text-chalk light:text-chalk-light">{data.name}</h1>
        {data.description && (
          <p className="m-0 mt-2 font-barlow text-fog light:text-fog-light max-w-2xl">{data.description}</p>
        )}
        <p className="m-0 mt-2 font-barlow text-sm text-fog light:text-fog-light">
          {data.totalWeeks} weeks · {data.enrolledCount} participant{data.enrolledCount === 1 ? '' : 's'}
          {data.durationLabel ? ` · ${data.durationLabel}` : ''}
        </p>
        {data.objectives.length > 0 && (
          <ul className="mt-4 pl-5 font-barlow text-sm text-fog light:text-fog-light space-y-1">
            {data.objectives.slice(0, 5).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="m-0 font-bebas text-2xl text-chalk light:text-chalk-light">Participants</h2>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name"
              className="px-3 py-2 min-h-[44px] bg-ash light:bg-smoke-light border border-white/10 light:border-black/10 text-chalk light:text-chalk-light font-barlow text-sm outline-none focus:border-accent/50"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 min-h-[36px] text-xs font-barlow-condensed font-bold tracking-widest uppercase border ${
                  statusFilter === f.value
                    ? 'border-accent text-accent light:border-accent-light light:text-accent-light'
                    : 'border-white/15 light:border-black/15 text-fog light:text-fog-light'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {participants.length === 0 ? (
          <p className="m-0 font-barlow text-fog light:text-fog-light">No participants match.</p>
        ) : (
          <div className="overflow-x-auto border border-white/10 light:border-black/10">
            <table className="w-full text-sm font-barlow">
              <thead className="text-left text-fog light:text-fog-light">
                <tr>
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Enrolled</th>
                  <th className="px-3 py-2 font-semibold">Week</th>
                  <th className="px-3 py-2 font-semibold">Sessions</th>
                  <th className="px-3 py-2 font-semibold">Check-ins</th>
                  <th className="px-3 py-2 font-semibold">To review</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => (
                  <tr key={p.id} className="border-t border-white/10 light:border-black/10">
                    <td className="px-3 py-3">
                      <Link
                        to={`/dashboard/coach/programs/${data.slug}/participants/${p.id}`}
                        className="text-chalk light:text-chalk-light font-semibold no-underline hover:text-accent light:hover:text-accent-light"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3">{engagementChip(p.engagementStatus)}</td>
                    <td className="px-3 py-3 text-fog light:text-fog-light">
                      {new Date(p.enrolledAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-3 text-fog light:text-fog-light">
                      {p.graduated ? 'Completed' : `${p.currentWeek} / ${p.totalWeeks}`}
                    </td>
                    <td className="px-3 py-3 text-fog light:text-fog-light">{p.sessionsDone}</td>
                    <td className="px-3 py-3 text-fog light:text-fog-light">{p.checkinsDone}</td>
                    <td className="px-3 py-3 text-fog light:text-fog-light">
                      {p.unreviewedCount > 0 ? (
                        <span className="text-accent light:text-accent-light font-semibold">{p.unreviewedCount}</span>
                      ) : (
                        '0'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
