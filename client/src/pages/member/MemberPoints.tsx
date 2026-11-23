import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Loader } from 'lucide-react'
import MemberPageHeader from '../../components/member/MemberPageHeader'
import { dashCard, dashHeading, dashMuted } from '../../components/member/dashboard/ui'
import { useMemberDashboard } from '../../context/MemberDashboardContext'
import {
  getMyPoints,
  getMyPointsLedger,
  getPointsLeaderboards,
  nominateCommunity,
  reportMissingScan,
  submitCaptainFeedback,
  submitDispute,
  submitTransformation,
  type Leaderboards,
  type LedgerRow,
  type PointsSummary,
} from '../../api/points'

function Standing({ summary }: { summary: PointsSummary }) {
  return (
    <section className={dashCard}>
      <h2 className={dashHeading}>Standing</h2>
      <p className="mt-3 font-bebas text-5xl text-chalk light:text-chalk-light">{summary.total}</p>
      <p className={dashMuted}>season points · {summary.season.name}</p>
      {!summary.isCaptain && (
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className={dashMuted}>Overall rank</dt>
            <dd className="font-semibold text-chalk light:text-chalk-light">
              {summary.overallRank ?? '—'}
              {summary.gapToNext != null && summary.gapToNext > 0 && (
                <span className={`block ${dashMuted}`}>{summary.gapToNext} behind next</span>
              )}
            </dd>
          </div>
          <div>
            <dt className={dashMuted}>Zone rank</dt>
            <dd className="font-semibold text-chalk light:text-chalk-light">{summary.zoneRank ?? '—'}</dd>
          </div>
          <div>
            <dt className={dashMuted}>In the race</dt>
            <dd className="font-semibold text-chalk light:text-chalk-light">{summary.inRace ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt className={dashMuted}>Reward points</dt>
            <dd className="font-semibold text-chalk light:text-chalk-light">{summary.rewards.balance}</dd>
          </div>
        </dl>
      )}
      {summary.isCaptain && (
        <p className={`mt-3 ${dashMuted}`}>Captains earn through sales and commissions, not the member contest.</p>
      )}
    </section>
  )
}

function StreakCard({ summary }: { summary: PointsSummary }) {
  const s = summary.streak
  return (
    <section className={dashCard}>
      <h2 className={dashHeading}>Streak</h2>
      <p className={`mt-2 ${dashMuted}`}>
        {s.progress} of {s.streakLength} Saturdays toward the next +10 bonus.
        {s.freeMissAvailable ? ' Free miss still available.' : ' Free miss already used this streak.'}
      </p>
      <div className="mt-3 flex gap-2">
        {Array.from({ length: s.streakLength }).map((_, i) => (
          <span
            key={i}
            className={`h-3 flex-1 rounded ${i < s.progress ? 'bg-cta' : 'bg-fog/30 light:bg-fog-light/40'}`}
          />
        ))}
      </div>
      <p className={`mt-4 text-sm ${dashMuted}`}>
        Attendance: {summary.attendance.attended}/{summary.attendance.official} ({summary.attendance.share}%)
      </p>
    </section>
  )
}

function LeaderboardBlock({ boards }: { boards: Leaderboards }) {
  return (
    <section className={dashCard}>
      <h2 className={dashHeading}>Leaderboards</h2>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="font-barlow font-bold text-sm uppercase tracking-wider text-accent light:text-accent-light">
            Top 10 overall
          </h3>
          <ol className="mt-2 space-y-1 text-sm">
            {boards.overall.map((r) => (
              <li key={r.userId} className="flex justify-between gap-2">
                <span>
                  {r.rank}. {r.name}
                  {r.zoneName ? ` · ${r.zoneName}` : ''}
                </span>
                <span className="font-semibold">{r.points}</span>
              </li>
            ))}
            {boards.overall.length === 0 && <li className={dashMuted}>No scores yet</li>}
          </ol>
        </div>
        <div>
          <h3 className="font-barlow font-bold text-sm uppercase tracking-wider text-accent light:text-accent-light">
            This month
          </h3>
          <ol className="mt-2 space-y-1 text-sm">
            {boards.month.map((r) => (
              <li key={r.userId} className="flex justify-between gap-2">
                <span>
                  {r.rank}. {r.name}
                </span>
                <span className="font-semibold">{r.points}</span>
              </li>
            ))}
            {boards.month.length === 0 && <li className={dashMuted}>No scores yet</li>}
          </ol>
        </div>
        <div>
          <h3 className="font-barlow font-bold text-sm uppercase tracking-wider text-accent light:text-accent-light">
            Zones by average
          </h3>
          <ol className="mt-2 space-y-1 text-sm">
            {boards.zones.map((r) => (
              <li key={r.zoneId} className="flex justify-between gap-2">
                <span>
                  {r.rank}. {r.zoneName} ({r.members})
                </span>
                <span className="font-semibold">{r.avgPoints}</span>
              </li>
            ))}
            {boards.zones.length === 0 && <li className={dashMuted}>No zone scores yet</li>}
          </ol>
        </div>
        <div>
          <h3 className="font-barlow font-bold text-sm uppercase tracking-wider text-accent light:text-accent-light">
            Top referrers
          </h3>
          <ol className="mt-2 space-y-1 text-sm">
            {boards.referrers.map((r) => (
              <li key={r.userId} className="flex justify-between gap-2">
                <span>
                  {r.rank}. {r.name}
                </span>
                <span className="font-semibold">{r.referrals}</span>
              </li>
            ))}
            {boards.referrers.length === 0 && <li className={dashMuted}>No referrals yet</li>}
          </ol>
        </div>
      </div>
    </section>
  )
}

function MemberActions() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' })
  const transformationOpen = today <= '2027-06-30'
  const communityOpen = today >= '2027-07-01' && today <= '2027-07-31'
  const [dispute, setDispute] = useState('')
  const [disputeMsg, setDisputeMsg] = useState('')
  const [story, setStory] = useState('')
  const [beforeUrl, setBeforeUrl] = useState('')
  const [afterUrl, setAfterUrl] = useState('')
  const [sharePhotos, setSharePhotos] = useState(false)
  const [xformMsg, setXformMsg] = useState('')
  const [nomineeId, setNomineeId] = useState('')
  const [nomNote, setNomNote] = useState('')
  const [nomMsg, setNomMsg] = useState('')
  const [rating1, setRating1] = useState(5)
  const [rating2, setRating2] = useState(5)
  const [fbMsg, setFbMsg] = useState('')

  return (
    <div className="space-y-6">
      <section className={dashCard}>
        <h2 className={dashHeading}>Dispute a score</h2>
        <p className={`mt-1 text-sm ${dashMuted}`}>Flag something that looks wrong. Coaches review with zone captains.</p>
        <textarea
          value={dispute}
          onChange={(e) => setDispute(e.target.value)}
          rows={3}
          className="mt-3 w-full rounded border border-fog/30 light:border-fog-light/40 bg-transparent px-3 py-2 text-sm"
          placeholder="What happened?"
        />
        <button
          type="button"
          className="mt-2 rounded bg-cta text-cta-ink px-4 py-2 text-sm font-semibold"
          onClick={async () => {
            try {
              await submitDispute(dispute.trim())
              setDisputeMsg('Submitted')
              setDispute('')
            } catch {
              setDisputeMsg('Could not submit')
            }
          }}
        >
          Submit dispute
        </button>
        {disputeMsg && <p className={`mt-2 text-sm ${dashMuted}`}>{disputeMsg}</p>}
      </section>

      {transformationOpen && (
        <section className={dashCard}>
          <h2 className={dashHeading}>Transformation award</h2>
          <p className={`mt-1 text-sm ${dashMuted}`}>Entries close 30 June 2027.</p>
          <textarea
            value={story}
            onChange={(e) => setStory(e.target.value)}
            rows={4}
            className="mt-3 w-full rounded border border-fog/30 light:border-fog-light/40 bg-transparent px-3 py-2 text-sm"
            placeholder="Your story"
          />
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input
              value={beforeUrl}
              onChange={(e) => setBeforeUrl(e.target.value)}
              placeholder="Before photo URL (optional)"
              className="rounded border border-fog/30 light:border-fog-light/40 bg-transparent px-3 py-2 text-sm"
            />
            <input
              value={afterUrl}
              onChange={(e) => setAfterUrl(e.target.value)}
              placeholder="After photo URL (optional)"
              className="rounded border border-fog/30 light:border-fog-light/40 bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <label className={`mt-2 flex items-center gap-2 text-sm ${dashMuted}`}>
            <input type="checkbox" checked={sharePhotos} onChange={(e) => setSharePhotos(e.target.checked)} />
            Happy for TRFC to share photos
          </label>
          <button
            type="button"
            className="mt-2 rounded bg-cta text-cta-ink px-4 py-2 text-sm font-semibold"
            onClick={async () => {
              try {
                await submitTransformation({
                  story: story.trim(),
                  beforeUrl: beforeUrl.trim() || undefined,
                  afterUrl: afterUrl.trim() || undefined,
                  sharePhotos,
                })
                setXformMsg('Entry saved')
                setStory('')
              } catch {
                setXformMsg('Could not save entry')
              }
            }}
          >
            Submit entry
          </button>
          {xformMsg && <p className={`mt-2 text-sm ${dashMuted}`}>{xformMsg}</p>}
        </section>
      )}

      {communityOpen && (
        <section className={dashCard}>
          <h2 className={dashHeading}>Nominate Community Champion</h2>
          <p className={`mt-1 text-sm ${dashMuted}`}>Open in July 2027 only.</p>
          <input
            value={nomineeId}
            onChange={(e) => setNomineeId(e.target.value)}
            placeholder="Nominee member id"
            className="mt-3 w-full rounded border border-fog/30 light:border-fog-light/40 bg-transparent px-3 py-2 text-sm"
          />
          <input
            value={nomNote}
            onChange={(e) => setNomNote(e.target.value)}
            placeholder="Why them? (optional)"
            className="mt-2 w-full rounded border border-fog/30 light:border-fog-light/40 bg-transparent px-3 py-2 text-sm"
          />
          <button
            type="button"
            className="mt-2 rounded bg-cta text-cta-ink px-4 py-2 text-sm font-semibold"
            onClick={async () => {
              try {
                await nominateCommunity(nomineeId.trim(), nomNote.trim() || undefined)
                setNomMsg('Nomination sent')
                setNomineeId('')
                setNomNote('')
              } catch {
                setNomMsg('Could not nominate')
              }
            }}
          >
            Nominate
          </button>
          {nomMsg && <p className={`mt-2 text-sm ${dashMuted}`}>{nomMsg}</p>}
        </section>
      )}

      <section className={dashCard}>
        <h2 className={dashHeading}>Captain feedback</h2>
        <p className={`mt-1 text-sm ${dashMuted}`}>Rate your captain once per month (1–5).</p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <label>
            Support
            <input
              type="number"
              min={1}
              max={5}
              value={rating1}
              onChange={(e) => setRating1(Number(e.target.value))}
              className="ml-2 w-16 rounded border border-fog/30 light:border-fog-light/40 bg-transparent px-2 py-1"
            />
          </label>
          <label>
            Leadership
            <input
              type="number"
              min={1}
              max={5}
              value={rating2}
              onChange={(e) => setRating2(Number(e.target.value))}
              className="ml-2 w-16 rounded border border-fog/30 light:border-fog-light/40 bg-transparent px-2 py-1"
            />
          </label>
        </div>
        <button
          type="button"
          className="mt-2 rounded bg-cta text-cta-ink px-4 py-2 text-sm font-semibold"
          onClick={async () => {
            try {
              await submitCaptainFeedback(rating1, rating2)
              setFbMsg('Thanks — feedback recorded')
            } catch {
              setFbMsg('Could not save (maybe already submitted this month)')
            }
          }}
        >
          Submit feedback
        </button>
        {fbMsg && <p className={`mt-2 text-sm ${dashMuted}`}>{fbMsg}</p>}
      </section>
    </div>
  )
}

