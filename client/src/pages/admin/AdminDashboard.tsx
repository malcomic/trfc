import { useState, useEffect } from 'react'
import { Users, Calendar, Package, ShoppingCart } from 'lucide-react'
import { getEventsForAdmin } from '../../api/admin/events'
import { getProductsForAdmin } from '../../api/admin/products'
import api from '../../api/index'

interface StatCard {
  label: string
  value: number | string
  icon: React.ReactNode
  color: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const [events, products, orders, users] = await Promise.all([
          getEventsForAdmin(),
          getProductsForAdmin(),
          api.get('/orders'),
          api.get('/users'),
        ])

        setStats([
          {
            label: 'Total Events',
            value: Array.isArray(events) ? events.length : 0,
            icon: <Calendar className="w-8 h-8" />,
            color: 'bg-blue-500',
          },
          {
            label: 'Total Products',
            value: Array.isArray(products) ? products.length : 0,
            icon: <Package className="w-8 h-8" />,
            color: 'bg-green-500',
          },
          {
            label: 'Total Orders',
            value: Array.isArray(orders.data) ? orders.data.length : 0,
            icon: <ShoppingCart className="w-8 h-8" />,
            color: 'bg-purple-500',
          },
          {
            label: 'Total Users',
            value: Array.isArray(users.data) ? users.data.length : 0,
            icon: <Users className="w-8 h-8" />,
            color: 'bg-orange-500',
          },
        ])
      } catch (err: any) {
        console.error('Failed to fetch stats:', err)
        setError('Failed to load dashboard statistics')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8 text-gray-800 dark:text-white">Admin Dashboard</h1>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{stat.label}</p>
                <p className="text-4xl font-bold text-gray-800 dark:text-white mt-2">{stat.value}</p>
              </div>
              <div className={`${stat.color} text-white p-3 rounded-lg opacity-80`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a href="/admin/events" className="block p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition">
            <p className="font-semibold text-blue-900 dark:text-blue-300">Manage Events</p>
            <p className="text-sm text-blue-700 dark:text-blue-400">Create, edit, or delete events</p>
          </a>
          <a href="/admin/products" className="block p-4 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-lg transition">
            <p className="font-semibold text-green-900 dark:text-green-300">Manage Products</p>
            <p className="text-sm text-green-700 dark:text-green-400">Create, edit, or delete products</p>
          </a>
          <a href="/admin/gallery" className="block p-4 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-lg transition">
            <p className="font-semibold text-purple-900 dark:text-purple-300">Manage Gallery</p>
            <p className="text-sm text-purple-700 dark:text-purple-400">Upload and manage media</p>
          </a>
          <a href="/admin/orders" className="block p-4 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/40 rounded-lg transition">
            <p className="font-semibold text-orange-900 dark:text-orange-300">View Orders</p>
            <p className="text-sm text-orange-700 dark:text-orange-400">Track and manage orders</p>
          </a>
        </div>
      </div>
    </div>
  )
}
