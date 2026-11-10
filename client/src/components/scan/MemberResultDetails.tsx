import { Crown } from 'lucide-react'
import type { MemberCheckinResult } from '../../api/checkins'

function formatWhen(value: string | null | undefined) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

/** The name is large so the person scanning can check it against whoever is holding the phone. */
export default function MemberResultDetails({ result }: { result: MemberCheckinResult }) {
  if (!result.member) {
    return <p className="text-gray-300">No member has this code. Ask them to open their TRFC pass again.</p>
  }
  return (
    <>
      <p className="text-3xl font-black leading-tight">{result.member.name || 'Member'}</p>
      {result.member.paidMember && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 text-gray-900 px-3 py-1 text-sm font-bold">
          <Crown size={14} aria-hidden="true" /> Member
        </span>
      )}
      <p className="text-gray-300">{result.member.zone ? `${result.member.zone} zone` : 'No zone yet'}</p>
      {result.status === 'wrong_zone' && (
        <p className="text-red-300">This event is not in your zone, so you cannot check members in here.</p>
      )}
      {result.status === 'already_checked_in' && result.checkedInAt && (
        <p className="text-amber-300">Checked in {formatWhen(result.checkedInAt)}</p>
      )}
      {result.ticketCheckedIn && <p className="text-emerald-300">Their paid ticket was checked in too.</p>}
    </>
  )
}
