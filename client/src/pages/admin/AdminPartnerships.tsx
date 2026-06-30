import { useState, useEffect } from 'react'
import { Loader, AlertCircle, Handshake } from 'lucide-react'
import { getPartnershipsForAdmin, updatePartnershipStatus, AdminPartnership } from '../../api/admin/partnerships'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminMobileCard, { AdminMobileCardRow } from '../../components/admin/AdminMobileCard'
import AdminResponsiveData from '../../components/admin/AdminResponsiveData'

const STATUS_OPTIONS = ['all', 'pending', 'contacted', 'approved', 'declined']

export default function AdminPartnerships() {
  const [partnerships, setPartnerships] = useState<AdminPartnership[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    fetchPartnerships()
  }, [filterStatus])

  const fetchPartnerships = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await getPartnershipsForAdmin(filterStatus)
      setPartnerships(Array.isArray(data) ? data : [])
    } catch (err) {
      setError('Failed to load partnerships')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      setSavingId(id)
      setError('')
      const updated = await updatePartnershipStatus(id, status)
      setPartnerships((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)))
    } catch (err) {
      setError('Failed to update status')
      console.error(err)
    } finally {
      setSavingId(null)
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600 dark:text-green-400'
      case 'declined':
        return 'text-red-600 dark:text-red-400'
      case 'contacted':
        return 'text-blue-600 dark:text-blue-400'
      default:
        return 'text-yellow-600 dark:text-yellow-400'
    }
  }

  const statusSelect = (p: AdminPartnership) => (
    <select
      value={p.status}
      disabled={savingId === p.id}
      onChange={(e) => handleStatusChange(p.id, e.target.value)}
      className={`w-full px-3 py-2 min-h-[44px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 capitalize font-medium ${statusColor(p.status)}`}
    >
      {STATUS_OPTIONS.filter((s) => s !== 'all').map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  )

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
        title="Partnerships"
        actions={
          <Handshake size={28} className="text-primary dark:text-primary-dark hidden sm:block" />
        }
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-3 mb-6">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by status</label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full sm:w-auto px-4 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      <AdminResponsiveData
        isEmpty={partnerships.length === 0}
        empty={
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-lg">No partnership inquiries yet</p>
          </div>
        }
        desktop={
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Company</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Contact</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Tier</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Phone</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Date</th>
              </tr>
            </thead>
            <tbody>
              {partnerships.map((p) => (
                <tr key={p.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{p.company_name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{p.email}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-900 dark:text-gray-100">{p.contact_person}</td>
                  <td className="px-6 py-4 capitalize text-gray-900 dark:text-gray-100">{p.tier}</td>
                  <td className="px-6 py-4 text-gray-900 dark:text-gray-100">{p.phone}</td>
                  <td className="px-6 py-4">{statusSelect(p)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {new Date(p.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
        mobile={partnerships.map((p) => (
          <AdminMobileCard key={p.id} footer={statusSelect(p)}>
            <p className="font-semibold text-gray-900 dark:text-white">{p.company_name}</p>
            <AdminMobileCardRow label="Contact" value={p.contact_person} />
            <AdminMobileCardRow label="Email" value={p.email} />
            <AdminMobileCardRow label="Phone" value={p.phone} />
            <AdminMobileCardRow label="Tier" value={<span className="capitalize">{p.tier}</span>} />
            <AdminMobileCardRow label="Submitted" value={new Date(p.created_at).toLocaleString()} />
            {p.message && <p className="text-sm text-gray-600 dark:text-gray-400 pt-1">{p.message}</p>}
          </AdminMobileCard>
        ))}
      />
    </div>
  )
}
