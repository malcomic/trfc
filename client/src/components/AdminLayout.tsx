import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Calendar, Package, Image, ShoppingCart, Users } from 'lucide-react'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation()

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/events', label: 'Events', icon: Calendar },
    { path: '/admin/products', label: 'Products', icon: Package },
    { path: '/admin/gallery', label: 'Gallery', icon: Image },
    { path: '/admin/orders', label: 'Orders', icon: ShoppingCart },
    { path: '/admin/users', label: 'Users', icon: Users },
  ]

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-dark text-white shadow-lg">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-primary">TRFC Admin</h1>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  active
                    ? 'bg-primary text-white'
                    : 'text-gray-300 hover:bg-dark-200'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
