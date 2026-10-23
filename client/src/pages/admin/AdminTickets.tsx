import { useState, useEffect, useMemo } from 'react'
import { Loader, AlertCircle, Ticket, Download, Mail, Link2, Search, X } from 'lucide-react'
import { getTicketsForAdmin, resendAdminTicket, AdminTicket } from '../../api/admin/tickets'
import { getZones, type Zone } from '../../api/zones'
import { downloadCsv } from '../../utils/csv'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminMobileCard, { AdminMobileCardRow } from '../../components/admin/AdminMobileCard'
import AdminResponsiveData from '../../components/admin/AdminResponsiveData'
import { formatEventDate } from '../../utils/eventDate'

const shortTicketCode = (id: string) => id.replace(/-/g, '').slice(0, 8).toUpperCase()

function confirmationLink(t: AdminTicket): string | null {
  if (!t.checkout_request_id) return null
  const params = t.phone ? `?${new URLSearchParams({ phone: t.phone }).toString()}` : ''
  return `${window.location.origin}/ticket-confirmation/${encodeURIComponent(t.checkout_request_id)}${params}`
}

export default function AdminTickets() {
  const [tickets, setTickets] = useState<AdminTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterZone, setFilterZone] = useState('all')
  const [zones, setZones] = useState<Zone[]>([])
  const [search, setSearch] = useState('')
  const [resendTarget, setResendTarget] = useState<AdminTicket | null>(null)
  const [resendEmail, setResendEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resendError, setResendError] = useState('')
  const [notice, setNotice] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    fetchTickets()
    getZones().then(setZones).catch(() => setZones([]))
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
      case 'reserved':
        return 'text-blue-600 dark:text-blue-400'
      case 'cancelled':
        return 'text-gray-500 dark:text-gray-400 line-through'
      default:
        return 'text-yellow-600 dark:text-yellow-400'
    }
  }

  const filteredTickets = useMemo(() => {
    const term = search.trim().toLowerCase()
    const digits = term.replace(/\D/g, '')
    const matchesSearch = (t: AdminTicket) => {
      if (!term) return true
      const phoneDigits = (t.phone || '').replace(/\D/g, '')
      return (
        (digits.length >= 4 && phoneDigits.includes(digits.replace(/^0/, ''))) ||
        (t.email || '').toLowerCase().includes(term) ||
        (t.mpesa_receipt || '').toLowerCase().includes(term) ||
        (t.attendee_name || '').toLowerCase().includes(term) ||
        shortTicketCode(t.id).toLowerCase().includes(term)
      )
    }
    return tickets.filter(
      (t) =>
        (filterStatus === 'all' || t.payment_status === filterStatus) &&
        (filterZone === 'all' || (filterZone === 'none' ? !t.zone_id : t.zone_id === filterZone)) &&
        matchesSearch(t)
    )
  }, [tickets, filterStatus, filterZone, search])

  const openResend = (t: AdminTicket) => {
    setResendTarget(t)
    setResendEmail(t.email || '')
    setResendError('')
  }

  const closeResend = () => {
    if (resending) return
    setResendTarget(null)
  }

  const submitResend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resendTarget) return
    const email = resendEmail.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setResendError('Enter a valid email address')
      return
    }
    try {
      setResending(true)
      setResendError('')
      const result = await resendAdminTicket(resendTarget.id, email)
      const ref = resendTarget.checkout_request_id
      setTickets((prev) =>
        prev.map((t) =>
          t.id === resendTarget.id || (ref && t.checkout_request_id === ref) ? { ...t, email: result.email } : t
        )
      )
      setNotice(`Tickets sent to ${result.email}`)
      setResendTarget(null)
    } catch (err: any) {
      setResendError(err.response?.data?.error || 'Failed to resend tickets')
    } finally {
      setResending(false)
    }
  }

  const copyLink = async (t: AdminTicket) => {
    const link = confirmationLink(t)
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopiedId(t.id)
      setTimeout(() => setCopiedId((current) => (current === t.id ? null : current)), 2000)
    } catch {
      window.prompt('Copy this link', link)
    }
  }

  const ticketActions = (t: AdminTicket) =>
    t.payment_status === 'paid' ? (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => openResend(t)}
          className="inline-flex items-center gap-1 px-3 py-1.5 min-h-[36px] text-xs font-medium border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Mail size={14} /> Resend / Edit email
        </button>
        {t.checkout_request_id && (
          <button
            type="button"
            onClick={() => copyLink(t)}
            className="inline-flex items-center gap-1 px-3 py-1.5 min-h-[36px] text-xs font-medium border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Link2 size={14} /> {copiedId === t.id ? 'Copied' : 'Copy link'}
          </button>
        )}
      </div>
    ) : (
      <span className="text-gray-400 text-sm">—</span>
    )

  const exportCsv = () => {
    downloadCsv(
      'tickets',
      filteredTickets.map((t) => ({
        Event: t.event_title ?? '',
        'Event date': t.event_date ?? '',
        Type: t.ticket_type_name ?? '',
        Price: t.price ?? '',
        Attendee: t.attendee_name ?? '',
        Email: t.email ?? '',
        Phone: t.phone ?? '',
        'M-Pesa receipt': t.mpesa_receipt ?? '',
        Zone: t.zone_name ?? '',
        Status: t.payment_status,
        'Paid via': t.payment_provider ?? '',
        Cancelled: t.cancelled_at ?? '',
        'Checked in': t.checked_in_at ?? '',
        Batch: t.purchase_batch_id ?? '',
        Purchased: t.created_at,
      }))
    )
  }

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

      {notice && (
        <div className="mb-4 flex items-center justify-between gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3 text-sm text-green-800 dark:text-green-300">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="mb-4 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search phone, email, M-Pesa code, name, or ticket code"
          className="w-full pl-9 pr-4 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </div>

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
          <option value="reserved">Reserved (installments)</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 sm:ml-4">Zone</label>
        <select
          value={filterZone}
          onChange={(e) => setFilterZone(e.target.value)}
          className="w-full sm:w-auto px-4 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="all">All zones</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>{z.name}</option>
          ))}
          <option value="none">No zone</option>
        </select>
        <button
          onClick={exportCsv}
          disabled={filteredTickets.length === 0}
          className="sm:ml-auto flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      <AdminResponsiveData
        isEmpty={filteredTickets.length === 0}
        empty={
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              {tickets.length === 0 ? 'No tickets yet' : 'No tickets match your filters'}
            </p>
          </div>
        }
        desktop={
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Event</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Buyer</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Zone</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Check-in</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Batch</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Actions</th>
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
                        {formatEventDate(t.event_date, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div>{t.ticket_type_name || '—'}</div>
                    {t.price != null && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        KES {Number(t.price).toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div>{t.attendee_name || '—'}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{t.phone || '—'}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 break-all">{t.email || '—'}</div>
                    {t.mpesa_receipt && (
                      <div className="text-xs font-mono text-gray-500 dark:text-gray-400">{t.mpesa_receipt}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">{t.zone_name || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`capitalize font-medium ${statusColor(t.payment_status)}`}>{t.payment_status}</span>
                    {t.cancelled_at && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(t.cancelled_at).toLocaleDateString()}</div>
                    )}
                    {t.payment_provider === 'wallet' && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">via wallet</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {t.checked_in_at ? (
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300">
                        Checked in
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-gray-500 dark:text-gray-400">
                    {t.purchase_batch_id ? t.purchase_batch_id.slice(0, 8) + '…' : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm">{new Date(t.created_at).toLocaleString()}</td>
                  <td className="px-6 py-4">{ticketActions(t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
        mobile={filteredTickets.map((t) => (
          <AdminMobileCard key={t.id}>
            <p className="font-semibold text-gray-900 dark:text-white">{t.event_title || '—'}</p>
            <AdminMobileCardRow label="Event date" value={t.event_date ? formatEventDate(t.event_date, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'} />
            <AdminMobileCardRow label="Type" value={t.ticket_type_name || '—'} />
            <AdminMobileCardRow label="Price" value={t.price != null ? `KES ${Number(t.price).toLocaleString()}` : '—'} />
            <AdminMobileCardRow label="Attendee" value={t.attendee_name || '—'} />
            <AdminMobileCardRow label="Phone" value={t.phone || '—'} />
            <AdminMobileCardRow label="Email" value={t.email || '—'} />
            <AdminMobileCardRow label="M-Pesa" value={t.mpesa_receipt || '—'} />
            <AdminMobileCardRow label="Zone" value={t.zone_name || '—'} />
            <AdminMobileCardRow
              label="Status"
              value={
                <span className={`capitalize font-medium ${statusColor(t.payment_status)}`}>
                  {t.payment_status}
                  {t.cancelled_at ? ` · ${new Date(t.cancelled_at).toLocaleDateString()}` : ''}
                </span>
              }
            />
            <AdminMobileCardRow
              label="Check-in"
              value={
                t.checked_in_at ? (
                  <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300">
                    Checked in
                  </span>
                ) : (
                  '—'
                )
              }
            />
            <AdminMobileCardRow
              label="Batch"
              value={t.purchase_batch_id ? t.purchase_batch_id.slice(0, 8) + '…' : '—'}
            />
            <AdminMobileCardRow label="Purchased" value={new Date(t.created_at).toLocaleString()} />
            <div className="pt-2">{ticketActions(t)}</div>
          </AdminMobileCard>
        ))}
      />

      {resendTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeResend}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Resend tickets</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {resendTarget.event_title || 'Event'} · {resendTarget.attendee_name || 'Guest'} ·{' '}
                  {resendTarget.phone || 'no phone'}
                </p>
              </div>
              <button type="button" onClick={closeResend} aria-label="Close" className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={submitResend} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="w-full px-4 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Changing the email updates every ticket in this purchase. The previous address gets a notice.
                </p>
              </div>
              {resendError && <p className="text-sm text-red-600 dark:text-red-400">{resendError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeResend}
                  disabled={resending}
                  className="px-4 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resending}
                  className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg bg-primary dark:bg-primary-dark text-white hover:opacity-90 disabled:opacity-60"
                >
                  {resending && <Loader size={16} className="animate-spin" />}
                  Save & resend
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
