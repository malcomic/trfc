import { useState } from 'react'
import { AlertCircle, CheckCircle2, Circle, Loader } from 'lucide-react'
import { Button, FormInput } from '../ui'
import PaymentStatusModal from '../PaymentStatusModal'
import { getShortfall, payPlan, type PaymentPlan } from '../../api/wallet'
import { useAuth } from '../../context/AuthContext'
import { cardSurface } from '../../utils/themeClasses'
import { formatEventDate } from '../../utils/eventDate'
import { formatDate, formatKes } from '../../utils/captainDisplay'

const STATUS_LABELS: Record<PaymentPlan['status'], { label: string; className: string }> = {
  active: { label: 'In progress', className: 'bg-yellow-500/20 text-yellow-400' },
  completed: { label: 'Paid', className: 'bg-green-500/20 text-green-400' },
  cancelled: { label: 'Cancelled', className: 'bg-white/5 text-fog' },
  expired: { label: 'Expired', className: 'bg-red-500/20 text-red-400' },
}

interface InstallmentPlanCardProps {
  plan: PaymentPlan
  balance: number
  /** Reload plans and the wallet after a payment. */
  onChanged: () => void
  onNeedTopUp: (shortfall: number) => void
  notify: (type: 'success' | 'error', title: string, message?: string) => void
}

export default function InstallmentPlanCard({ plan, balance, onChanged, onNeedTopUp, notify }: InstallmentPlanCardProps) {
  const { user } = useAuth()
  const [mode, setMode] = useState<'next' | 'all' | null>(null)
  const [source, setSource] = useState<'wallet' | 'mpesa'>('wallet')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null)

  const unpaid = plan.installments.filter((i) => !i.paid_at)
  const next = unpaid[0]
  const remaining = Math.max(0, plan.total_amount - plan.amount_paid)
  const progress = plan.total_amount > 0 ? Math.min(100, (plan.amount_paid / plan.total_amount) * 100) : 0
  const inProgress = unpaid.some((i) => i.in_progress)
  const status = STATUS_LABELS[plan.status]
  const amountFor = (m: 'next' | 'all') => (m === 'next' ? next?.amount ?? 0 : remaining)

  const pay = async () => {
    if (!mode) return
    setSubmitting(true)
    setError('')
    try {
      const result = await payPlan(plan.id, { mode, source, phone: source === 'mpesa' ? phone : undefined })
      if (result.source === 'mpesa') {
        setCheckoutRequestId(result.checkoutRequestId)
      } else {
        notify(
          'success',
          result.completed ? 'Plan complete' : 'Installment paid',
          result.completed ? 'Your tickets have been issued and emailed to you.' : `${formatKes(result.amount)} paid from your wallet.`
        )
        setMode(null)
        onChanged()
      }
    } catch (err: any) {
      const shortfall = getShortfall(err)
      if (shortfall != null) onNeedTopUp(shortfall)
      else setError(err.response?.data?.error || 'Payment failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`${cardSurface} p-4 space-y-3`}>
      <div className="flex flex-wrap justify-between gap-3 items-start">
        <div>
          <p className="font-barlow-condensed font-bold text-lg">{plan.event_title}</p>
          <p className="text-sm text-fog light:text-fog-light">
            {formatEventDate(plan.event_date, { year: 'numeric', month: 'short', day: 'numeric' })} · {plan.quantity} ticket
            {plan.quantity === 1 ? '' : 's'} · {plan.installment_count} installments
          </p>
        </div>
        <span className={`inline-block px-2.5 py-0.5 text-xs font-bold uppercase ${status.className}`}>{status.label}</span>
      </div>

      <div>
        <div className="flex justify-between text-xs text-fog light:text-fog-light mb-1">
          <span>
            {formatKes(plan.amount_paid)} of {formatKes(plan.total_amount)} paid
          </span>
          {plan.status === 'active' && <span>{formatKes(remaining)} left</span>}
        </div>
        <div className="h-2 bg-white/10 light:bg-black/10">
          <div className="h-2 bg-accent light:bg-accent-light" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <ul className="text-sm space-y-1">
        {plan.installments.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              {i.paid_at ? (
                <CheckCircle2 size={14} className="text-green-400" />
              ) : i.in_progress ? (
                <Loader size={14} className="animate-spin text-yellow-400" />
              ) : (
                <Circle size={14} className="text-fog light:text-fog-light" />
              )}
              Payment {i.seq}
              <span className="text-fog light:text-fog-light">
                · {i.paid_at ? `paid ${formatDate(i.paid_at)}` : `due ${formatDate(i.due_at)}`}
              </span>
            </span>
            <span>{formatKes(i.amount)}</span>
          </li>
        ))}
      </ul>

      {plan.status === 'active' && next && (
        <>
          {inProgress && (
            <p className="text-xs text-yellow-400">An M-Pesa payment is being confirmed. This can take a minute.</p>
          )}
          {!mode ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setMode('next')} disabled={inProgress}>
                Pay next {formatKes(next.amount)}
              </Button>
              {unpaid.length > 1 && (
                <Button size="sm" variant="outline" onClick={() => setMode('all')} disabled={inProgress}>
                  Pay remaining {formatKes(remaining)}
                </Button>
              )}
            </div>
          ) : (
            <div className="border border-white/10 light:border-black/10 p-3 space-y-3">
              <p className="text-sm font-semibold">
                Pay {formatKes(amountFor(mode))} {mode === 'all' ? '(everything left)' : ''}
              </p>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" checked={source === 'wallet'} onChange={() => setSource('wallet')} />
                  Wallet ({formatKes(balance)})
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={source === 'mpesa'} onChange={() => setSource('mpesa')} />
                  M-Pesa
                </label>
              </div>
              {source === 'mpesa' && (
                <FormInput
                  label="M-Pesa number"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07XX XXX XXX"
                />
              )}
              {error && (
                <div className="flex gap-2 bg-red-500/10 border border-red-500/20 p-2 text-sm text-red-400">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {error}
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="secondary" onClick={() => setMode(null)} disabled={submitting}>
                  Back
                </Button>
                <Button size="sm" onClick={pay} isLoading={submitting}>
                  {source === 'wallet' ? 'Pay from wallet' : 'Send M-Pesa prompt'}
                </Button>
              </div>
            </div>
          )}
          <p className="text-xs text-fog light:text-fog-light">
            Tickets are issued when the plan is fully paid. If it isn't finished by event day, what you've paid moves to
            your wallet.
          </p>
        </>
      )}

      <PaymentStatusModal
        isOpen={!!checkoutRequestId}
        checkoutRequestId={checkoutRequestId ?? ''}
        phone={phone}
        onClose={() => {
          setCheckoutRequestId(null)
          setMode(null)
          onChanged()
        }}
      />
    </div>
  )
}
