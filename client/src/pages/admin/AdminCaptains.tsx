import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, Crown, Download, Edit2, MapPin, Plus, Power, RefreshCw, RotateCcw, Search, Undo2 } from 'lucide-react'
import {
  approveCommissions,
  createCaptain,
  createPayout,
  getAdminCaptains,
  getAdminCommissions,
  getAdminPayouts,
  reverseCommission,
  syncCommissions,
  updateCaptain,
  type AdminCaptain,
  type AdminCommission,
  type AdminPayout,
} from '../../api/admin/captains'
import { getRegions, type Region } from '../../api/admin/regions'
import { getAllUsers, type AdminUser } from '../../api/users'
import { SOURCE_LABELS, type CommissionStatus } from '../../api/captains'
import AdminConfirmDialog from '../../components/AdminConfirmDialog'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminMobileCard, { AdminMobileCardRow } from '../../components/admin/AdminMobileCard'
import AdminResponsiveData from '../../components/admin/AdminResponsiveData'
import CaptainsSectionTabs from '../../components/admin/CaptainsSectionTabs'
import { COMMISSION_STATUS_STYLES, formatDate, formatKes, formatRate } from '../../utils/captainDisplay'
import { downloadCsv } from '../../utils/csv'

type View = 'captains' | 'commissions' | 'payouts'

const inputClass =
  'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
const selectClass =
  'border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm'
const thClass = 'px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap'
const tdClass = 'px-4 py-3 text-sm'
const rowClass =
  'border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100'
const primaryButton =
  'flex items-center justify-center gap-2 bg-primary dark:bg-primary-dark text-white dark:text-black px-4 py-2 rounded-lg hover:opacity-90 transition disabled:opacity-50'
const secondaryButton =
  'flex items-center justify-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50'

function RegionBadge({ name, code }: { name: string; code?: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 whitespace-nowrap">
      <MapPin size={11} />
      {name}
      {code ? ` · ${code}` : ''}
    </span>
  )
}

function LeadBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 whitespace-nowrap">
      <Crown size={11} /> Lead
    </span>
  )
}

function CommissionStatusBadge({ status }: { status: CommissionStatus }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${COMMISSION_STATUS_STYLES[status]}`}>{status}</span>
  )
}

function CaptainStatusBadge({ status }: { status: AdminCaptain['status'] }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
        status === 'active'
          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
      }`}
    >
      {status === 'active' ? 'Active' : 'Suspended'}
    </span>
  )
}

// ---------- Add / edit captain modal ----------

interface CaptainFormProps {
  regions: Region[]
  editing: AdminCaptain | null
  presetUser: { id: string; name: string } | null
  onClose: () => void
  onSaved: (message: string) => void
}

