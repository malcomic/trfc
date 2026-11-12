import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AlertCircle, Loader } from 'lucide-react'
import { getMemberPolls, voteInPoll, type MemberPoll } from '../../api/membership'
import { MEMBERSHIP_COPY, memberDateTime } from '../../content/membership'
import { useMemberDashboard } from '../../context/MemberDashboardContext'
import MemberPageHeader from '../../components/member/MemberPageHeader'
import PollResultBars from '../../components/member/membership/PollResultBars'
import { dashCard, dashHeading, dashMuted } from '../../components/member/dashboard/ui'

const copy = MEMBERSHIP_COPY.vote

function PollCard({ poll, onUpdated }: { poll: MemberPoll; onUpdated: (poll: MemberPoll) => void }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const open = poll.status === 'open'

  const vote = async (optionId: string) => {
    if (optionId === poll.myVote) return
    try {
      setSaving(true)
      setError('')
      const updated = await voteInPoll(poll.id, optionId)
      if (updated) onUpdated(updated)
    } catch (err: any) {
      setError(err?.response?.data?.error || copy.voteError)
    } finally {
      setSaving(false)
    }
  }

  return (
    <li className={dashCard}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`rounded-full px-3 py-1 font-barlow font-semibold ${
            open ? 'bg-cta text-cta-ink' : 'bg-white/10 light:bg-black/10 text-fog light:text-fog-light'
          }`}
        >
          {open ? copy.open : copy.closed}
        </span>
        <span className="text-fog light:text-fog-light">
          {open ? copy.closes(memberDateTime(poll.closesAt)) : copy.closedOn(memberDateTime(poll.closedEarlyAt ?? poll.closesAt))}
          {' · '}
          {copy.votes(poll.total)}
        </span>
      </div>
      <h2 className={`${dashHeading} mt-3`}>{poll.question}</h2>
      {poll.description && <p className={`${dashMuted} mt-1 whitespace-pre-line`}>{poll.description}</p>}
      <div className="mt-4 text-chalk light:text-chalk-light">
        <PollResultBars poll={poll} onVote={open ? vote : undefined} disabled={saving} />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-400 light:text-red-700">
          {error}
        </p>
      )}
    </li>
  )
}

export default function MemberVote() {
  const { loading: memberLoading, isMember } = useMemberDashboard()
  const [polls, setPolls] = useState<MemberPoll[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (memberLoading || !isMember) return
    getMemberPolls()
      .then(setPolls)
      .catch((err: any) => setError(err?.response?.data?.error || copy.loadError))
  }, [memberLoading, isMember])

  if (!memberLoading && !isMember) return <Navigate to="/dashboard" replace />

  const header = <MemberPageHeader title="MEMBER" highlight="VOTE" subtitle={copy.subtitle} />
  if (error) {
    return (
      <>
        {header}
        <div className="bg-red-500/10 border border-red-500/20 p-4 flex gap-3 text-red-300 light:text-red-700 text-sm">
          <AlertCircle size={18} /> {error}
        </div>
      </>
    )
  }
  if (!polls) {
    return (
      <>
        {header}
        <div className="flex justify-center py-16">
          <Loader className="w-10 h-10 animate-spin text-cta" />
        </div>
      </>
    )
  }

  const replace = (updated: MemberPoll) => setPolls((list) => list?.map((p) => (p.id === updated.id ? updated : p)) ?? list)
  const open = polls.filter((p) => p.status === 'open')
  const closed = polls.filter((p) => p.status === 'closed')

  return (
    <>
      {header}
      {polls.length === 0 ? (
        <div className={`${dashCard} max-w-xl`}>
          <p className={dashMuted}>{copy.empty}</p>
        </div>
      ) : (
        <div className="space-y-8 max-w-3xl">
          {open.length > 0 && (
            <ul className="space-y-6 list-none p-0 m-0">
              {open.map((poll) => (
                <PollCard key={poll.id} poll={poll} onUpdated={replace} />
              ))}
            </ul>
          )}
          {closed.length > 0 && (
            <section>
              <h2 className={`${dashHeading} mb-4`}>{copy.closedHeading}</h2>
              <ul className="space-y-6 list-none p-0 m-0">
                {closed.map((poll) => (
                  <PollCard key={poll.id} poll={poll} onUpdated={replace} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </>
  )
}
