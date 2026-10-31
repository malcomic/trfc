import { useEffect, useMemo, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Modal, Button, FormInput } from '../ui'
import PaymentStatusModal from '../PaymentStatusModal'
import { TICKET_VALUE_NOTE, payWithCredit, type CreditCheckoutResult, type PayableBatch } from '../../api/wallet'
import { useAuth } from '../../context/AuthContext'
import { formatEventDate } from '../../utils/eventDate'
import { formatKes } from '../../utils/captainDisplay'

interface PayEventsModalProps {
  isOpen: boolean
  onClose: () => void
  batches: PayableBatch[]
  ticketValue: number
  /** Called once the tickets are paid (straight away, or after the M-Pesa prompt is answered). */
  onPaid: (result: CreditCheckoutResult) => void
}

export default function PayEventsModal({ isOpen, onClose, batches, ticketValue, onPaid }: PayEventsModalProps) {
  const { user } = useAuth()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [useCredit, setUseCredit] = useState(true)
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState<Extract<CreditCheckoutResult, { status: 'mpesa' }> | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setSelected(new Set(batches.map((b) => b.purchase_batch_id)))
    setUseCredit(ticketValue > 0)
    setPhone(user?.phone ?? '')
    setError('')
  }, [isOpen, batches, ticketValue, user?.phone])

  const total = useMemo(
    () => batches.filter((b) => selected.has(b.purchase_batch_id)).reduce((sum, b) => sum + Number(b.total), 0),
    [batches, selected]
  )
  const fromCredit = useCredit ? Math.min(total, ticketValue) : 0
  const byMpesa = Math.max(0, total - fromCredit)

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const pay = async () => {
    setSubmitting(true)
    setError('')
    try {
      const result = await payWithCredit({
        purchaseBatchIds: [...selected],
        useCredit,
        phone: byMpesa > 0 ? phone : undefined,
      })
      if (result.status === 'paid') onPaid(result)
      else setPending(result)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Payment failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Modal isOpen={isOpen && !pending} onClose={onClose} title="Pay for booked tickets" size="lg">
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

          {ticketValue > 0 && (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={useCredit} onChange={(e) => setUseCredit(e.target.checked)} />
              <span>
                Use my ticket value ({formatKes(ticketValue)})
                <span className="block text-xs text-fog light:text-fog-light">
                  The oldest value is used first. {TICKET_VALUE_NOTE}
                </span>
              </span>
            </label>
          )}

          <div className="space-y-1 text-sm border-t border-white/10 light:border-black/10 pt-3">
            <div className="flex justify-between">
              <span className="text-fog light:text-fog-light">Total</span>
              <span>{formatKes(total)}</span>
            </div>
            {fromCredit > 0 && (
              <div className="flex justify-between">
                <span className="text-fog light:text-fog-light">From ticket value</span>
                <span>−{formatKes(fromCredit)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <span>To pay by M-Pesa</span>
              <span>{formatKes(byMpesa)}</span>
            </div>
          </div>
          {byMpesa > 0 && (
            <FormInput
              label="M-Pesa number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07XX XXX XXX"
            />
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
            <Button onClick={pay} isLoading={submitting} disabled={selected.size === 0 || (byMpesa > 0 && !phone)}>
              {byMpesa > 0 ? `Pay ${formatKes(byMpesa)} by M-Pesa` : `Use ${formatKes(fromCredit)} ticket value`}
            </Button>
          </div>
        </div>
      </Modal>
      <PaymentStatusModal
        isOpen={!!pending}
        checkoutRequestId={pending?.checkoutRequestId ?? ''}
        phone={phone}
        onClose={() => {
          const done = pending
          setPending(null)
          if (done) onPaid(done)
        }}
      />
    </>
  )
}
