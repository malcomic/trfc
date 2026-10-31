import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarSearch,
  Globe,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  QrCode,
  WalletCards,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { MemberDashboardProvider, useMemberDashboard } from '../../context/MemberDashboardContext'
import { pageRoot } from '../../utils/themeClasses'
import { formatKes } from '../../utils/captainDisplay'
import { DASHBOARD_COPY, initials, supportLink } from '../../content/dashboard'
import { Logo } from '../Logo'
import { ThemeToggle } from '../ThemeToggle'

import { isMemberNavActive, memberNavItems, type MemberNavItem } from './memberNav'

const linkBase =
  'flex items-center gap-3 px-4 py-3 min-h-[44px] font-barlow-condensed font-bold text-sm tracking-widest uppercase no-underline transition-colors'
const linkIdle =
  'text-fog light:text-fog-light hover:text-chalk light:hover:text-chalk-light hover:bg-white/5 light:hover:bg-black/5'
const linkActive = 'bg-cta text-cta-ink'
const linkDisabled = 'text-mist light:text-mist-light cursor-not-allowed'

function NavEntry({ item, pathname, onNavigate }: { item: MemberNavItem; pathname: string; onNavigate: () => void }) {
  const Icon = item.icon
  if (item.disabled) {
    return (
      <div aria-disabled="true" className={`${linkBase} ${linkDisabled}`}>
        <Icon size={18} />
        <span>{item.label}</span>
        {item.badge && (
          <span className="ml-auto rounded-full bg-cta text-cta-ink px-2 py-0.5 font-barlow text-[11px] font-semibold normal-case tracking-normal">
            {item.badge}
          </span>
        )}
      </div>
    )
  }
  if (item.external) {
    return (
      <a href={item.path} target="_blank" rel="noopener noreferrer" onClick={onNavigate} className={`${linkBase} ${linkIdle}`}>
        <Icon size={18} />
        <span>{item.label}</span>
      </a>
    )
  }
  const active = isMemberNavActive(pathname, item.path)
  return (
    <Link
      to={item.path}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={`${linkBase} ${active ? linkActive : linkIdle}`}
    >
      <Icon size={18} />
      <span>{item.label}</span>
    </Link>
  )
}

function SidebarContent({ onNavigate, onLogout }: { onNavigate: () => void; onLogout: () => void }) {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const { data, ticketValue, isMember } = useMemberDashboard()
  const name = data?.profile.name ?? user?.name
  const navCopy = DASHBOARD_COPY.nav

  return (
    <>
      <div className="p-5 border-b border-white/5 light:border-black/8 space-y-3">
        <Logo size="sm" linkToHome onClick={onNavigate} />
        {data?.captain && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent/15 light:bg-accent-light/15 border border-accent/30 light:border-accent-light/30 text-accent light:text-accent-light font-barlow-condensed font-bold text-[11px] tracking-widest uppercase">
            <MapPin size={11} /> {data.captain.name} · {data.captain.zone}
          </span>
        )}
        <Link
          to="/dashboard/wallet"
          onClick={onNavigate}
          className="flex items-center justify-between gap-2 px-3 py-2 bg-white/5 light:bg-black/5 no-underline text-chalk light:text-chalk-light hover:bg-white/10 light:hover:bg-black/10"
        >
          <span className="inline-flex items-center gap-2 text-xs font-barlow-condensed font-bold tracking-widest uppercase text-fog light:text-fog-light">
            <WalletCards size={14} /> Ticket value
          </span>
          <span className="font-bebas text-lg text-accent light:text-accent-light">{formatKes(ticketValue)}</span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {memberNavItems(user?.role, isMember, supportLink(data?.captain)).map((item) => (
          <NavEntry key={item.label} item={item} pathname={pathname} onNavigate={onNavigate} />
        ))}
        <div className="px-4 pt-5 pb-1 font-barlow text-xs tracking-[2px] uppercase text-mist light:text-fog-light">
          {navCopy.explore}
        </div>
        <NavEntry
          item={{ path: '/programs', label: navCopy.browsePrograms, icon: Globe }}
          pathname={pathname}
          onNavigate={onNavigate}
        />
        <NavEntry
          item={{ path: '/events', label: 'Browse events', icon: CalendarSearch }}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      </nav>

      <div className="p-3 border-t border-white/5 light:border-black/8 space-y-1">
        {user?.role === 'admin' && (
          <Link to="/admin" onClick={onNavigate} className={`${linkBase} ${linkIdle}`}>
            <LayoutDashboard size={18} /> <span>Admin dashboard</span>
          </Link>
        )}
        {(user?.role === 'admin' || user?.role === 'scanner') && (
          <Link to="/admin/scan" onClick={onNavigate} className={`${linkBase} ${linkIdle}`}>
            <QrCode size={18} /> <span>Scanner</span>
          </Link>
        )}
        <Link to="/" onClick={onNavigate} className={`${linkBase} ${linkIdle}`}>
          <ArrowLeft size={18} /> <span>Back to site</span>
        </Link>
        {name && (
          <div className="flex items-center gap-3 px-2 pt-3 mt-2 border-t border-white/5 light:border-black/8">
            <div
              aria-hidden="true"
              className="w-10 h-10 shrink-0 rounded-full bg-cta text-cta-ink font-barlow font-semibold flex items-center justify-center"
            >
              {initials(name)}
            </div>
            <div className="min-w-0">
              <div className="font-barlow font-semibold leading-tight text-chalk light:text-chalk-light truncate">{name}</div>
              <div className="text-sm text-fog light:text-fog-light">{isMember ? navCopy.member : navCopy.freeMember}</div>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 pt-1">
          <ThemeToggle />
          <button type="button" onClick={onLogout} className={`${linkBase} ${linkIdle} flex-1`}>
            <LogOut size={18} /> <span>{navCopy.signOut}</span>
          </button>
        </div>
      </div>
    </>
  )
}

function MemberShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const navigationType = useNavigationType()
  const { logout } = useAuth()
  const [navOpen, setNavOpen] = useState(false)
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

  const closeNav = () => setNavOpen(false)
  const handleLogout = () => {
    closeNav()
    logout()
    navigate('/login')
  }

  return (
    <div className={`${pageRoot} flex`}>
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-ink light:bg-ink-light border-r border-white/5 light:border-black/8 sticky top-0 h-screen">
        <SidebarContent onNavigate={closeNav} onLogout={handleLogout} />
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
            className="absolute top-3 right-3 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-fog light:text-fog-light hover:text-chalk light:hover:text-chalk-light"
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
          <SidebarContent onNavigate={closeNav} onLogout={handleLogout} />
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
            MY <span className="text-accent light:text-accent-light">DASHBOARD</span>
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

export default function MemberLayout() {
  return (
    <MemberDashboardProvider>
      <MemberShell />
    </MemberDashboardProvider>
  )
}
