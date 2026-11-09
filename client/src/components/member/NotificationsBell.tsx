import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { DASHBOARD_COPY } from '../../content/dashboard'
import { useMemberDashboard } from '../../context/MemberDashboardContext'
import { formatAnnouncementDate, unreadBadgeLabel } from '../../utils/announcements'

const copy = DASHBOARD_COPY.notifications
const PREVIEW_COUNT = 5
const NOTIFICATIONS_PATH = '/dashboard/notifications'

const buttonClass =
  'relative w-11 h-11 rounded-full flex items-center justify-center bg-ash light:bg-ash-light border border-white/5 light:border-black/8 text-chalk light:text-chalk-light hover:border-cta'

function Badge({ count }: { count: number }) {
  const label = unreadBadgeLabel(count)
  if (!label) return null
  return (
    <span
      aria-hidden="true"
      className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-cta text-cta-ink font-barlow font-bold text-[11px] leading-5 text-center"
    >
      {label}
    </span>
  )
}

/** Desktop opens a short dropdown; on small screens the bell goes straight to the notifications page. */
export default function NotificationsBell() {
  const { announcements, unreadAnnouncements, markAnnouncementsRead } = useMemberDashboard()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const label = copy.bell(unreadAnnouncements)
  const latest = (announcements ?? []).slice(0, PREVIEW_COUNT)

  const openItem = (id: string) => {
    markAnnouncementsRead([id])
    setOpen(false)
    navigate(NOTIFICATIONS_PATH, { state: { focus: id } })
  }

  return (
    <div ref={wrapperRef} className="relative">
      <Link to={NOTIFICATIONS_PATH} aria-label={label} className={`${buttonClass} md:hidden`}>
        <Bell size={18} />
        <Badge count={unreadAnnouncements} />
      </Link>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className={`${buttonClass} hidden md:flex`}
      >
        <Bell size={18} />
        <Badge count={unreadAnnouncements} />
      </button>

      {open && (
        <div className="hidden md:block absolute right-0 top-full mt-2 w-80 z-40 bg-ash light:bg-ash-light border border-white/10 light:border-black/10 shadow-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 light:border-black/8">
            <span className="font-barlow font-semibold text-chalk light:text-chalk-light">{copy.title}</span>
            {unreadAnnouncements > 0 && (
              <button
                type="button"
                onClick={() => markAnnouncementsRead()}
                className="font-barlow text-xs font-semibold text-fog light:text-fog-light hover:text-cta"
              >
                {copy.markAllRead}
              </button>
            )}
          </div>
          {latest.length === 0 ? (
            <p className="px-4 py-6 text-sm text-fog light:text-fog-light">{copy.empty}</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {latest.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openItem(item.id)}
                    className="w-full text-left px-4 py-3 border-b border-white/5 light:border-black/8 hover:bg-white/5 light:hover:bg-black/5"
                  >
                    <span className="flex items-center gap-2 text-xs text-fog light:text-fog-light">
                      {!item.read && <span className="w-2 h-2 rounded-full bg-cta" aria-label={copy.unread} />}
                      {item.kind === 'important' ? copy.important : copy.news} · {formatAnnouncementDate(item.published_at)}
                    </span>
                    <span
                      className={`block mt-1 text-sm text-chalk light:text-chalk-light break-words ${item.read ? '' : 'font-semibold'}`}
                    >
                      {item.title}
                    </span>
                    <span className="block mt-0.5 text-xs text-fog light:text-fog-light line-clamp-2 break-words">
                      {item.body}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Link
            to={NOTIFICATIONS_PATH}
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-center font-barlow text-sm font-semibold text-chalk light:text-chalk-light hover:text-cta"
          >
            {copy.seeAll}
          </Link>
        </div>
      )}
    </div>
  )
}