function Ledger({ rows }: { rows: LedgerRow[] }) {
  const [eventId, setEventId] = useState('')
  const [reportMsg, setReportMsg] = useState('')
  return (
    <section className={dashCard}>
      <h2 className={dashHeading}>History</h2>
      <ul className="mt-3 divide-y divide-fog/20 light:divide-fog-light/30">
        {rows.map((row) => (
          <li key={row.id} className="py-3 flex justify-between gap-3 text-sm">
            <div>
              <p className="font-semibold text-chalk light:text-chalk-light">
                {row.eventTitle || row.reason || row.kind}
              </p>
              <p className={dashMuted}>
                {String(row.createdAt).slice(0, 10)}
                {row.scannedBy ? ` · scanned by ${row.scannedBy}` : ''}
              </p>
            </div>
            <span className={`font-bold ${row.points >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {row.points >= 0 ? '+' : ''}
              {row.points}
            </span>
          </li>
        ))}
        {rows.length === 0 && <li className={`py-3 ${dashMuted}`}>No points yet. Finish a Saturday run to start.</li>}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2 items-end">
        <label className={`text-sm flex-1 min-w-[12rem] ${dashMuted}`}>
          Report a missing scan (event id)
          <input
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="mt-1 w-full rounded border border-fog/30 light:border-fog-light/40 bg-transparent px-3 py-2 text-chalk light:text-chalk-light"
          />
        </label>
        <button
          type="button"
          className="rounded bg-cta text-cta-ink px-4 py-2 text-sm font-semibold"
          onClick={async () => {
            try {
              await reportMissingScan(eventId.trim())
              setReportMsg('Report submitted')
              setEventId('')
            } catch {
              setReportMsg('Could not submit report')
            }
          }}
        >
          Report
        </button>
      </div>
      {reportMsg && <p className={`mt-2 text-sm ${dashMuted}`}>{reportMsg}</p>}
    </section>
  )
}

export default function MemberPoints() {
  const { loading, isMember } = useMemberDashboard()
  const [summary, setSummary] = useState<PointsSummary | null>(null)
  const [boards, setBoards] = useState<Leaderboards | null>(null)
  const [ledger, setLedger] = useState<LedgerRow[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isMember) return
    let cancelled = false
    Promise.all([getMyPoints(), getPointsLeaderboards(), getMyPointsLedger(30)])
      .then(([s, b, l]) => {
        if (cancelled) return
        setSummary(s)
        setBoards(b)
        setLedger(l.rows)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load points. Try again soon.')
      })
    return () => {
      cancelled = true
    }
  }, [isMember])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader className="w-10 h-10 animate-spin text-cta" />
      </div>
    )
  }
  if (!isMember) return <Navigate to="/dashboard" replace />

  if (error) {
    return (
      <div className="space-y-4">
        <MemberPageHeader title="Points and awards" />
        <p className={dashMuted}>{error}</p>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="space-y-4">
        <MemberPageHeader title="Points and awards" />
        <p className={dashMuted}>Loading…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <MemberPageHeader
        title="Points and awards"
        subtitle={
          summary.nextSaturday
            ? `Next: ${summary.nextSaturday.title} · ${summary.nextSaturday.points} pts · ${summary.countdowns.daysToCutoff} days to race cutoff`
            : `${summary.countdowns.daysToCutoff} days to the 31 March race cutoff`
        }
      />
      <Standing summary={summary} />
      <StreakCard summary={summary} />
      {boards && <LeaderboardBlock boards={boards} />}
      {!summary.isCaptain && <MemberActions />}
      <Ledger rows={ledger} />
      <p className={`text-sm ${dashMuted}`}>
        Referral code:{' '}
        <span className="font-mono font-semibold text-chalk light:text-chalk-light">{summary.rewards.referralCode}</span>
        {' · '}
        {summary.rewards.referralCount ?? 0} cleared referral{(summary.rewards.referralCount ?? 0) === 1 ? '' : 's'}
        {summary.rewards.nearestExpiryAt
          ? ` · next reward expiry ${String(summary.rewards.nearestExpiryAt).slice(0, 10)}`
          : ''}
        {' · '}
        <Link to="/dashboard/membership" className="underline">
          Membership
        </Link>
      </p>
    </div>
  )
}
