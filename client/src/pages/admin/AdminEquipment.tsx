import { useState, useEffect } from 'react'
import { Loader, AlertCircle, Wrench } from 'lucide-react'
import { getEquipmentStats } from '../../api/analytics'
import { getEquipmentHireForAdmin, AdminEquipmentHire } from '../../api/admin/equipment'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminMobileCard, { AdminMobileCardRow } from '../../components/admin/AdminMobileCard'
import AdminResponsiveData from '../../components/admin/AdminResponsiveData'

interface EquipmentStat {
  name: string
  rentals: number
  revenue: number
  avgDurationDays: number
}

export default function AdminEquipment() {
  const [stats, setStats] = useState<EquipmentStat[]>([])
  const [hires, setHires] = useState<AdminEquipmentHire[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [statusFilter])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')
      const [statsData, hireData] = await Promise.all([
        getEquipmentStats(),
        getEquipmentHireForAdmin(statusFilter),
      ])
      setStats(Array.isArray(statsData) ? statsData : [])
      setHires(Array.isArray(hireData) ? hireData : [])
    } catch (err) {
      setError('Failed to load equipment data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const totalRentals = stats.reduce((sum, s) => sum + s.rentals, 0)
  const totalRevenue = stats.reduce((sum, s) => sum + s.revenue, 0)

  const statusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-600 dark:text-green-400'
      case 'failed':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-yellow-600 dark:text-yellow-400'
    }
  }

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
            onClick={fetchData}
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
      <AdminPageHeader
        title="Equipment"
        actions={<Wrench size={28} className="text-primary dark:text-primary-dark hidden sm:block" />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-6">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Rentals</p>
          <p className="text-2xl sm:text-4xl font-bold text-gray-800 dark:text-white mt-2">{totalRentals}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg p-6">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Revenue</p>
          <p className="text-2xl sm:text-4xl font-bold text-primary dark:text-primary-dark mt-2">
            KES {totalRevenue.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-2">
        <label htmlFor="status-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Filter by payment status
        </label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 min-h-[44px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800 dark:text-white">Hire Records</h2>

      <div className="mb-8">
        <AdminResponsiveData
          isEmpty={hires.length === 0}
          empty={
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-600 dark:text-gray-400 text-lg">No equipment hire records</p>
            </div>
          }
          desktop={
            <table className="w-full min-w-[640px]">
              <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Equipment</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Phone</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Hire Period</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Total</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Payment</th>
                </tr>
              </thead>
              <tbody>
                {hires.map((h) => (
                  <tr
                    key={h.id}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                  >
                    <td className="px-6 py-4 font-semibold">{h.equipment_name}</td>
                    <td className="px-6 py-4">{h.phone || '—'}</td>
                    <td className="px-6 py-4 text-sm">
                      {new Date(h.hire_date).toLocaleDateString()} – {new Date(h.return_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">KES {Number(h.total_cost).toLocaleString()}</td>
                    <td className={`px-6 py-4 capitalize font-medium ${statusColor(h.payment_status)}`}>
                      {h.payment_status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
          mobile={hires.map((h) => (
            <AdminMobileCard key={h.id}>
              <p className="font-semibold text-gray-900 dark:text-white">{h.equipment_name}</p>
              <AdminMobileCardRow label="Phone" value={h.phone || '—'} />
              <AdminMobileCardRow
                label="Hire period"
                value={`${new Date(h.hire_date).toLocaleDateString()} – ${new Date(h.return_date).toLocaleDateString()}`}
              />
              <AdminMobileCardRow label="Total" value={`KES ${Number(h.total_cost).toLocaleString()}`} />
              <AdminMobileCardRow
                label="Payment"
                value={<span className={`capitalize font-medium ${statusColor(h.payment_status)}`}>{h.payment_status}</span>}
              />
            </AdminMobileCard>
          ))}
        />
      </div>

      <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800 dark:text-white">By Equipment</h2>

      <AdminResponsiveData
        isEmpty={stats.length === 0}
        empty={
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-lg">No equipment hire data yet</p>
          </div>
        }
        desktop={
          <table className="w-full min-w-[480px]">
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
        }
        mobile={stats.map((item) => (
          <AdminMobileCard key={item.name}>
            <p className="font-semibold text-gray-900 dark:text-white">{item.name}</p>
            <AdminMobileCardRow label="Rentals" value={item.rentals} />
            <AdminMobileCardRow label="Revenue" value={`KES ${item.revenue.toLocaleString()}`} />
            <AdminMobileCardRow label="Avg duration" value={`${item.avgDurationDays} days`} />
          </AdminMobileCard>
        ))}
      />
    </div>
  )
}
