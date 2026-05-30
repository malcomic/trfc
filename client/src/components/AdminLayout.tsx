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
  LogOut,
  ArrowLeft,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export function isAdminNavActive(pathname: string, path: string) {
  if (path === '/admin') {
    return pathname === '/admin'
  }
  return pathname === path || pathname.startsWith(path + '/')
}

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()

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
  ]

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-900">
      <aside className="w-64 flex flex-col bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-lg dark:shadow-xl">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-primary dark:text-primary-dark">TRFC Admin</h1>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isAdminNavActive(location.pathname, item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  active
                    ? 'bg-primary dark:bg-primary-dark text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <ArrowLeft size={20} />
            <span>Back to site</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
