import { useState, useEffect } from 'react'
import { Loader, AlertCircle } from 'lucide-react'
import { getEquipmentStats } from '../../api/analytics'

interface EquipmentStat {
  name: string
  rentals: number
  revenue: number
  avgDurationDays: number
}

export default function AdminEquipment() {
  const [stats, setStats] = useState<EquipmentStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await getEquipmentStats()
      setStats(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError('Failed to load equipment statistics')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const totalRentals = stats.reduce((sum, s) => sum + s.rentals, 0)
  const totalRevenue = stats.reduce((sum, s) => sum + s.revenue, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 flex gap-3">
        <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" />
        <div>
          <p className="text-red-700 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchStats}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8 text-gray-800 dark:text-white">Equipment</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-6">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Rentals</p>
          <p className="text-4xl font-bold text-gray-800 dark:text-white mt-2">{totalRentals}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-6">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Revenue</p>
          <p className="text-4xl font-bold text-primary dark:text-primary-dark mt-2">
            KES {totalRevenue.toLocaleString()}
          </p>
        </div>
      </div>

      {stats.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 text-lg">No equipment hire data yet</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Equipment</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Rentals</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Revenue</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Avg Duration (days)</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((item) => (
                <tr
                  key={item.name}
                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                >
                  <td className="px-6 py-4 font-semibold">{item.name}</td>
                  <td className="px-6 py-4">{item.rentals}</td>
                  <td className="px-6 py-4">KES {item.revenue.toLocaleString()}</td>
                  <td className="px-6 py-4">{item.avgDurationDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
