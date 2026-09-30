import { useState, useEffect } from 'react'
import { Loader, AlertCircle, UserPlus, Download, MessageCircle } from 'lucide-react'
import { getAdminSignups, AdminSignup, AdminSignupFilters } from '../../api/signups'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminMobileCard, { AdminMobileCardRow } from '../../components/admin/AdminMobileCard'
import AdminResponsiveData from '../../components/admin/AdminResponsiveData'
import { PROGRAMS, PROGRAM_ORDER, isProgramId } from '../../content/programs'
import { TIER_LABELS } from '../../content/onboarding'

const selectClass =
  'w-full sm:w-auto px-4 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white'

function programName(id: string) {
  return isProgramId(id) ? PROGRAMS[id].name : id
}

function tierLabel(tier: string) {
  return tier in TIER_LABELS ? TIER_LABELS[tier as keyof typeof TIER_LABELS] : tier
}

function statusColor(status: string) {
  switch (status) {
    case 'paid':
      return 'text-green-600 dark:text-green-400'
    case 'failed':
      return 'text-red-600 dark:text-red-400'
    case 'pending':
      return 'text-yellow-600 dark:text-yellow-400'
    default:
      return 'text-gray-500 dark:text-gray-400'
  }
}

function statusLabel(status: string) {
  return status === 'n/a' ? 'Free' : status
}

function whatsappLink(number: string | null) {
  return number ? `https://wa.me/${number.replace(/\D/g, '')}` : null
}

function csvEscape(value: unknown) {
  const text = value == null ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function exportCsv(rows: AdminSignup[]) {
  const header = [
    'Date', 'Name', 'Phone', 'WhatsApp', 'Program', 'Tier', 'Returning',
    'Amount', 'Payment Status', 'M-Pesa Receipt', 'WhatsApp Sent',
  ]
  const lines = rows.map((s) =>
    [
      new Date(s.created_at).toISOString(),
      s.name,
      s.phone,
      s.whatsapp,
      programName(s.program),
      tierLabel(s.tier),
      s.is_returning ? 'Yes' : 'No',
      s.amount,
      statusLabel(s.payment_status),
      s.mpesa_receipt,
      s.whatsapp_sent_at ? new Date(s.whatsapp_sent_at).toISOString() : '',
    ]
      .map(csvEscape)
      .join(',')
  )
  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `trfc-signups-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function AdminSignups() {
  const [signups, setSignups] = useState<AdminSignup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<AdminSignupFilters>({})

  useEffect(() => {
    fetchSignups()
  }, [filters])

  const fetchSignups = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await getAdminSignups(filters)
      setSignups(Array.isArray(data) ? data : [])
    } catch (err) {
      setError('Failed to load signups')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const setFilter = (key: keyof AdminSignupFilters, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value || undefined }))

  return (
    <div>
      <AdminPageHeader
        title="Signups"
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => exportCsv(signups)}
              disabled={signups.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition"
            >
              <Download size={16} /> Export CSV
            </button>
            <UserPlus size={28} className="text-primary dark:text-primary-dark hidden sm:block" />
          </div>
        }
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 flex gap-3 mb-6">
          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" />
          <div>
            <p className="text-red-700 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchSignups}
              className="bg-red-600 text-white px-4 py-2 min-h-[44px] rounded hover:bg-red-700 transition"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <select value={filters.program ?? ''} onChange={(e) => setFilter('program', e.target.value)} className={selectClass}>
          <option value="">All programs</option>
          {PROGRAM_ORDER.map((id) => (
            <option key={id} value={id}>{PROGRAMS[id].name}</option>
          ))}
        </select>
        <select value={filters.tier ?? ''} onChange={(e) => setFilter('tier', e.target.value)} className={selectClass}>
          <option value="">All tiers</option>
          <option value="free">Free</option>
          <option value="plus">TRFC+</option>
          <option value="elite">Elite</option>
        </select>
        <select
          value={filters.payment_status ?? ''}
          onChange={(e) => setFilter('payment_status', e.target.value)}
          className={selectClass}
        >
          <option value="">All payment statuses</option>
          <option value="n/a">Free (no payment)</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
        <input
          type="date"
          aria-label="From date"
          value={filters.from ?? ''}
          onChange={(e) => setFilter('from', e.target.value)}
          className={selectClass}
        />
        <input
          type="date"
          aria-label="To date"
          value={filters.to ?? ''}
          onChange={(e) => setFilter('to', e.target.value)}
          className={selectClass}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : (
        <AdminResponsiveData
          isEmpty={signups.length === 0}
          empty={
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-600 dark:text-gray-400 text-lg">No signups yet</p>
            </div>
          }
          desktop={
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  {['Member', 'Program', 'Tier', 'Amount', 'Status', 'Welcome sent', 'Date', ''].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {signups.map((s) => {
                  const wa = whatsappLink(s.whatsapp || s.phone)
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold">{s.name || '—'}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{s.phone || '—'}</div>
                        {s.is_returning && (
                          <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                            Returning
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">{programName(s.program)}</td>
                      <td className="px-6 py-4">{tierLabel(s.tier)}</td>
                      <td className="px-6 py-4">{s.amount > 0 ? `KES ${Number(s.amount).toLocaleString()}` : '—'}</td>
                      <td className={`px-6 py-4 capitalize font-medium ${statusColor(s.payment_status)}`}>
                        {statusLabel(s.payment_status)}
                        {s.mpesa_receipt && (
                          <div className="text-xs font-mono text-gray-500 dark:text-gray-400 normal-case">{s.mpesa_receipt}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">{s.whatsapp_sent_at ? 'Yes' : 'No'}</td>
                      <td className="px-6 py-4 text-sm">{new Date(s.created_at).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        {wa && (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 dark:text-green-400 hover:underline"
                          >
                            <MessageCircle size={16} /> Message
                          </a>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          }
          mobile={signups.map((s) => {
            const wa = whatsappLink(s.whatsapp || s.phone)
            return (
              <AdminMobileCard key={s.id}>
                <p className="font-semibold text-gray-900 dark:text-white">{s.name || '—'}</p>
                <AdminMobileCardRow label="Phone" value={s.phone || '—'} />
                <AdminMobileCardRow label="Program" value={programName(s.program)} />
                <AdminMobileCardRow label="Tier" value={tierLabel(s.tier)} />
                <AdminMobileCardRow label="Returning" value={s.is_returning ? 'Yes' : 'No'} />
                <AdminMobileCardRow label="Amount" value={s.amount > 0 ? `KES ${Number(s.amount).toLocaleString()}` : '—'} />
                <AdminMobileCardRow
                  label="Status"
                  value={<span className={`capitalize font-medium ${statusColor(s.payment_status)}`}>{statusLabel(s.payment_status)}</span>}
                />
                <AdminMobileCardRow label="Welcome sent" value={s.whatsapp_sent_at ? 'Yes' : 'No'} />
                <AdminMobileCardRow label="Date" value={new Date(s.created_at).toLocaleString()} />
                {wa && (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 dark:text-green-400"
                  >
                    <MessageCircle size={16} /> Message on WhatsApp
                  </a>
                )}
              </AdminMobileCard>
            )
          })}
        />
      )}
    </div>
  )
}
