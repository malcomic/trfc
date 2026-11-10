import { Crown } from 'lucide-react'
import { MEMBERSHIP_COPY } from '../../../content/membership'

/** Gold pill for paid members; founding members get their own label. */
export default function MemberBadge({ founding = false, className = '' }: { founding?: boolean; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-cta text-cta-ink px-3 py-1 font-barlow font-semibold text-xs ${className}`}
    >
      <Crown size={12} aria-hidden="true" />
      {founding ? MEMBERSHIP_COPY.active.founding : MEMBERSHIP_COPY.active.badge}
    </span>
  )
}
