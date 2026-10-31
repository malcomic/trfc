import { FormEvent, useCallback, useEffect, useState } from 'react'
import { AlertCircle, Loader, Ticket, X } from 'lucide-react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminMobileCard, { AdminMobileCardRow } from '../../components/admin/AdminMobileCard'
import AdminResponsiveData from '../../components/admin/AdminResponsiveData'
import {
  createAdminCredit,
  getAdminPaymentPlans,
  getAdminWalletLedger,
  getAdminWallets,
  getTicketRules,
  updateTicketRules,
  voidAdminCredit,
  type AdminPaymentPlan,
  type AdminPlanFilter,
  type AdminWallet,
  type AdminWalletLedger,
  type TicketRules,
} from '../../api/admin/wallets'
import { CREDIT_REASON_LABELS } from '../../api/wallet'
import { WALLET_TX_LABELS } from '../../api/payments'

type View = 'members' | 'plans' | 'rules'

const inputClass =
  'w-full px-4 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
const kes = (value: number) => `KES ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
const date = (value: string | null) => (value ? new Date(value).toLocaleDateString() : '—')

const PLAN_STATUS: Record<AdminPaymentPlan['status'], { label: string; className: string }> = {
  active: { label: 'In progress', className: 'text-yellow-600 dark:text-yellow-400' },
  completed: { label: 'Paid', className: 'text-green-600 dark:text-green-400' },
  cancelled: { label: 'Released by member', className: 'text-gray-500 dark:text-gray-400' },
  expired: { label: 'Deadline missed', className: 'text-red-600 dark:text-red-400' },
  moved: { label: 'Moved to another event', className: 'text-gray-500 dark:text-gray-400' },
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-3 mb-6 text-red-700 dark:text-red-400">
      <AlertCircle className="w-5 h-5 flex-shrink-0" /> {message}
    </div>
  )
}

function LedgerPanel({ userId, onClose, onChanged }: { userId: string; onClose: () => void; onChanged: () => void }) {
  const [ledger, setLedger] = useState<AdminWalletLedger | null>(null)
  const [error, setError] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    getAdminWalletLedger(userId)
      .then(setLedger)
      .catch(() => setError('Failed to load the history'))
  }, [userId])

  useEffect(load, [load])

  const addCredit = async (e: FormEvent) => {
    e.preventDefault()
    const value = Number(amount)
    if (!value || value <= 0) {
      setError('Enter a positive amount')
      return
    }
    if (!window.confirm(`Add ${kes(value)} of ticket credit to this member?`)) return
    setSaving(true)
    setError('')
    try {
      await createAdminCredit({ userId, amount: value, note })
      setAmount('')
      setNote('')
      load()
      onChanged()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not add the credit')
    } finally {
      setSaving(false)
    }
  }

  const removeCredit = async (creditId: string, remaining: number) => {
    const reason = window.prompt(`Remove ${kes(remaining)} of ticket credit? Enter the reason (shown to the member):`)
    if (!reason) return
    setError('')
    try {
      await voidAdminCredit(creditId, reason)
      load()
      onChanged()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not remove the credit')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-xl h-full overflow-y-auto bg-white dark:bg-gray-900 p-6 shadow-xl text-gray-900 dark:text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold">{ledger?.user.name || 'Member'}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{ledger?.user.email}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={20} />
          </button>
        </div>
        {error && <ErrorBox message={error} />}
        {!ledger ? (
          <Loader className="w-6 h-6 animate-spin text-gray-400" />
        ) : (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400">Ticket value</p>
            <p className="text-3xl font-bold">{kes(ledger.ticketValue)}</p>
            {ledger.upcoming > 0 && (
              <p className="text-xs text-gray-500 mb-2">+ {kes(ledger.upcoming)} appearing the morning after an event</p>
            )}

            <h3 className="font-semibold mt-6 mb-2">Credits</h3>
            {ledger.credits.length === 0 ? (
              <p className="text-sm text-gray-500 mb-6">No active credit.</p>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700 mb-6">
                {ledger.credits.map((c) => (
                  <li key={c.id} className="py-2 flex justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {CREDIT_REASON_LABELS[c.reason] ?? c.reason}
                        {c.event_title ? ` · ${c.event_title}` : ''}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Ends {date(c.expires_at)} ({c.days_left} days)
                        {!c.available ? ` · available from ${date(c.available_from)}` : ''}
                        {c.held > 0 ? ` · ${kes(c.held)} held for a payment` : ''}
                      </p>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <p className="font-semibold">{kes(c.remaining)}</p>
                      <button
                        onClick={() => removeCredit(c.id, c.remaining)}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={addCredit} className="space-y-3 mb-8 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h3 className="font-semibold">Add ticket credit</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                For corrections only. It lasts the usual number of days from today and can only be used on event tickets.
              </p>
              <input
                type="number"
                min={1}
                step="0.01"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputClass}
                required
              />
              <textarea
                placeholder="Reason (required, visible to the member)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={inputClass}
                rows={2}
                minLength={5}
                required
              />
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 min-h-[44px] rounded-lg bg-primary dark:bg-primary-dark text-white font-semibold disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Add credit'}
              </button>
            </form>

            <h3 className="font-semibold mb-2">History</h3>
            {ledger.transactions.length === 0 ? (
              <p className="text-sm text-gray-500">No activity.</p>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {ledger.transactions.map((tx) => (
                  <li key={tx.id} className="py-2 flex justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {WALLET_TX_LABELS[tx.type] ?? tx.type}
                        {tx.reason ? ` · ${CREDIT_REASON_LABELS[tx.reason]}` : ''}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {new Date(tx.created_at).toLocaleString()}
                        {tx.note ? ` · ${tx.note}` : ''}
                        {tx.mpesa_receipt ? ` · ${tx.mpesa_receipt}` : ''}
                        {tx.status === 'pending' ? ' · waiting for M-Pesa' : ''}
                      </p>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <p className={tx.amount > 0 ? 'text-green-600' : tx.amount < 0 ? 'text-red-600' : 'text-gray-500'}>
                        {tx.amount === 0 && tx.mpesa_amount ? `${kes(tx.mpesa_amount)} M-Pesa` : `${tx.amount > 0 ? '+' : ''}${kes(tx.amount)}`}
                      </p>
                      {tx.balance_after != null && tx.amount !== 0 && (
                        <p className="text-xs text-gray-500">= {kes(tx.balance_after)}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const RULE_FIELDS: { key: keyof TicketRules; label: string; hint: string; step?: string }[] = [
  { key: 'creditDays', label: 'Ticket value lasts (days)', hint: 'Counted from the day after the event' },
  { key: 'earlyNoticeHours', label: 'Early notice (hours)', hint: 'At least this long before = "Cancelled early"' },
  { key: 'depositPct', label: 'First payment (%)', hint: 'When paying in parts', step: '0.01' },
  { key: 'depositRoundTo', label: 'Round first payment up to (KES)', hint: 'E.g. 10 → 449.10 becomes 450' },
  { key: 'defaultDeadlineDays', label: 'Payment deadline (days before)', hint: 'Events can override this' },
  { key: 'priorityReleaseDays', label: 'Member seats open to all (days before)', hint: 'For events with member priority' },
  { key: 'markPresentHours', label: 'Mark present window (hours)', hint: 'After the scan list is confirmed' },
  { key: 'captainProfitSharePct', label: "Captains' profit share (%)", hint: 'Of event gross profit', step: '0.01' },
]

function TicketRulesPanel() {
  const [form, setForm] = useState<TicketRules | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getTicketRules()
      .then(setForm)
      .catch(() => setError('Failed to load the ticket rules'))
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form) return
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      setForm(await updateTicketRules(form))
      setSaved(true)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save the ticket rules')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 mb-6 text-gray-900 dark:text-gray-100">
      <h3 className="font-semibold">Ticket rules</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Shown to members before they pay. Change the terms version when the wording changes, so new acceptances are recorded
        against it.
      </p>
      {error && <ErrorBox message={error} />}
      {form && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {RULE_FIELDS.map((field) => (
              <label key={field.key} className="block text-sm">
                <span className="font-medium">{field.label}</span>
                <input
                  type="number"
                  min={0}
                  step={field.step ?? '1'}
                  required
                  value={String(form[field.key])}
                  onChange={(e) => {
                    setSaved(false)
                    setForm({ ...form, [field.key]: Number(e.target.value) })
                  }}
                  className={`${inputClass} mt-1`}
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">{field.hint}</span>
              </label>
            ))}
            <label className="block text-sm">
              <span className="font-medium">Terms version</span>
              <input
                value={form.termsVersion}
                maxLength={20}
                required
                onChange={(e) => {
                  setSaved(false)
                  setForm({ ...form, termsVersion: e.target.value })
                }}
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="flex items-center gap-2 text-sm mt-6">
              <input
                type="checkbox"
                checked={form.captainProfitShareEnabled}
                onChange={(e) => {
                  setSaved(false)
                  setForm({ ...form, captainProfitShareEnabled: e.target.checked })
                }}
              />
              Captains' profit share is on
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 min-h-[44px] rounded-lg bg-primary dark:bg-primary-dark text-white font-semibold disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save rules'}
            </button>
            {saved && <span className="text-sm text-green-600 dark:text-green-400">Saved</span>}
          </div>
        </>
      )}
    </form>
  )
}

function MembersView() {
  const [wallets, setWallets] = useState<AdminWallet[]>([])
  const [outstanding, setOutstanding] = useState(0)
  const [withValue, setWithValue] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const load = useCallback(async (term: string) => {
    try {
      setLoading(true)
      setError('')
      const data = await getAdminWallets({ search: term || undefined })
      setWallets(Array.isArray(data.wallets) ? data.wallets : [])
      setOutstanding(data.outstanding)
      setWithValue(data.with_value)
    } catch {
      setError('Failed to load ticket value')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => load(search), 300)
    return () => clearTimeout(timer)
  }, [search, load])

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Ticket value outstanding</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{kes(outstanding)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Members with ticket value</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{withValue}</p>
        </div>
      </div>
      <input
        type="search"
        placeholder="Search name, email or phone"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={`${inputClass} mb-6 sm:max-w-sm`}
      />
      {error && <ErrorBox message={error} />}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : (
        <AdminResponsiveData
          isEmpty={wallets.length === 0}
          empty={
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center text-gray-600 dark:text-gray-400">
              No members with ticket value yet
            </div>
          }
          desktop={
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  {['Member', 'Ticket value', 'Next ends', 'Payments in progress', 'Last activity', ''].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {wallets.map((w) => (
                  <tr key={w.user_id} className="border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                    <td className="px-6 py-4">
                      <div className="font-semibold">{w.name || '—'}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{w.email}</div>
                    </td>
                    <td className="px-6 py-4 font-semibold">{kes(w.ticket_value)}</td>
                    <td className="px-6 py-4 text-sm">{date(w.next_expiry)}</td>
                    <td className="px-6 py-4">{w.active_plans}</td>
                    <td className="px-6 py-4 text-sm">{date(w.updated_at)}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => setSelected(w.user_id)} className="text-sm font-semibold text-primary dark:text-primary-dark hover:underline">
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
          mobile={wallets.map((w) => (
            <AdminMobileCard key={w.user_id}>
              <p className="font-semibold text-gray-900 dark:text-white">{w.name || '—'}</p>
              <AdminMobileCardRow label="Email" value={w.email || '—'} />
              <AdminMobileCardRow label="Ticket value" value={kes(w.ticket_value)} />
              <AdminMobileCardRow label="Next ends" value={date(w.next_expiry)} />
              <AdminMobileCardRow label="Payments in progress" value={w.active_plans} />
              <button onClick={() => setSelected(w.user_id)} className="mt-2 text-sm font-semibold text-primary dark:text-primary-dark">
                View details
              </button>
            </AdminMobileCard>
          ))}
        />
      )}
      {selected && <LedgerPanel userId={selected} onClose={() => setSelected(null)} onChanged={() => load(search)} />}
    </>
  )
}

function PlansView() {
  const [filter, setFilter] = useState<AdminPlanFilter>('active')
  const [plans, setPlans] = useState<AdminPaymentPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    getAdminPaymentPlans(filter)
      .then((data) => setPlans(data.plans))
      .catch(() => setError('Failed to load payments in progress'))
      .finally(() => setLoading(false))
  }, [filter])

  return (
    <>
      <select value={filter} onChange={(e) => setFilter(e.target.value as AdminPlanFilter)} className={`${inputClass} mb-6 sm:max-w-xs`}>
        <option value="active">In progress</option>
        <option value="overdue">Behind on a chosen date</option>
        <option value="completed">Fully paid</option>
        <option value="expired">Deadline missed / released</option>
        <option value="">All</option>
      </select>
      {error && <ErrorBox message={error} />}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : (
        <AdminResponsiveData
          isEmpty={plans.length === 0}
          empty={
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center text-gray-600 dark:text-gray-400">
              Nothing here
            </div>
          }
          desktop={
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  {['Member', 'Event', 'Tickets', 'Paid', 'Next date', 'Deadline', 'Status'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id} className="border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                    <td className="px-6 py-4">
                      <div className="font-semibold">{p.user_name || '—'}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{p.user_email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div>{p.event_title}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{date(p.event_date)}</div>
                    </td>
                    <td className="px-6 py-4">{p.quantity}</td>
                    <td className="px-6 py-4">
                      {kes(p.amount_paid)} / {kes(p.total_amount)}
                    </td>
                    <td className="px-6 py-4 text-sm">{p.status === 'active' ? date(p.next_due_at) : '—'}</td>
                    <td className="px-6 py-4 text-sm">{date(p.deadline_at)}</td>
                    <td className={`px-6 py-4 font-medium ${PLAN_STATUS[p.status].className}`}>{PLAN_STATUS[p.status].label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
          mobile={plans.map((p) => (
            <AdminMobileCard key={p.id}>
              <p className="font-semibold text-gray-900 dark:text-white">{p.event_title}</p>
              <AdminMobileCardRow label="Member" value={p.user_name || p.user_email || '—'} />
              <AdminMobileCardRow label="Paid" value={`${kes(p.amount_paid)} / ${kes(p.total_amount)}`} />
              <AdminMobileCardRow label="Deadline" value={date(p.deadline_at)} />
              <AdminMobileCardRow
                label="Status"
                value={<span className={PLAN_STATUS[p.status].className}>{PLAN_STATUS[p.status].label}</span>}
              />
            </AdminMobileCard>
          ))}
        />
      )}
    </>
  )
}

const VIEW_LABELS: Record<View, string> = {
  members: 'Ticket value',
  plans: 'Payments in progress',
  rules: 'Rules',
}

export default function AdminWallets() {
  const [view, setView] = useState<View>('members')

  return (
    <div>
      <AdminPageHeader title="Ticket value" actions={<Ticket size={28} className="text-primary dark:text-primary-dark hidden sm:block" />} />
      <div className="flex flex-wrap gap-2 mb-6">
        {(Object.keys(VIEW_LABELS) as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 min-h-[44px] rounded-lg text-sm font-semibold transition ${
              view === v
                ? 'bg-primary dark:bg-primary-dark text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
            }`}
          >
            {VIEW_LABELS[v]}
          </button>
        ))}
      </div>
      {view === 'members' && <MembersView />}
      {view === 'plans' && <PlansView />}
      {view === 'rules' && <TicketRulesPanel />}
    </div>
  )
}