function CaptainFormModal({ regions, editing, presetUser, onClose, onSaved }: CaptainFormProps) {
  const activeRegions = regions.filter((r) => r.is_active || r.id === editing?.region_id)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<AdminUser[]>([])
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(presetUser)
  const [regionId, setRegionId] = useState(editing?.region_id ?? activeRegions[0]?.id ?? '')
  const [payoutPhone, setPayoutPhone] = useState(editing?.payout_phone ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editing || selectedUser || search.trim().length < 2) {
      setResults([])
      return
    }
    const handle = setTimeout(async () => {
      try {
        const users: AdminUser[] = await getAllUsers({ search: search.trim() })
        setResults(users.filter((u) => u.role === 'member').slice(0, 8))
      } catch {
        setResults([])
      }
    }, 300)
    return () => clearTimeout(handle)
  }, [search, editing, selectedUser])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regionId) {
      setError('Choose a zone')
      return
    }
    try {
      setSaving(true)
      setError('')
      if (editing) {
        await updateCaptain(editing.user_id, { regionId, payoutPhone: payoutPhone.trim() })
        onSaved(`${editing.name} updated`)
      } else {
        if (!selectedUser) {
          setError('Choose a member to promote')
          setSaving(false)
          return
        }
        await createCaptain({ userId: selectedUser.id, regionId, payoutPhone: payoutPhone.trim() || undefined })
        const zone = regions.find((r) => r.id === regionId)
        onSaved(`${selectedUser.name} is now a captain in ${zone?.name ?? 'the zone'}`)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save captain')
      setSaving(false)
    }
  }

  const movingLead = editing?.is_lead && regionId !== editing.region_id

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full max-h-[85vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{editing ? `Edit ${editing.name}` : 'Add Captain'}</h2>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {!editing && (
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Member *</label>
              {selectedUser ? (
                <div className="flex items-center justify-between border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white">
                  <span>{selectedUser.name}</span>
                  <button type="button" onClick={() => setSelectedUser(null)} className="text-sm text-blue-600 dark:text-blue-400">
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search members by name, email or phone"
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                  {results.length > 0 && (
                    <ul className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
                      {results.map((u) => (
                        <li key={u.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedUser({ id: u.id, name: u.name })}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <span className="font-medium">{u.name}</span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400">
                              {u.email || 'No email'} · {u.phone}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Only members can be promoted. Admins and scanners are excluded.</p>
                </>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Zone *</label>
            <select value={regionId} onChange={(e) => setRegionId(e.target.value)} className={inputClass}>
              <option value="">Select a zone</option>
              {activeRegions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
            {movingLead && (
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                {editing?.name} leads {editing?.region_name}. Moving them clears that zone's lead captain.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">M-Pesa payout phone</label>
            <input
              type="tel"
              value={payoutPhone}
              onChange={(e) => setPayoutPhone(e.target.value)}
              placeholder="07XX XXX XXX"
              className={inputClass}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Used when this captain is the zone's lead captain and receives the zone's payouts.
            </p>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Referral links and commission rates belong to the zone. Set them on the Zones tab.
          </p>

          <div className="flex gap-2 justify-end pt-4">
            <button type="button" onClick={onClose} className={secondaryButton}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={primaryButton}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Make Captain'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------- Captains view ----------

function CaptainsView({
  captains,
  onEdit,
  onToggleStatus,
}: {
  captains: AdminCaptain[]
  onEdit: (c: AdminCaptain) => void
  onToggleStatus: (c: AdminCaptain) => void
}) {
  const actions = (c: AdminCaptain, mobile = false) => (
    <>
      <button onClick={() => onEdit(c)} className={`flex items-center gap-1 text-blue-600 dark:text-blue-400 min-h-[44px] ${mobile ? 'px-3' : ''}`} aria-label={`Edit ${c.name}`}>
        <Edit2 size={16} /> {mobile && 'Edit'}
      </button>
      <button
        onClick={() => onToggleStatus(c)}
        className={`flex items-center gap-1 min-h-[44px] ${mobile ? 'px-3' : ''} ${
          c.status === 'active' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
        }`}
        aria-label={c.status === 'active' ? `Suspend ${c.name}` : `Reactivate ${c.name}`}
      >
        {c.status === 'active' ? <Power size={16} /> : <RotateCcw size={16} />}
        {mobile && (c.status === 'active' ? 'Suspend' : 'Reactivate')}
      </button>
    </>
  )

  return (
    <AdminResponsiveData
      isEmpty={captains.length === 0}
      empty={
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center text-gray-600 dark:text-gray-400">
          No captains yet. Use "Add Captain" to promote a member.
        </div>
      }
      desktop={
        <table className="w-full min-w-[800px]">
          <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <tr>
              {['#', 'Captain', 'Zone', 'Team members', 'Payout phone', 'Status', 'Actions'].map((h) => (
                <th key={h} className={thClass}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {captains.map((c, i) => (
              <tr key={c.user_id} className={rowClass}>
                <td className={`${tdClass} text-gray-500`}>{i + 1}</td>
                <td className={tdClass}>
                  <div className="font-medium flex items-center gap-2">
                    {c.name} {c.is_lead && <LeadBadge />}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{c.email || c.phone}</div>
                </td>
                <td className={tdClass}><RegionBadge name={c.region_name} code={c.region_code} /></td>
                <td className={tdClass}>{c.team_members}</td>
                <td className={tdClass}>{c.payout_phone || c.phone}</td>
                <td className={tdClass}><CaptainStatusBadge status={c.status} /></td>
                <td className={tdClass}>
                  <div className="flex gap-3 items-center">{actions(c)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
      mobile={captains.map((c) => (
        <AdminMobileCard key={c.user_id} footer={actions(c, true)}>
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              {c.name} {c.is_lead && <LeadBadge />}
            </span>
            <CaptainStatusBadge status={c.status} />
          </div>
          <AdminMobileCardRow label="Zone" value={<RegionBadge name={c.region_name} code={c.region_code} />} />
          <AdminMobileCardRow label="Team members" value={c.team_members} />
          <AdminMobileCardRow label="Payout phone" value={c.payout_phone || c.phone} />
        </AdminMobileCard>
      ))}
    />
  )
}

// ---------- Commissions view ----------

function CommissionsView({
  regionId,
  onChanged,
  setError,
  setNotice,
}: {
  regionId: string
  onChanged: () => void
  setError: (msg: string) => void
  setNotice: (msg: string) => void
}) {
  const [status, setStatus] = useState<CommissionStatus | ''>('pending')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [rows, setRows] = useState<AdminCommission[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [reverseId, setReverseId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setRows(await getAdminCommissions({ regionId: regionId || undefined, status, from, to }))
      setSelected(new Set())
    } catch {
      setError('Failed to load commissions')
    } finally {
      setLoading(false)
    }
  }, [regionId, status, from, to, setError])

  useEffect(() => {
    load()
  }, [load])

  const pendingIds = rows.filter((r) => r.status === 'pending').map((r) => r.id)
  const allPendingSelected = pendingIds.length > 0 && pendingIds.every((id) => selected.has(id))
  const totals = useMemo(
    () => ({
      base: rows.reduce((s, r) => s + (r.status === 'reversed' ? 0 : r.base_amount), 0),
      amount: rows.reduce((s, r) => s + (r.status === 'reversed' ? 0 : r.amount), 0),
    }),
    [rows]
  )

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const approve = async () => {
    try {
      setBusy(true)
      const result = await approveCommissions([...selected])
      setNotice(`${result.approved} commission${result.approved === 1 ? '' : 's'} approved`)
      await load()
      onChanged()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to approve commissions')
    } finally {
      setBusy(false)
    }
  }

  const confirmReverse = async () => {
    if (!reverseId) return
    try {
      await reverseCommission(reverseId)
      setNotice('Commission reversed')
      await load()
      onChanged()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reverse commission')
    } finally {
      setReverseId(null)
    }
  }

  const exportCsv = () =>
    downloadCsv(
      'zone-commissions',
      rows.map((r) => ({
        Date: formatDate(r.created_at),
        Zone: r.region_name,
        'Zone code': r.referral_code,
        Customer: r.customer_name ?? '',
        Source: SOURCE_LABELS[r.source_type],
        'Source ID': r.source_id,
        'Matched by': r.match_method,
        Purchase: r.base_amount,
        Rate: r.rate,
        Commission: r.amount,
        Status: r.status,
      }))
    )

  const reverseButton = (r: AdminCommission) =>
    (r.status === 'pending' || r.status === 'approved') && (
      <button onClick={() => setReverseId(r.id)} className="flex items-center gap-1 text-red-600 dark:text-red-400 text-sm min-h-[36px]" aria-label="Reverse commission">
        <Undo2 size={14} /> Reverse
      </button>
    )

  return (
    <div>
      <div className="flex flex-wrap gap-2 items-end mb-4">
        <select value={status} onChange={(e) => setStatus(e.target.value as CommissionStatus | '')} className={selectClass} aria-label="Status">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
          <option value="reversed">Reversed</option>
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={selectClass} aria-label="From" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={selectClass} aria-label="To" />
        <div className="flex gap-2 ml-auto">
          <button onClick={exportCsv} disabled={rows.length === 0} className={secondaryButton}>
            <Download size={16} /> CSV
          </button>
          <button onClick={approve} disabled={busy || selected.size === 0} className={primaryButton}>
            <Check size={16} /> Approve {selected.size > 0 ? `(${selected.size})` : ''}
          </button>
        </div>
      </div>

      {!loading && rows.length > 0 && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          {rows.length} commission{rows.length === 1 ? '' : 's'} · purchases {formatKes(totals.base)} · commission {formatKes(totals.amount)}
          {rows.length >= 1000 && ' (showing latest 1000)'}
        </p>
      )}

      {loading ? (
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading commissions...</div>
      ) : (
        <AdminResponsiveData
          isEmpty={rows.length === 0}
          empty={
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center text-gray-600 dark:text-gray-400">
              No commissions match these filters.
            </div>
          }
          desktop={
            <table className="w-full min-w-[1100px]">
              <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className={thClass}>
                    <input
                      type="checkbox"
                      checked={allPendingSelected}
                      disabled={pendingIds.length === 0}
                      onChange={() => setSelected(allPendingSelected ? new Set() : new Set(pendingIds))}
                      aria-label="Select all pending"
                    />
                  </th>
                  {['Date', 'Zone', 'Customer', 'Source', 'Matched by', 'Purchase', 'Commission', 'Status', ''].map((h) => (
                    <th key={h} className={thClass}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={rowClass}>
                    <td className={tdClass}>
                      {r.status === 'pending' && (
                        <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label="Select commission" />
                      )}
                    </td>
                    <td className={tdClass}>{formatDate(r.created_at)}</td>
                    <td className={tdClass}>
                      <RegionBadge name={r.region_name} code={r.region_code} />
                    </td>
                    <td className={tdClass}>
                      <div>{r.customer_name ?? '—'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{r.customer_email || r.customer_phone || ''}</div>
                    </td>
                    <td className={tdClass}>
                      <div>{SOURCE_LABELS[r.source_type]}</div>
                      <div className="text-xs font-mono text-gray-500 dark:text-gray-400">{r.source_id.slice(0, 8).toUpperCase()}</div>
                    </td>
                    <td className={`${tdClass} capitalize`}>{r.match_method}</td>
                    <td className={tdClass}>{formatKes(r.base_amount)}</td>
                    <td className={`${tdClass} font-semibold`}>
                      {formatKes(r.amount)} <span className="text-xs text-gray-500 font-normal">({formatRate(r.rate)})</span>
                    </td>
                    <td className={tdClass}><CommissionStatusBadge status={r.status} /></td>
                    <td className={tdClass}>{reverseButton(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
          mobile={rows.map((r) => (
            <AdminMobileCard key={r.id} footer={reverseButton(r) || undefined}>
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                  {r.status === 'pending' && <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />}
                  {formatKes(r.amount)}
                </label>
                <CommissionStatusBadge status={r.status} />
              </div>
              <AdminMobileCardRow label="Zone" value={r.region_name} />
              <AdminMobileCardRow label="Customer" value={r.customer_name ?? '—'} />
              <AdminMobileCardRow label="Source" value={`${SOURCE_LABELS[r.source_type]} · ${formatKes(r.base_amount)}`} />
              <AdminMobileCardRow label="Matched by" value={r.match_method} />
              <AdminMobileCardRow label="Date" value={formatDate(r.created_at)} />
            </AdminMobileCard>
          ))}
        />
      )}

      <AdminConfirmDialog
        open={reverseId !== null}
        title="Reverse commission"
        message="The zone will no longer be paid for this purchase. Use this for refunds, cancelled orders or suspected fraud."
        confirmLabel="Reverse"
        variant="danger"
        onConfirm={confirmReverse}
        onCancel={() => setReverseId(null)}
      />
    </div>
  )
}

// ---------- Payouts view ----------

function PayoutsView({
  regions,
  initialRegionId,
  onChanged,
  setError,
  setNotice,
}: {
  regions: Region[]
  initialRegionId: string
  onChanged: () => void
  setError: (msg: string) => void
  setNotice: (msg: string) => void
}) {
  const [payouts, setPayouts] = useState<AdminPayout[]>([])
  const [loading, setLoading] = useState(true)
  const [regionId, setRegionId] = useState(initialRegionId)
  const [approved, setApproved] = useState<AdminCommission[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [receipt, setReceipt] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const payable = regions.filter((r) => r.approved_amount > 0 || r.id === regionId)
  const zone = regions.find((r) => r.id === regionId)

  useEffect(() => {
    setRegionId(initialRegionId)
  }, [initialRegionId])

  const loadPayouts = useCallback(async () => {
    try {
      setLoading(true)
      setPayouts(await getAdminPayouts())
    } catch {
      setError('Failed to load payouts')
    } finally {
      setLoading(false)
    }
  }, [setError])

  useEffect(() => {
    loadPayouts()
  }, [loadPayouts])

  useEffect(() => {
    if (!regionId) {
      setApproved([])
      setSelected(new Set())
      return
    }
    getAdminCommissions({ regionId, status: 'approved' })
      .then((rows) => {
        const unpaid = rows.filter((r) => !r.payout_id)
        setApproved(unpaid)
        setSelected(new Set(unpaid.map((r) => r.id)))
      })
      .catch(() => setError('Failed to load approved commissions'))
  }, [regionId, setError])

  const selectedTotal = approved.filter((r) => selected.has(r.id)).reduce((s, r) => s + r.amount, 0)
  const canPay = Boolean(zone?.lead_captain_id)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regionId || !canPay || selected.size === 0 || !receipt.trim()) return
    try {
      setSaving(true)
      const payout = await createPayout({ regionId, commissionIds: [...selected], mpesaReceipt: receipt.trim(), note: note.trim() || undefined })
      setNotice(`Payout of ${formatKes(payout.amount)} recorded for ${zone?.name ?? 'the zone'} (paid to ${zone?.lead_captain_name ?? 'lead captain'})`)
      setRegionId('')
      setReceipt('')
      setNote('')
      await loadPayouts()
      onChanged()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to record payout')
    } finally {
      setSaving(false)
    }
  }

  const exportCsv = () =>
    downloadCsv(
      'zone-payouts',
      payouts.map((p) => ({
        Date: formatDate(p.paid_at),
        Zone: p.region_name,
        'Paid to': p.paid_to_name ?? '',
        'Payout phone': p.payout_phone ?? '',
        Amount: p.amount,
        'M-Pesa receipt': p.mpesa_receipt ?? '',
        Commissions: p.commission_count,
        Note: p.note ?? '',
        'Recorded by': p.paid_by_name ?? '',
      }))
    )

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Record a zone payout</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Zone money is paid to the zone's lead captain. Send it by M-Pesa first, then record it here with the receipt number.
            Only approved commissions can be paid.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <select value={regionId} onChange={(e) => setRegionId(e.target.value)} className={inputClass} aria-label="Zone">
            <option value="">{payable.length ? 'Choose a zone' : 'No zones with approved commissions'}</option>
            {payable.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} · {formatKes(r.approved_amount)}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={receipt}
            onChange={(e) => setReceipt(e.target.value.toUpperCase())}
            placeholder="M-Pesa receipt, e.g. QJK3ABC123"
            className={`${inputClass} font-mono`}
            aria-label="M-Pesa receipt"
          />
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className={inputClass} aria-label="Note" />
        </div>

        {zone &&
          (canPay ? (
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Pay to <strong>{zone.lead_captain_name}</strong> (lead captain) on <strong>{zone.lead_captain_phone || '—'}</strong>
            </div>
          ) : (
            <div className="text-sm text-amber-700 dark:text-amber-400">
              {zone.name} has no lead captain. Choose one on the Zones tab before recording a payout.
            </div>
          ))}

        {approved.length > 0 && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 max-h-64 overflow-y-auto">
            {approved.map((r) => (
              <label key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
                <input
                  type="checkbox"
                  checked={selected.has(r.id)}
                  onChange={() =>
                    setSelected((prev) => {
                      const next = new Set(prev)
                      if (next.has(r.id)) next.delete(r.id)
                      else next.add(r.id)
                      return next
                    })
                  }
                />
                <span className="flex-1">
                  {formatDate(r.created_at)} · {SOURCE_LABELS[r.source_type]} · {r.customer_name ?? 'Customer'}
                </span>
                <span className="font-semibold">{formatKes(r.amount)}</span>
              </label>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <span className="text-gray-900 dark:text-white font-semibold">Total: {formatKes(selectedTotal)}</span>
          <button type="submit" disabled={saving || !regionId || !canPay || selected.size === 0 || !receipt.trim()} className={primaryButton}>
            {saving ? 'Saving...' : 'Record payout'}
          </button>
        </div>
      </form>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Payout history</h2>
          <button onClick={exportCsv} disabled={payouts.length === 0} className={secondaryButton}>
            <Download size={16} /> Export CSV
          </button>
        </div>
        {loading ? (
          <div className="text-lg text-gray-600 dark:text-gray-400">Loading payouts...</div>
        ) : (
          <AdminResponsiveData
            isEmpty={payouts.length === 0}
            empty={
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center text-gray-600 dark:text-gray-400">
                No payouts recorded yet.
              </div>
            }
            desktop={
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    {['Date', 'Zone', 'Paid to', 'Amount', 'Receipt', 'Commissions', 'Note', 'Recorded by'].map((h) => (
                      <th key={h} className={thClass}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id} className={rowClass}>
                      <td className={tdClass}>{formatDate(p.paid_at)}</td>
                      <td className={tdClass}><RegionBadge name={p.region_name} /></td>
                      <td className={tdClass}>{p.paid_to_name || '—'}</td>
                      <td className={`${tdClass} font-semibold`}>{formatKes(p.amount)}</td>
                      <td className={`${tdClass} font-mono`}>{p.mpesa_receipt || '—'}</td>
                      <td className={tdClass}>{p.commission_count}</td>
                      <td className={tdClass}>{p.note || '—'}</td>
                      <td className={tdClass}>{p.paid_by_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
            mobile={payouts.map((p) => (
              <AdminMobileCard key={p.id}>
                <div className="flex items-center justify-between font-semibold text-gray-900 dark:text-white">
                  <span>{p.region_name}</span>
                  <span>{formatKes(p.amount)}</span>
                </div>
                <AdminMobileCardRow label="Paid to" value={p.paid_to_name || '—'} />
                <AdminMobileCardRow label="Date" value={formatDate(p.paid_at)} />
                <AdminMobileCardRow label="Receipt" value={p.mpesa_receipt || '—'} />
                <AdminMobileCardRow label="Commissions" value={p.commission_count} />
              </AdminMobileCard>
            ))}
          />
        )}
      </div>
    </div>
  )
}

// ---------- Page ----------

export default function AdminCaptains() {
  const [searchParams, setSearchParams] = useSearchParams()
  const view = (['captains', 'commissions', 'payouts'].includes(searchParams.get('view') ?? '')
    ? searchParams.get('view')
    : 'captains') as View

  const [captains, setCaptains] = useState<AdminCaptain[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [regionId, setRegionId] = useState(searchParams.get('region') ?? '')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [modal, setModal] = useState<{ editing: AdminCaptain | null; presetUser: { id: string; name: string } | null } | null>(null)
  const [statusTarget, setStatusTarget] = useState<AdminCaptain | null>(null)
  const [syncing, setSyncing] = useState(false)

  const setView = (next: View) => {
    const params = new URLSearchParams(searchParams)
    params.set('view', next)
    params.delete('add')
    params.delete('name')
    setSearchParams(params, { replace: true })
  }

  const loadCaptains = useCallback(async () => {
    try {
      setCaptains(await getAdminCaptains({ regionId: regionId || undefined, status: statusFilter || undefined }))
    } catch {
      setError('Failed to load captains')
    } finally {
      setLoading(false)
    }
  }, [regionId, statusFilter])

  const loadRegions = useCallback(async () => {
    try {
      setRegions(await getRegions())
    } catch {
      setError('Failed to load zones')
    }
  }, [])

  const reloadAll = useCallback(() => {
    loadCaptains()
    loadRegions()
  }, [loadCaptains, loadRegions])

  useEffect(() => {
    loadCaptains()
  }, [loadCaptains])

  useEffect(() => {
    loadRegions()
  }, [loadRegions])

  useEffect(() => {
    const addId = searchParams.get('add')
    if (addId) {
      setModal({ editing: null, presetUser: { id: addId, name: searchParams.get('name') || 'Selected member' } })
    }
  }, [searchParams])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(''), 5000)
    return () => clearTimeout(t)
  }, [notice])

  const closeModal = () => {
    setModal(null)
    if (searchParams.get('add')) {
      const params = new URLSearchParams(searchParams)
      params.delete('add')
      params.delete('name')
      setSearchParams(params, { replace: true })
    }
  }

  const confirmStatusChange = async () => {
    if (!statusTarget) return
    const next = statusTarget.status === 'active' ? 'suspended' : 'active'
    try {
      await updateCaptain(statusTarget.user_id, { status: next })
      setNotice(`${statusTarget.name} ${next === 'active' ? 'reactivated' : 'suspended'}`)
      reloadAll()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update captain')
    } finally {
      setStatusTarget(null)
    }
  }

  const runSync = async () => {
    try {
      setSyncing(true)
      const result = await syncCommissions(90)
      setNotice(
        result.created
          ? `${result.created} missing commission${result.created === 1 ? '' : 's'} recorded from the last ${result.days} days`
          : `No missing commissions in the last ${result.days} days`
      )
      loadRegions()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to sync commissions')
    } finally {
      setSyncing(false)
    }
  }

  const zoneTotals = useMemo(
    () =>
      regions
        .filter((r) => r.is_active || r.referred_sales > 0)
        .sort((a, b) => b.referred_sales - a.referred_sales),
    [regions]
  )

  return (
    <div>
      <AdminPageHeader
        title="Captains"
        subtitle="Referral links and commission belong to zones. Each zone's money is paid to its lead captain; captains look after the members who choose them."
        actions={
          <>
            <button onClick={runSync} disabled={syncing} className={secondaryButton} title="Record any commissions missed in the last 90 days">
              <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} /> Re-sync
            </button>
            <button onClick={() => setModal({ editing: null, presetUser: null })} className={`${primaryButton} px-6 w-full sm:w-auto`}>
              <Plus size={20} /> Add Captain
            </button>
          </>
        }
      />

      <CaptainsSectionTabs />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6 flex justify-between gap-4">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-sm underline">
            Dismiss
          </button>
        </div>
      )}
      {notice && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg mb-6">
          {notice}
        </div>
      )}

      {zoneTotals.length > 0 && view === 'captains' && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-6">
          {zoneTotals.map((r) => (
            <div key={r.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
              <RegionBadge name={r.name} />
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-2">{formatKes(r.referred_sales)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {r.captain_count} captain{r.captain_count === 1 ? '' : 's'} · {formatKes(r.pending_amount + r.approved_amount)} owed
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Lead: {r.lead_captain_name ?? 'not set'}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
          {(['captains', 'commissions', 'payouts'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 text-sm font-medium capitalize ${
                view === v
                  ? 'bg-primary dark:bg-primary-dark text-white dark:text-black'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        {view !== 'payouts' && (
          <select value={regionId} onChange={(e) => setRegionId(e.target.value)} className={selectClass} aria-label="Zone">
            <option value="">All zones</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        )}
        {view === 'captains' && (
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass} aria-label="Captain status">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        )}
      </div>

      {view === 'captains' &&
        (loading ? (
          <div className="text-lg text-gray-600 dark:text-gray-400">Loading captains...</div>
        ) : (
          <CaptainsView captains={captains} onEdit={(c) => setModal({ editing: c, presetUser: null })} onToggleStatus={setStatusTarget} />
        ))}

      {view === 'commissions' && (
        <CommissionsView regionId={regionId} onChanged={loadRegions} setError={setError} setNotice={setNotice} />
      )}

      {view === 'payouts' && (
        <PayoutsView
          regions={regions}
          initialRegionId={searchParams.get('region') ?? ''}
          onChanged={loadRegions}
          setError={setError}
          setNotice={setNotice}
        />
      )}

      {modal && (
        <CaptainFormModal
          regions={regions}
          editing={modal.editing}
          presetUser={modal.presetUser}
          onClose={closeModal}
          onSaved={(message) => {
            closeModal()
            setNotice(message)
            reloadAll()
          }}
        />
      )}

      <AdminConfirmDialog
        open={statusTarget !== null}
        title={statusTarget?.status === 'active' ? 'Suspend captain' : 'Reactivate captain'}
        message={
          statusTarget?.status === 'active'
            ? `${statusTarget?.name} will lose captain access.${statusTarget?.is_lead ? ` ${statusTarget?.region_name} will need a new lead captain before its next payout.` : ''} The zone's commissions are kept.`
            : `${statusTarget?.name} will regain captain access.`
        }
        confirmLabel={statusTarget?.status === 'active' ? 'Suspend' : 'Reactivate'}
        variant={statusTarget?.status === 'active' ? 'danger' : 'default'}
        onConfirm={confirmStatusChange}
        onCancel={() => setStatusTarget(null)}
      />
    </div>
  )
}
