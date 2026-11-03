import { useState, useEffect, useRef } from 'react'
import { Link, Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { LogOut, ArrowLeft, Menu, X, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  adminNavEntries,
  findActiveGroupId,
  isAdminNavActive,
  isNavGroup,
  type AdminNavGroup,
  type AdminNavLink,
} from './admin/adminNav'

export { isAdminNavActive }

function AdminNavItemLink({
  item,
  pathname,
  onNavigate,
}: {
  item: AdminNavLink
  pathname: string
  onNavigate?: () => void
}) {
  const Icon = item.icon
  const active = isAdminNavActive(pathname, item.path)
  return (
    <Link
      to={item.path}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-lg transition ${
        active
          ? 'bg-primary dark:bg-primary-dark text-white dark:text-black'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      <Icon size={20} />
      <span>{item.label}</span>
    </Link>
  )
}

function AdminNavGroupItem({
  group,
  idPrefix,
  pathname,
  open,
  onToggle,
  onNavigate,
}: {
  group: AdminNavGroup
  idPrefix: string
  pathname: string
  open: boolean
  onToggle: (id: string) => void
  onNavigate?: () => void
}) {
  const Icon = group.icon
  const containsActive = group.children.some((c) => isAdminNavActive(pathname, c.path))
  const listId = `admin-nav-${idPrefix}-${group.id}`
  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(group.id)}
        aria-expanded={open}
        aria-controls={listId}
        className={`w-full flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-lg transition text-left ${
          containsActive
            ? 'bg-gray-100 dark:bg-gray-700/60 font-medium text-gray-900 dark:text-white'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        <Icon size={20} />
        <span className="flex-1">{group.label}</span>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        id={listId}
        className={`grid transition-[grid-template-rows] duration-200 ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
        {...(!open ? { inert: '' } : {})}
      >
        <div className="overflow-hidden">
          <div className="ml-4 pl-3 mt-1 border-l border-gray-200 dark:border-gray-700 space-y-1">
            {group.children.map((item) => (
              <AdminNavItemLink
                key={item.path}
                item={item}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function AdminNavLinks({
  idPrefix,
  pathname,
  openGroups,
  onToggleGroup,
  onNavigate,
}: {
  idPrefix: string
  pathname: string
  openGroups: Set<string>
  onToggleGroup: (id: string) => void
  onNavigate?: () => void
}) {
  return (
    <>
      {adminNavEntries.map((entry) =>
        isNavGroup(entry) ? (
          <AdminNavGroupItem
            key={entry.id}
            group={entry}
            idPrefix={idPrefix}
            pathname={pathname}
            open={openGroups.has(entry.id)}
            onToggle={onToggleGroup}
            onNavigate={onNavigate}
          />
        ) : (
          <AdminNavItemLink
            key={entry.path}
            item={entry}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        )
      )}
    </>
  )
}

function AdminSidebarFooter({
  onNavigate,
  onLogout,
}: {
  onNavigate?: () => void
  onLogout: () => void
}) {
  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
      <Link
        to="/"
        onClick={onNavigate}
        className="flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
      >
        <ArrowLeft size={20} />
        <span>Back to site</span>
      </Link>
      <button
        type="button"
        onClick={() => {
          onNavigate?.()
          onLogout()
        }}
        className="w-full flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
      >
        <LogOut size={20} />
        <span>Logout</span>
      </button>
    </div>
  )
}

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const navigationType = useNavigationType()
  const [navOpen, setNavOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const active = findActiveGroupId(location.pathname)
    return new Set(active ? [active] : [])
  })
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    setNavOpen(false)
    const active = findActiveGroupId(location.pathname)
    if (active) {
      setOpenGroups((prev) => (prev.has(active) ? prev : new Set(prev).add(active)))
    }
  }, [location.pathname])

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  useEffect(() => {
    if (navigationType !== 'POP') mainRef.current?.scrollTo({ top: 0 })
  }, [location.pathname, navigationType])

  useEffect(() => {
    document.body.style.overflow = navOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [navOpen])

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  const closeNav = () => setNavOpen(false)

  const sidebarContent = (
    <>
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-primary dark:text-primary-dark">TRFC Admin</h1>
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <AdminNavLinks
          idPrefix="desktop"
          pathname={location.pathname}
          openGroups={openGroups}
          onToggleGroup={toggleGroup}
          onNavigate={closeNav}
        />
      </nav>
      <AdminSidebarFooter onNavigate={closeNav} onLogout={handleLogout} />
    </>
  )

  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-900">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-lg dark:shadow-xl shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-50 lg:hidden ${navOpen ? '' : 'pointer-events-none'}`}
        {...(!navOpen ? { inert: '' } : {})}
      >
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
            navOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0'
          }`}
          onClick={closeNav}
        />
        <aside
          className={`absolute top-0 left-0 bottom-0 w-[min(280px,85vw)] flex flex-col bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xl transform transition-transform duration-300 pointer-events-auto ${
            navOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-bold text-primary dark:text-primary-dark">TRFC Admin</h1>
            <button
              type="button"
              onClick={closeNav}
              className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close menu"
            >
              <X size={22} />
            </button>
          </div>
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <AdminNavLinks
              idPrefix="mobile"
              pathname={location.pathname}
              openGroups={openGroups}
              onToggleGroup={toggleGroup}
              onNavigate={closeNav}
            />
          </nav>
          <AdminSidebarFooter onNavigate={closeNav} onLogout={handleLogout} />
        </aside>
      </div>

      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-40 flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-lg font-bold text-primary dark:text-primary-dark truncate">TRFC Admin</h1>
        </header>

        <main ref={mainRef} className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
