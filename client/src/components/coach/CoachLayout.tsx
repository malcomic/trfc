import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { ArrowLeft, LogOut, Menu, X } from 'lucide-react'
import { getCoachInboxUnreadCount } from '../../api/coaches'
import { useAuth } from '../../context/AuthContext'
import { pageRoot } from '../../utils/themeClasses'
import { Logo } from '../Logo'
import { ThemeToggle } from '../ThemeToggle'
import { coachNavItems, isCoachNavActive } from './coachNav'

const linkBase =
  'flex items-center gap-3 px-4 py-3 min-h-[44px] font-barlow-condensed font-bold text-sm tracking-widest uppercase no-underline transition-colors'
const linkIdle =
  'text-fog light:text-fog-light hover:text-chalk light:hover:text-chalk-light hover:bg-white/5 light:hover:bg-black/5'
const linkActive = 'bg-cta text-cta-ink'

function SidebarContent({
  onNavigate,
  onLogout,
  inboxUnread,
}: {
  onNavigate: () => void
  onLogout: () => void
  inboxUnread: number
}) {
  const { pathname } = useLocation()
  const { user } = useAuth()

  return (
    <>
      <div className="p-5 border-b border-white/5 light:border-black/8 space-y-3">
        <Logo size="sm" linkToHome onClick={onNavigate} />
        <div>
          <p className="m-0 font-barlow-condensed font-bold text-[11px] tracking-widest uppercase text-accent light:text-accent-light">
            Coach workspace
          </p>
          {user?.name && (
            <p className="m-0 mt-1 font-barlow font-semibold text-chalk light:text-chalk-light truncate">{user.name}</p>
          )}
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {coachNavItems.map((item) => {
          const Icon = item.icon
          const active = isCoachNavActive(pathname, item.path)
          const showBadge = item.path === '/dashboard/coach/inbox' && inboxUnread > 0
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`${linkBase} ${active ? linkActive : linkIdle}`}
            >
              <Icon size={18} />
              <span className="flex-1">{item.label}</span>
              {showBadge && (
                <span className="min-w-[1.25rem] px-1.5 py-0.5 text-center text-[10px] font-bold rounded-sm bg-accent text-ink">
                  {inboxUnread > 99 ? '99+' : inboxUnread}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-white/5 light:border-black/8 space-y-1">
        <Link to="/" onClick={onNavigate} className={`${linkBase} ${linkIdle}`}>
          <ArrowLeft size={18} /> <span>Back to site</span>
        </Link>
        <div className="flex items-center gap-2 pt-1">
          <ThemeToggle />
          <button type="button" onClick={onLogout} className={`${linkBase} ${linkIdle} flex-1`}>
            <LogOut size={18} /> <span>Sign out</span>
          </button>
        </div>
      </div>
    </>
  )
}

export default function CoachLayout() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const navigationType = useNavigationType()
  const { logout } = useAuth()
  const [navOpen, setNavOpen] = useState(false)
  const [inboxUnread, setInboxUnread] = useState(0)
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (navigationType !== 'POP') {
      mainRef.current?.scrollTo({ top: 0 })
      window.scrollTo({ top: 0 })
    }
  }, [location.pathname, navigationType])

  useEffect(() => {
    document.body.style.overflow = navOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [navOpen])

  useEffect(() => {
    let cancelled = false
    const load = () => {
      getCoachInboxUnreadCount()
        .then((count) => !cancelled && setInboxUnread(count))
        .catch(() => !cancelled && setInboxUnread(0))
    }
    load()
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.removeEventListener('focus', onFocus)
    }
  }, [location.pathname])

  if (user && user.role !== 'coach') {
    return <Navigate to="/dashboard" replace />
  }

  const closeNav = () => setNavOpen(false)
  const handleLogout = () => {
    closeNav()
    logout()
    navigate('/login')
  }

  return (
    <div className={`${pageRoot} flex`}>
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-ink light:bg-ink-light border-r border-white/5 light:border-black/8 sticky top-0 h-screen">
        <SidebarContent onNavigate={closeNav} onLogout={handleLogout} inboxUnread={inboxUnread} />
      </aside>

      <div className={`fixed inset-0 z-50 lg:hidden ${navOpen ? '' : 'pointer-events-none'}`} {...(!navOpen ? { inert: '' } : {})}>
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
            navOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0'
          }`}
          onClick={closeNav}
        />
        <aside
          className={`absolute top-0 left-0 bottom-0 w-[min(280px,85vw)] flex flex-col bg-ink light:bg-ink-light shadow-2xl transform transition-transform duration-300 pointer-events-auto ${
            navOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <button
            type="button"
            onClick={closeNav}
            className="absolute top-3 right-3 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-fog light:text-fog-light"
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
          <SidebarContent onNavigate={closeNav} onLogout={handleLogout} inboxUnread={inboxUnread} />
        </aside>
      </div>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-40 flex items-center gap-3 px-4 py-2 bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-chalk light:text-chalk-light"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <span className="font-bebas text-2xl text-chalk light:text-chalk-light">
            COACH <span className="text-accent light:text-accent-light">WORKSPACE</span>
          </span>
        </header>

        <main ref={mainRef} className="flex-1 min-w-0">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-10 pb-20">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
