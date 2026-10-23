import { useEffect, useMemo, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Modal, Button } from '../ui'
import { getShortfall, payFromWallet, type PayableBatch, type WalletCheckoutResult } from '../../api/wallet'
import { formatEventDate } from '../../utils/eventDate'
import { formatKes } from '../../utils/captainDisplay'

interface PayEventsModalProps {
  isOpen: boolean
  onClose: () => void
  batches: PayableBatch[]
  balance: number
  onPaid: (result: WalletCheckoutResult) => void
  /** Called with the amount still needed when the wallet can't cover the selection. */
  onNeedTopUp: (shortfall: number) => void
}

export default function PayEventsModal({ isOpen, onClose, batches, balance, onPaid, onNeedTopUp }: PayEventsModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setSelected(new Set(batches.map((b) => b.purchase_batch_id)))
    setError('')
  }, [isOpen, batches])

  const total = useMemo(
    () => batches.filter((b) => selected.has(b.purchase_batch_id)).reduce((sum, b) => sum + Number(b.total), 0),
    [batches, selected]
  )
  const shortfall = Math.max(0, total - balance)

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const pay = async () => {
    if (shortfall > 0) {
      onNeedTopUp(shortfall)
      return
    }
    setSubmitting(true)
    setError('')
    try {
      onPaid(await payFromWallet([...selected]))
    } catch (err: any) {
      const needed = getShortfall(err)
      if (needed != null) onNeedTopUp(needed)
      else setError(err.response?.data?.error || 'Payment failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pay for events" size="lg">
      <div className="space-y-4">
        {batches.length === 0 ? (
          <p className="text-sm text-fog light:text-fog-light">No bookings are waiting for payment.</p>
        ) : (
          <ul className="space-y-2 max-h-80 overflow-y-auto">
            {batches.map((b) => (
              <li key={b.purchase_batch_id}>
                <label className="flex items-start gap-3 p-3 border border-white/10 light:border-black/10 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selected.has(b.purchase_batch_id)}
                    onChange={() => toggle(b.purchase_batch_id)}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-chalk light:text-chalk-light">{b.event_title}</span>
                    <span className="block text-xs text-fog light:text-fog-light">
                      {formatEventDate(b.event_date, { year: 'numeric', month: 'short', day: 'numeric' })} · {b.quantity}{' '}
                      {b.ticket_type_name ?? 'ticket'}
                      {b.quantity === 1 ? '' : 's'}
                    </span>
                  </span>
                  <span className="font-bebas text-lg text-accent light:text-accent-light">{formatKes(Number(b.total))}</span>
                </label>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-between text-sm border-t border-white/10 light:border-black/10 pt-3">
          <span className="text-fog light:text-fog-light">Wallet balance</span>
          <span>{formatKes(balance)}</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>{formatKes(total)}</span>
        </div>
        {shortfall > 0 && (
          <p className="text-xs text-amber-400">You need {formatKes(shortfall)} more. You'll be asked to top up first.</p>
        )}
        {error && (
          <div className="flex gap-2 bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {error}
          </div>
        )}
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={pay} isLoading={submitting} disabled={selected.size === 0}>
            {shortfall > 0 ? `Top up ${formatKes(shortfall)}` : `Pay ${formatKes(total)} from wallet`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
