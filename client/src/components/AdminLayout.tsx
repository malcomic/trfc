import { useState, useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Calendar,
  Package,
  Image,
  ShoppingCart,
  Users,
  BarChart3,
  FileText,
  MessageSquare,
  Wrench,
  Ticket,
  Handshake,
  Layers,
  LogOut,
  ArrowLeft,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export function isAdminNavActive(pathname: string, path: string) {
  if (path === '/admin') {
    return pathname === '/admin'
  }
  return pathname === path || pathname.startsWith(path + '/')
}

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/admin/reports', label: 'Reports', icon: FileText },
  { path: '/admin/events', label: 'Events', icon: Calendar },
  { path: '/admin/products', label: 'Products', icon: Package },
  { path: '/admin/gallery', label: 'Gallery', icon: Image },
  { path: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/testimonials', label: 'Testimonials', icon: MessageSquare },
  { path: '/admin/equipment', label: 'Equipment', icon: Wrench },
  { path: '/admin/tickets', label: 'Tickets', icon: Ticket },
  { path: '/admin/partnerships', label: 'Partnerships', icon: Handshake },
  { path: '/admin/sponsorship-tiers', label: 'Sponsorship Tiers', icon: Layers },
]

function AdminNavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string
  onNavigate?: () => void
}) {
  return (
    <>
      {navItems.map((item) => {
        const Icon = item.icon
        const active = isAdminNavActive(pathname, item.path)
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavigate}
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
      })}
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
  const [navOpen, setNavOpen] = useState(false)

  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

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
        <AdminNavLinks pathname={location.pathname} onNavigate={closeNav} />
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
        aria-hidden={!navOpen}
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
            <AdminNavLinks pathname={location.pathname} onNavigate={closeNav} />
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

        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
