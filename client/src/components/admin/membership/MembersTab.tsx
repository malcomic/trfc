import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, AlertTriangle, ChevronLeft, ChevronRight, Download, Gift, Loader, Search, X } from 'lucide-react'
import AdminMobileCard, { AdminMobileCardRow } from '../AdminMobileCard'
import AdminResponsiveData from '../AdminResponsiveData'
import { adminSelectClass } from '../reachOut/ReachOutFilters'
import { formatDate } from '../reachOut/memberDisplay'
import {
  cancelMembershipYear,
  exportMembers,
  getMemberYears,
  getMembers,
  getMembershipSummary,
  grantMembership,
  type MemberRow,
  type MembersFilters,
  type MembersPage,
  type MembershipSummary,
  type MembershipYearRow,
} from '../../../api/admin/membership'
import { getAllUsers } from '../../../api/users'
import { MEMBER_STATUS_LABELS, PRICE_TYPE_LABELS } from './membershipAdmin'

const SEARCH_DELAY_MS = 350
const kes = (n: number) => `KSh ${Math.round(n).toLocaleString('en-US')}`
const buttonClass =
  'inline-flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50'
const primaryClass =
  'inline-flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-lg bg-primary dark:bg-primary-dark text-white dark:text-black font-semibold disabled:opacity-50'

function Tiles({ summary }: { summary: MembershipSummary | null }) {
  const tiles = [
    { label: 'Active members', value: summary ? summary.active.toLocaleString() : '-' },
    {
      label: 'Founding places',
      value: summary ? `${summary.foundingPaid} / ${summary.foundingLimit}` : '-',
      note: summary?.foundingHeld ? `${summary.foundingHeld} paying now` : undefined,
    },
    { label: 'Ending in 30 days', value: summary ? summary.expiring.toLocaleString() : '-' },
    { label: 'Revenue this year', value: summary ? kes(summary.revenueThisYear) : '-' },
  ]
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {tiles.map((t) => (
          <div key={t.label} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 m-0">{t.label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white m-0 tabular-nums">{t.value}</p>
            {t.note && <p className="text-xs text-gray-500 dark:text-gray-400 m-0">{t.note}</p>}
          </div>
        ))}
      </div>
      {summary && summary.overLimit > 0 && (
        <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
          {summary.overLimit} founding payment{summary.overLimit === 1 ? '' : 's'} came in after the places were full. They were
          honoured at the founding price and are marked in the list.
        </div>
      )}
    </>
  )
}

function GrantDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<{ id: string; name: string | null; email: string | null; phone: string | null }[]>([])
  const [userId, setUserId] = useState('')
  const [months, setMonths] = useState(12)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const q = search.trim()
    if (q.length < 2) {
      setResults([])
      return
    }
    const timer = setTimeout(() => {
      getAllUsers({ search: q })
        .then((rows: any[]) => setResults(rows.slice(0, 8)))
        .catch(() => setResults([]))
    }, SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [search])

  const save = async () => {
    setError('')
    if (!userId) return setError('Choose a member')
    if (!note.trim()) return setError('Add a note saying why')
    try {
      setSaving(true)
      await grantMembership({ userId, months, note: note.trim() })
      onDone()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not add membership')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="grant-title">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-5 text-gray-900 dark:text-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h2 id="grant-title" className="text-lg font-semibold m-0">Gift or extend membership</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 min-h-[44px] min-w-[44px]">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0">
          The months are added after their current end date. Gifts never count as founding.
        </p>
        <label className="block text-sm mb-3">
          <span className="block mb-1">Find the person</span>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email or phone" className={adminSelectClass} />
        </label>
        {results.length > 0 && (
          <ul className="mb-3 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
            {results.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => setUserId(u.id)}
                  className={`w-full text-left px-3 py-2 text-sm ${userId === u.id ? 'bg-primary/10 dark:bg-primary-dark/20 font-semibold' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  {u.name || 'No name'} <span className="text-gray-500 dark:text-gray-400">· {u.email || u.phone}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <label className="block text-sm mb-3">
          <span className="block mb-1">Months</span>
          <input type="number" min={1} max={24} value={months} onChange={(e) => setMonths(Math.max(1, Math.min(24, Number(e.target.value) || 1)))} className={adminSelectClass} />
        </label>
        <label className="block text-sm mb-3">
          <span className="block mb-1">Note (required)</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} className={adminSelectClass} placeholder="For example: paid cash at the Saturday run" />
        </label>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className={buttonClass}>Cancel</button>
          <button type="button" onClick={save} disabled={saving} className={primaryClass}>
            {saving ? 'Saving…' : 'Add membership'}
          </button>
        </div>
      </div>
    </div>
  )
}

function YearsDrawer({ member, onClose, onChanged }: { member: MemberRow; onClose: () => void; onChanged: () => void }) {
  const [years, setYears] = useState<MembershipYearRow[] | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    getMemberYears(member.user_id).then(setYears).catch(() => setError('Could not load the years'))
  }, [member.user_id])

  useEffect(() => {
    load()
  }, [load])

  const cancel = async () => {
    if (!cancelId) return
    if (!note.trim()) return setError('Add a note saying why')
    try {
      setSaving(true)
      setError('')
      await cancelMembershipYear(cancelId, note.trim())
      setCancelId(null)
      setNote('')
      load()
      onChanged()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not cancel')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="years-title">
      <div className="bg-white dark:bg-gray-800 w-full max-w-lg h-full overflow-y-auto p-5 text-gray-900 dark:text-gray-100">
        <div className="flex items-center justify-between mb-1">
          <h2 id="years-title" className="text-lg font-semibold m-0">{member.name || 'Member'}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 min-h-[44px] min-w-[44px]">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0">{member.email} · {member.phone}</p>
        {!years ? (
          <Loader className="w-6 h-6 animate-spin text-gray-400 mx-auto my-8" />
        ) : (
          <ul className="space-y-3 mt-4 p-0 list-none">
            {years.map((y) => (
              <li key={y.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold m-0">{formatDate(y.starts_at)} to {formatDate(y.ends_at)}</p>
                    <p className="text-gray-600 dark:text-gray-400 m-0">
                      {PRICE_TYPE_LABELS[y.price_type] ?? y.price_type}
                      {y.amount > 0 && ` · ${kes(y.amount)}`}
                      {y.mpesa_receipt && ` · ${y.mpesa_receipt}`}
                      {y.granted_by_name && ` · by ${y.granted_by_name}`}
                    </p>
                    {y.over_limit && <p className="text-amber-700 dark:text-amber-400 m-0">Founding over limit</p>}
                    {y.note && <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line m-0 mt-1">{y.note}</p>}
                  </div>
                  {y.status === 'cancelled' ? (
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400">Cancelled</span>
                  ) : (
                    <button type="button" onClick={() => setCancelId(y.id)} className="text-xs font-semibold text-red-600 dark:text-red-400 underline min-h-[44px]">
                      Cancel year
                    </button>
                  )}
                </div>
                {cancelId === y.id && (
                  <div className="mt-3 space-y-2">
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} placeholder="Why is this year cancelled? (required)" className={adminSelectClass} />
                    <p className="text-xs text-gray-500 dark:text-gray-400 m-0">This does not refund M-Pesa. Their member end date is recalculated from the years left.</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={cancel} disabled={saving} className="inline-flex items-center px-4 min-h-[44px] rounded-lg bg-red-600 text-white font-semibold disabled:opacity-50">
                        {saving ? 'Cancelling…' : 'Cancel this year'}
                      </button>
                      <button type="button" onClick={() => setCancelId(null)} className={buttonClass}>Keep it</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  )
}

export default function MembersTab() {
  const [filters, setFilters] = useState<MembersFilters>({})
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<MembersPage | null>(null)
  const [summary, setSummary] = useState<MembershipSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [granting, setGranting] = useState(false)
  const [open, setOpen] = useState<MemberRow | null>(null)
  const filterKey = JSON.stringify(filters)

  useEffect(() => {
    const trimmed = search.trim()
    if (trimmed === (filters.search ?? '')) return
    const timer = setTimeout(() => {
      setFilters((f) => ({ ...f, search: trimmed || undefined }))
      setPage(1)
    }, SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [search])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const [page_, summary_] = await Promise.all([getMembers(filters, page), getMembershipSummary()])
      setData(page_)
      setSummary(summary_)
    } catch (err) {
      console.error(err)
      setError('Failed to load members')
    } finally {
      setLoading(false)
    }
    // filterKey stands in for `filters`.
  }, [filterKey, page])

  useEffect(() => {
    load()
  }, [load])

  const set = (patch: Partial<MembersFilters>) => {
    setFilters((f) => ({ ...f, ...patch }))
    setPage(1)
  }

  const onExport = async () => {
    try {
      setExporting(true)
      await exportMembers(filters)
    } catch {
      setError('Failed to export the list')
    } finally {
      setExporting(false)
    }
  }

  const rows = data?.rows ?? []
  const total = data?.total ?? 0
  const pageSize = data?.pageSize ?? 25
  const pages = Math.max(1, Math.ceil(total / pageSize))

  const typeCell = (m: MemberRow) => (
    <span>
      {PRICE_TYPE_LABELS[m.price_type] ?? m.price_type}
      {m.is_founding && m.price_type !== 'founding' && <span className="text-xs text-gray-500 dark:text-gray-400"> · founding member</span>}
      {m.over_limit && <span className="block text-xs text-amber-700 dark:text-amber-400">Founding over limit</span>}
    </span>
  )

  return (
    <div>
      <Tiles summary={summary} />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-3 mb-4 text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
        </div>
      )}

      <section className="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm text-gray-700 dark:text-gray-300">
        <label className="relative md:col-span-2">
          <span className="sr-only">Search by name, email or phone</span>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email or phone" className={`${adminSelectClass} pl-9`} />
        </label>
        <select aria-label="Status" value={filters.status ?? ''} onChange={(e) => set({ status: (e.target.value || undefined) as MembersFilters['status'] })} className={adminSelectClass}>
          <option value="">Any status</option>
          {Object.entries(MEMBER_STATUS_LABELS).map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
        <select aria-label="Type" value={filters.type ?? ''} onChange={(e) => set({ type: (e.target.value || undefined) as MembersFilters['type'] })} className={adminSelectClass}>
          <option value="">Any type</option>
          {Object.entries(PRICE_TYPE_LABELS).map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
      </section>

      <div className="flex flex-wrap justify-end gap-3 mb-4">
        <button type="button" onClick={() => setGranting(true)} className={primaryClass}>
          <Gift size={16} /> Gift or extend
        </button>
        <button type="button" onClick={onExport} disabled={exporting || total === 0} className={buttonClass}>
          <Download size={16} /> {exporting ? 'Exporting…' : `Export CSV (${total})`}
        </button>
      </div>

      {loading && rows.length === 0 ? (
        <div className="flex items-center justify-center h-48">
          <Loader className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : (
        <div className={loading ? 'opacity-60 transition-opacity' : ''}>
          <AdminResponsiveData
            isEmpty={rows.length === 0}
            empty={
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center text-gray-600 dark:text-gray-400">
                No members match these filters.
              </div>
            }
            desktop={
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    {['Member', 'Status', 'Latest year', 'Paid', 'Member until', 'Years'].map((h) => (
                      <th key={h} className="px-3 py-3 text-left font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => (
                    <tr key={m.user_id} onClick={() => setOpen(m)} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100 align-top cursor-pointer">
                      <td className="px-3 py-3">
                        <div className="font-semibold">{m.name || 'No name'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{m.email}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{m.phone}</div>
                      </td>
                      <td className="px-3 py-3">{MEMBER_STATUS_LABELS[m.status]}</td>
                      <td className="px-3 py-3">{typeCell(m)}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {m.amount > 0 ? kes(m.amount) : '-'}
                        {m.mpesa_receipt && <div className="text-xs text-gray-500 dark:text-gray-400">{m.mpesa_receipt}</div>}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">{m.member_until ? formatDate(m.member_until) : '-'}</td>
                      <td className="px-3 py-3 tabular-nums">{m.years}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
            mobile={rows.map((m) => (
              <AdminMobileCard
                key={m.user_id}
                footer={
                  <button type="button" onClick={() => setOpen(m)} className="inline-flex items-center min-h-[44px] px-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    See years
                  </button>
                }
              >
                <p className="font-semibold text-gray-900 dark:text-white m-0">{m.name || 'No name'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 m-0">{m.email || m.phone}</p>
                <AdminMobileCardRow label="Status" value={MEMBER_STATUS_LABELS[m.status]} />
                <AdminMobileCardRow label="Latest year" value={typeCell(m)} />
                <AdminMobileCardRow label="Member until" value={m.member_until ? formatDate(m.member_until) : '-'} />
              </AdminMobileCard>
            ))}
          />

          {total > 0 && (
            <div className="mt-4 flex items-center justify-between gap-3 text-sm text-gray-700 dark:text-gray-300">
              <span>{total.toLocaleString()} member{total === 1 ? '' : 's'}</span>
              <div className="flex items-center gap-2">
                <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="inline-flex items-center gap-1 px-3 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40">
                  <ChevronLeft size={16} /> Previous
                </button>
                <span className="tabular-nums">{page} / {pages}</span>
                <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="inline-flex items-center gap-1 px-3 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40">
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {granting && (
        <GrantDialog
          onClose={() => setGranting(false)}
          onDone={() => {
            setGranting(false)
            load()
          }}
        />
      )}
      {open && <YearsDrawer member={open} onClose={() => setOpen(null)} onChanged={load} />}
    </div>
  )
}
