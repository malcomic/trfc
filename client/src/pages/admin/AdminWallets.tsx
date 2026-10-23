import { FormEvent, useCallback, useEffect, useState } from 'react'
import { AlertCircle, Loader, Wallet, X } from 'lucide-react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminMobileCard, { AdminMobileCardRow } from '../../components/admin/AdminMobileCard'
import AdminResponsiveData from '../../components/admin/AdminResponsiveData'
import {
  createWalletAdjustment,
  getAdminPaymentPlans,
  getAdminWalletLedger,
  getAdminWallets,
  type AdminPaymentPlan,
  type AdminPlanFilter,
  type AdminWallet,
  type AdminWalletLedger,
} from '../../api/admin/wallets'
import { WALLET_TX_LABELS } from '../../api/payments'

type View = 'wallets' | 'plans'

const inputClass =
  'w-full px-4 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
const kes = (value: number) => `KES ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
const date = (value: string | null) => (value ? new Date(value).toLocaleDateString() : '—')

const PLAN_STATUS_STYLES: Record<AdminPaymentPlan['status'], string> = {
  active: 'text-yellow-600 dark:text-yellow-400',
  completed: 'text-green-600 dark:text-green-400',
  cancelled: 'text-gray-500 dark:text-gray-400',
  expired: 'text-red-600 dark:text-red-400',
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-3 mb-6 text-red-700 dark:text-red-400">
      <AlertCircle className="w-5 h-5 flex-shrink-0" /> {message}
    </div>
  )
}

function LedgerPanel({ userId, onClose, onAdjusted }: { userId: string; onClose: () => void; onAdjusted: () => void }) {
  const [ledger, setLedger] = useState<AdminWalletLedger | null>(null)
  const [error, setError] = useState('')
  const [amount, setAmount] = useState('')
  const [direction, setDirection] = useState<'credit' | 'debit'>('credit')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    getAdminWalletLedger(userId)
      .then(setLedger)
      .catch(() => setError('Failed to load the ledger'))
  }, [userId])

  useEffect(load, [load])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const value = Number(amount)
    if (!value || value <= 0) {
      setError('Enter a positive amount')
      return
    }
    if (!window.confirm(`${direction === 'credit' ? 'Add' : 'Remove'} ${kes(value)} ${direction === 'credit' ? 'to' : 'from'} this wallet?`)) return
    setSaving(true)
    setError('')
    try {
      await createWalletAdjustment({ userId, amount: direction === 'credit' ? value : -value, note })
      setAmount('')
      setNote('')
      load()
      onAdjusted()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Adjustment failed')
    } finally {
      setSaving(false)
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
            <h2 className="text-xl font-bold">{ledger?.user.name || 'Wallet'}</h2>
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
            <p className="text-3xl font-bold mb-6">{kes(ledger.balance)}</p>

            <form onSubmit={submit} className="space-y-3 mb-8 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h3 className="font-semibold">Manual adjustment</h3>
              <div className="flex gap-3">
                <select value={direction} onChange={(e) => setDirection(e.target.value as 'credit' | 'debit')} className={inputClass}>
                  <option value="credit">Credit (add)</option>
                  <option value="debit">Debit (remove)</option>
                </select>
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
              </div>
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
                {saving ? 'Saving…' : 'Apply adjustment'}
              </button>
            </form>

            <h3 className="font-semibold mb-2">Ledger</h3>
            {ledger.transactions.length === 0 ? (
              <p className="text-sm text-gray-500">No activity.</p>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {ledger.transactions.map((tx) => (
                  <li key={tx.id} className="py-2 flex justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">{WALLET_TX_LABELS[tx.type] ?? tx.type}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {new Date(tx.created_at).toLocaleString()}
                        {tx.note ? ` · ${tx.note}` : ''}
                        {tx.mpesa_receipt ? ` · ${tx.mpesa_receipt}` : ''}
                        {tx.status === 'pending' ? ' · pending' : ''}
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

function WalletsView() {
  const [wallets, setWallets] = useState<AdminWallet[]>([])
  const [liability, setLiability] = useState(0)
  const [funded, setFunded] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const load = useCallback(async (term: string) => {
    try {
      setLoading(true)
      setError('')
      const data = await getAdminWallets({ search: term || undefined })
      setWallets(data.wallets)
      setLiability(data.liability)
      setFunded(data.funded)
    } catch {
      setError('Failed to load wallets')
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
          <p className="text-sm text-gray-500 dark:text-gray-400">Total wallet liability</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{kes(liability)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Wallets with a balance</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{funded}</p>
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
              No wallets yet
            </div>
          }
          desktop={
            <table className="w-full min-w-[700px]">
              <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  {['Member', 'Balance', 'Active plans', 'Last activity', ''].map((h) => (
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
                    <td className="px-6 py-4 font-semibold">{kes(w.balance)}</td>
                    <td className="px-6 py-4">{w.active_plans}</td>
                    <td className="px-6 py-4 text-sm">{date(w.updated_at)}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => setSelected(w.user_id)} className="text-sm font-semibold text-primary dark:text-primary-dark hover:underline">
                        Ledger
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
              <AdminMobileCardRow label="Balance" value={kes(w.balance)} />
              <AdminMobileCardRow label="Active plans" value={w.active_plans} />
              <button onClick={() => setSelected(w.user_id)} className="mt-2 text-sm font-semibold text-primary dark:text-primary-dark">
                View ledger
              </button>
            </AdminMobileCard>
          ))}
        />
      )}
      {selected && <LedgerPanel userId={selected} onClose={() => setSelected(null)} onAdjusted={() => load(search)} />}
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
      .catch(() => setError('Failed to load installment plans'))
      .finally(() => setLoading(false))
  }, [filter])

  return (
    <>
      <select value={filter} onChange={(e) => setFilter(e.target.value as AdminPlanFilter)} className={`${inputClass} mb-6 sm:max-w-xs`}>
        <option value="active">Active</option>
        <option value="overdue">Overdue</option>
        <option value="completed">Completed</option>
        <option value="expired">Expired / cancelled</option>
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
              No installment plans
            </div>
          }
          desktop={
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  {['Member', 'Event', 'Tickets', 'Paid', 'Next due', 'Status', 'Created'].map((h) => (
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
                      <div className="text-xs text-gray-500">{p.installment_count} installments</div>
                    </td>
                    <td className="px-6 py-4 text-sm">{p.status === 'active' ? date(p.next_due_at) : '—'}</td>
                    <td className={`px-6 py-4 capitalize font-medium ${PLAN_STATUS_STYLES[p.status]}`}>{p.status}</td>
                    <td className="px-6 py-4 text-sm">{date(p.created_at)}</td>
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
              <AdminMobileCardRow label="Next due" value={p.status === 'active' ? date(p.next_due_at) : '—'} />
              <AdminMobileCardRow label="Status" value={<span className={`capitalize ${PLAN_STATUS_STYLES[p.status]}`}>{p.status}</span>} />
            </AdminMobileCard>
          ))}
        />
      )}
    </>
  )
}

export default function AdminWallets() {
  const [view, setView] = useState<View>('wallets')

  return (
    <div>
      <AdminPageHeader title="Wallets" actions={<Wallet size={28} className="text-primary dark:text-primary-dark hidden sm:block" />} />
      <div className="flex gap-2 mb-6">
        {(['wallets', 'plans'] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 min-h-[44px] rounded-lg text-sm font-semibold transition ${
              view === v
                ? 'bg-primary dark:bg-primary-dark text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
            }`}
          >
            {v === 'wallets' ? 'Wallets' : 'Installment plans'}
          </button>
        ))}
      </div>
      {view === 'wallets' ? <WalletsView /> : <PlansView />}
    </div>
  )
}
