import { Link } from 'react-router-dom'
import { Bell, PlayCircle } from 'lucide-react'
import type { MemberMembership } from '../../../api/users'
import { DASHBOARD_COPY, firstName, greetingFor } from '../../../content/dashboard'
import { formatDate } from '../../../utils/captainDisplay'

const copy = DASHBOARD_COPY.header

interface DashboardGreetingProps {
  name: string
  membership: MemberMembership
  /** Shown as a "Watch the welcome video" button when a welcome video is set. */
  onWatchWelcome?: () => void
}

export default function DashboardGreeting({ name, membership, onWatchWelcome }: DashboardGreetingProps) {
  const first = firstName(name)
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
      <div className="min-w-0">
        <h1 className="font-bebas text-4xl md:text-5xl tracking-wide leading-none text-chalk light:text-chalk-light">
          {greetingFor()}
          {first ? `, ${first}` : ''}
        </h1>
        <p className="mt-2 text-fog light:text-fog-light">{copy.subtitle}</p>
        {onWatchWelcome && (
          <button
            type="button"
            onClick={onWatchWelcome}
            className="mt-2 inline-flex items-center gap-2 min-h-[44px] font-barlow font-semibold text-sm text-chalk light:text-chalk-light underline underline-offset-4 hover:text-cta"
          >
            <PlayCircle size={18} aria-hidden="true" />
            {DASHBOARD_COPY.welcomeVideo.replay}
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        {membership.active ? (
          <span className="rounded-full bg-cta text-cta-ink px-4 py-1.5 font-barlow font-semibold text-sm">
            {copy.memberPill(membership.until ? formatDate(membership.until) : '')}
          </span>
        ) : (
          <span className="rounded-full bg-smoke light:bg-smoke-light text-chalk light:text-chalk-light px-4 py-1.5 font-barlow font-semibold text-sm">
            {copy.freePill}
          </span>
        )}
        <Link
          to="/dashboard/calendar"
          aria-label={copy.reminders}
          className="w-11 h-11 rounded-full flex items-center justify-center bg-ash light:bg-ash-light border border-white/5 light:border-black/8 text-chalk light:text-chalk-light hover:border-cta"
        >
          <Bell size={18} />
        </Link>
      </div>
    </div>
  )
}
