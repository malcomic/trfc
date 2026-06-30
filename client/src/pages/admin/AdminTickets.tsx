import { useState, useEffect } from 'react'
import { Loader, AlertCircle, Ticket } from 'lucide-react'
import { getTicketsForAdmin, AdminTicket } from '../../api/admin/tickets'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminMobileCard, { AdminMobileCardRow } from '../../components/admin/AdminMobileCard'
import AdminResponsiveData from '../../components/admin/AdminResponsiveData'

export default function AdminTickets() {
  const [tickets, setTickets] = useState<AdminTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    fetchTickets()
  }, [])

  const fetchTickets = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await getTicketsForAdmin()
      setTickets(Array.isArray(data) ? data : [])
    } catch (err) {
      setError('Failed to load tickets')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

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

  const filteredTickets =
    filterStatus === 'all'
      ? tickets
      : tickets.filter((t) => t.payment_status === filterStatus)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <AdminPageHeader
        title="Tickets"
        actions={
          <Ticket size={28} className="text-primary dark:text-primary-dark hidden sm:block" />
        }
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 flex gap-3 mb-6">
          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" />
          <div>
            <p className="text-red-700 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchTickets}
              className="bg-red-600 text-white px-4 py-2 min-h-[44px] rounded hover:bg-red-700 transition"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by status</label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full sm:w-auto px-4 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="all">All</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <AdminResponsiveData
        isEmpty={filteredTickets.length === 0}
        empty={
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-lg">No tickets yet</p>
          </div>
        }
        desktop={
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Event</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Phone</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Batch</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                >
                  <td className="px-6 py-4">
                    <div className="font-semibold">{t.event_title || '—'}</div>
                    {t.event_date && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(t.event_date).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">{t.phone || '—'}</td>
                  <td className={`px-6 py-4 capitalize font-medium ${statusColor(t.payment_status)}`}>
                    {t.payment_status}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-gray-500 dark:text-gray-400">
                    {t.purchase_batch_id ? t.purchase_batch_id.slice(0, 8) + '…' : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm">{new Date(t.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
        mobile={filteredTickets.map((t) => (
          <AdminMobileCard key={t.id}>
            <p className="font-semibold text-gray-900 dark:text-white">{t.event_title || '—'}</p>
            <AdminMobileCardRow label="Event date" value={t.event_date ? new Date(t.event_date).toLocaleDateString() : '—'} />
            <AdminMobileCardRow label="Phone" value={t.phone || '—'} />
            <AdminMobileCardRow
              label="Status"
              value={<span className={`capitalize font-medium ${statusColor(t.payment_status)}`}>{t.payment_status}</span>}
            />
            <AdminMobileCardRow
              label="Batch"
              value={t.purchase_batch_id ? t.purchase_batch_id.slice(0, 8) + '…' : '—'}
            />
            <AdminMobileCardRow label="Purchased" value={new Date(t.created_at).toLocaleString()} />
          </AdminMobileCard>
        ))}
      />
    </div>
  )
}
