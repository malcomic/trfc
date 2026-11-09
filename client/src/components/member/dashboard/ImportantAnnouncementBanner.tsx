import { Megaphone, X } from 'lucide-react'
import { useMemberDashboard } from '../../../context/MemberDashboardContext'
import { DASHBOARD_COPY } from '../../../content/dashboard'
import AnnouncementBody from '../../announcements/AnnouncementBody'

const copy = DASHBOARD_COPY.notifications

/** The newest unread important notice, until the member dismisses it. */
export default function ImportantAnnouncementBanner() {
  const { announcements, markAnnouncementsRead } = useMemberDashboard()
  const notice = announcements?.find((a) => a.kind === 'important' && !a.read)
  if (!notice) return null

  return (
    <div role="status" className="relative bg-cta/10 border border-cta/30 border-l-4 border-l-cta p-5 pr-14">
      <div className="flex items-center gap-2 font-barlow-condensed font-bold text-xs tracking-widest uppercase text-cta">
        <Megaphone size={16} aria-hidden="true" /> {copy.important}
      </div>
      <h2 className="mt-1 font-barlow font-semibold text-lg text-chalk light:text-chalk-light break-words">{notice.title}</h2>
      <AnnouncementBody
        body={notice.body}
        linkUrl={notice.link_url}
        linkLabel={notice.link_label}
        className="mt-2 text-sm text-fog light:text-fog-light"
        linkClassName="inline-flex items-center gap-1.5 font-barlow font-semibold text-chalk light:text-chalk-light underline underline-offset-4 hover:text-cta"
      />
      <button
        type="button"
        onClick={() => markAnnouncementsRead([notice.id])}
        aria-label={copy.dismiss}
        className="absolute top-3 right-3 w-11 h-11 flex items-center justify-center text-fog light:text-fog-light hover:text-chalk light:hover:text-chalk-light"
      >
        <X size={18} />
      </button>
    </div>
  )
}
