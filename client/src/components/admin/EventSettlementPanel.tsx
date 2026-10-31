import { FormEvent, useCallback, useEffect, useState } from 'react'
import { AlertCircle, Loader, Trash2, X } from 'lucide-react'
import {
  addEventCost,
  approveEventSettlement,
  getEventSettlement,
  removeEventCost,
  type EventSettlementView,
  type SettlementLine,
} from '../../api/admin/events'

const kes = (value: number) => `KES ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
const inputClass =
  'w-full px-3 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white'

const lineName = (l: SettlementLine) => {
  const zone = l.regionName ?? l.region_name ?? 'Zone'
  return l.captain_name ? `${zone} · ${l.captain_name}` : zone
}
const lineUsed = (l: SettlementLine) => l.usedTickets ?? l.used_tickets ?? 0

/**
 * Captains' share of an event's profit: pct% of (used-ticket revenue − costs), divided by every used ticket,
 * times each zone's used referral tickets. Approving adds the shares as approved zone commissions for payout.
 */
export default function EventSettlementPanel({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const [view, setView] = useState<EventSettlementView | null>(null)
  const [error, setError] = useState('')
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    getEventSettlement(eventId)
      .then(setView)
      .catch((err: any) => setError(err.response?.data?.error || 'Failed to load the settlement'))
  }, [eventId])

  useEffect(load, [load])

  const run = async (fn: () => Promise<unknown>, fallback: string) => {
    setBusy(true)
    setError('')
    try {
      await fn()
      load()
    } catch (err: any) {
      setError(err.response?.data?.error || fallback)
    } finally {
      setBusy(false)
    }
  }

  const addCost = (e: FormEvent) => {
    e.preventDefault()
    run(async () => {
      await addEventCost(eventId, { label, amount: Number(amount) })
      setLabel('')
      setAmount('')
    }, 'Could not add the cost')
  }

  const approve = () => {
    if (!window.confirm("Approve the captains' share? Each zone's share is added to its commissions and paid to its lead captain.")) return
    run(() => approveEventSettlement(eventId), 'Could not approve the settlement')
  }

  const saved = view?.settlement
  const figures = saved
    ? {
        revenue: saved.revenue,
        costs: saved.costs,
        grossProfit: saved.gross_profit,
        pct: saved.pct,
        usedCount: saved.used_count,
        perTicketValue: saved.per_ticket_value,
        captainPool: saved.captain_pool,
        lines: saved.lines,
      }
    : view?.preview

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-xl h-full overflow-y-auto bg-white dark:bg-gray-900 p-6 shadow-xl text-gray-900 dark:text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold">Captains' profit share</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{view?.event.title}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2">
            <X size={20} />
          </button>
        </div>
        {error && (
          <div className="flex gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400 mb-4">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {error}
          </div>
        )}
        {!view ? (
          <Loader className="w-6 h-6 animate-spin text-gray-400" />
        ) : (
          <>
            {!view.enabled && (
              <p className="text-sm text-amber-600 mb-4">The captains' profit share is turned off in the ticket rules.</p>
            )}

            <h3 className="font-semibold mb-2">Event costs</h3>
            {view.costs.length === 0 ? (
              <p className="text-sm text-gray-500 mb-3">No costs recorded yet.</p>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700 mb-3">
                {view.costs.map((cost) => (
                  <li key={cost.id} className="py-2 flex justify-between gap-3 text-sm">
                    <span>{cost.label}</span>
                    <span className="flex items-center gap-3">
                      {kes(cost.amount)}
                      {!saved && (
                        <button
                          onClick={() => run(() => removeEventCost(eventId, cost.id), 'Could not remove the cost')}
                          aria-label="Remove cost"
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {!saved && (
              <form onSubmit={addCost} className="flex flex-wrap gap-2 mb-6">
                <input
                  placeholder="Cost, e.g. Transport"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className={`${inputClass} flex-1 min-w-[160px]`}
                  required
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`${inputClass} w-32`}
                  required
                />
                <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600">
                  Add
                </button>
              </form>
            )}

            {figures && (
              <>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-4">
                  <dt className="text-gray-500">Used tickets</dt>
                  <dd className="text-right">{figures.usedCount}</dd>
                  <dt className="text-gray-500">Earnings from used tickets</dt>
                  <dd className="text-right">{kes(figures.revenue)}</dd>
                  <dt className="text-gray-500">Costs</dt>
                  <dd className="text-right">−{kes(figures.costs)}</dd>
                  <dt className="text-gray-500">Gross profit</dt>
                  <dd className="text-right font-semibold">{kes(figures.grossProfit)}</dd>
                  <dt className="text-gray-500">Value of one used ticket ({figures.pct}%)</dt>
                  <dd className="text-right">{kes(figures.perTicketValue)}</dd>
                </dl>
                <table className="w-full text-sm mb-4">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                      <th className="py-2">Zone</th>
                      <th className="py-2 text-right">Referral tickets used</th>
                      <th className="py-2 text-right">Payout</th>
                      {saved && <th className="py-2 text-right">Status</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {figures.lines.length === 0 ? (
                      <tr>
                        <td colSpan={saved ? 4 : 3} className="py-3 text-gray-500">
                          No used tickets came through zone links.
                        </td>
                      </tr>
                    ) : (
                      figures.lines.map((line, i) => (
                        <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-2">
                            {lineName(line)}
                            {!saved && (
                              <span className="block text-xs text-gray-500">
                                {line.leadCaptainName ? `Paid to ${line.leadCaptainName}` : 'No lead captain set'}
                              </span>
                            )}
                          </td>
                          <td className="py-2 text-right">{lineUsed(line)}</td>
                          <td className="py-2 text-right">{kes(line.amount)}</td>
                          {saved && (
                            <td className="py-2 text-right capitalize">
                              {line.commission_status === 'paid' ? 'Paid' : line.amount > 0 ? 'To pay' : '—'}
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold">
                      <td className="py-2">Total</td>
                      <td className="py-2 text-right">{figures.lines.reduce((s, l) => s + lineUsed(l), 0)}</td>
                      <td className="py-2 text-right">{kes(figures.captainPool)}</td>
                      {saved && <td />}
                    </tr>
                  </tfoot>
                </table>
              </>
            )}

            {saved ? (
              <p className="text-sm text-green-600 dark:text-green-400">
                Approved {new Date(saved.approved_at).toLocaleString()}
                {saved.approved_by_name ? ` by ${saved.approved_by_name}` : ''}. Statements were emailed to lead captains. Pay the zone shares by
                M-Pesa from Captains → Payouts by {new Date(saved.payout_due).toLocaleDateString()}; admins get a reminder
                if any are still unpaid 5 days after the event.
              </p>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-3">
                  Only scanned tickets count. Record every cost before approving; the figures are locked once approved.
                </p>
                <button
                  onClick={approve}
                  disabled={busy || !view.enabled || view.event.cancelled}
                  className="px-4 py-2 min-h-[44px] rounded-lg bg-primary dark:bg-primary-dark text-white dark:text-black font-semibold disabled:opacity-50"
                >
                  Approve and send statements
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
