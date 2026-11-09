import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, Loader } from 'lucide-react'
import { cardSurface } from '../../utils/themeClasses'
import { useMemberDashboard } from '../../context/MemberDashboardContext'
import MemberPageHeader from '../../components/member/MemberPageHeader'
import AnnouncementBody from '../../components/announcements/AnnouncementBody'
import { DASHBOARD_COPY } from '../../content/dashboard'
import { formatAnnouncementDate } from '../../utils/announcements'

const copy = DASHBOARD_COPY.notifications

export default function MemberNotifications() {
  const { announcements, unreadAnnouncements, markAnnouncementsRead } = useMemberDashboard()
  const location = useLocation()
  const focusId = (location.state as { focus?: string } | null)?.focus

  useEffect(() => {
    if (!focusId || !announcements) return
    document.getElementById(`announcement-${focusId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focusId, announcements])

  return (
    <>
      <MemberPageHeader
        title={copy.title.toUpperCase()}
        subtitle={copy.subtitle}
        actions={
          unreadAnnouncements > 0 && (
            <button
              type="button"
              onClick={() => markAnnouncementsRead()}
              className="bg-cta text-cta-ink px-4 py-2.5 min-h-[44px] font-barlow-condensed font-black text-xs tracking-widest uppercase clip-angled hover:bg-cta/90"
            >
              {copy.markAllRead}
            </button>
          )
        }
      />

      {announcements === null ? (
        <div className="flex justify-center py-10">
          <Loader className="w-8 h-8 animate-spin text-accent light:text-accent-light" />
        </div>
      ) : announcements.length === 0 ? (
        <div className={`${cardSurface} p-12 text-center`}>
          <Bell className="w-14 h-14 text-accent/20 light:text-accent-light/20 mx-auto mb-4" />
          <p className="text-sm text-fog light:text-fog-light">{copy.empty}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {announcements.map((item) => (
            <li
              key={item.id}
              id={`announcement-${item.id}`}
              className={`${cardSurface} p-5 scroll-mt-24 ${item.read ? '' : 'border-l-4 border-l-cta'}`}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs font-barlow-condensed font-bold tracking-widest uppercase">
                <span
                  className={
                    item.kind === 'important'
                      ? 'px-2 py-0.5 bg-cta text-cta-ink'
                      : 'px-2 py-0.5 bg-smoke light:bg-smoke-light text-fog light:text-fog-light'
                  }
                >
                  {item.kind === 'important' ? copy.important : copy.news}
                </span>
                <span className="text-fog light:text-fog-light">{formatAnnouncementDate(item.published_at)}</span>
                {!item.read && <span className="text-cta">{copy.unread}</span>}
              </div>
              <h2 className="mt-2 font-barlow font-semibold text-lg text-chalk light:text-chalk-light break-words">
                {item.title}
              </h2>
              <AnnouncementBody
                body={item.body}
                linkUrl={item.link_url}
                linkLabel={item.link_label}
                className="mt-2 text-sm text-fog light:text-fog-light"
                linkClassName="inline-flex items-center gap-1.5 font-barlow font-semibold text-chalk light:text-chalk-light underline underline-offset-4 hover:text-cta"
              />
              {!item.read && (
                <button
                  type="button"
                  onClick={() => markAnnouncementsRead([item.id])}
                  className="mt-3 min-h-[44px] font-barlow text-xs font-semibold text-fog light:text-fog-light hover:text-cta"
                >
                  {copy.markRead}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
