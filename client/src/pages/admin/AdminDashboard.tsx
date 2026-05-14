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
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8 text-gray-800">Admin Dashboard</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                <p className="text-4xl font-bold text-gray-800 mt-2">{stat.value}</p>
              </div>
              <div className={`${stat.color} text-white p-3 rounded-lg opacity-80`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a href="/admin/events" className="block p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition">
            <p className="font-semibold text-blue-900">Manage Events</p>
            <p className="text-sm text-blue-700">Create, edit, or delete events</p>
          </a>
          <a href="/admin/products" className="block p-4 bg-green-50 hover:bg-green-100 rounded-lg transition">
            <p className="font-semibold text-green-900">Manage Products</p>
            <p className="text-sm text-green-700">Create, edit, or delete products</p>
          </a>
          <a href="/admin/gallery" className="block p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition">
            <p className="font-semibold text-purple-900">Manage Gallery</p>
            <p className="text-sm text-purple-700">Upload and manage media</p>
          </a>
          <a href="/admin/orders" className="block p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition">
            <p className="font-semibold text-orange-900">View Orders</p>
            <p className="text-sm text-orange-700">Track and manage orders</p>
          </a>
        </div>
      </div>
    </div>
  )
}
