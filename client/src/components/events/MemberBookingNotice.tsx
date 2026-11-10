import { Link } from 'react-router-dom'
import { Crown } from 'lucide-react'
import { MEMBERSHIP_COPY, memberDateTime } from '../../content/membership'

/** Shown while an event is in its members-only booking window. */
export default function MemberBookingNotice({ until, isMember }: { until: string; isMember: boolean }) {
  const date = memberDateTime(until)
  return (
    <div className="flex items-start gap-3 border border-amber-400/40 bg-amber-400/10 px-4 py-3 mb-4">
      <Crown size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
      <div className="text-sm">
        <p>{isMember ? MEMBERSHIP_COPY.early.member(date) : MEMBERSHIP_COPY.early.nonMember(date)}</p>
        {!isMember && (
          <Link
            to="/dashboard/membership"
            className="inline-block mt-1 font-barlow-condensed font-bold uppercase tracking-widest text-xs text-accent light:text-accent-light hover:underline"
          >
            {MEMBERSHIP_COPY.early.join}
          </Link>
        )}
      </div>
    </div>
  )
}
