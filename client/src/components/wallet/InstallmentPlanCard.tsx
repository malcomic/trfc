import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Circle } from 'lucide-react'
import { Button, FormInput } from '../ui'
import PaymentStatusModal from '../PaymentStatusModal'
import { formatCreditDate, payPlan, releasePlan, setPendingMove, type PaymentPlan } from '../../api/wallet'
import { useAuth } from '../../context/AuthContext'
import { cardSurface } from '../../utils/themeClasses'
import { formatEventDate } from '../../utils/eventDate'
import { formatDate, formatKes } from '../../utils/captainDisplay'

const STATUS_LABELS: Record<PaymentPlan['status'], { label: string; className: string }> = {
  active: { label: 'In progress', className: 'bg-yellow-500/20 text-yellow-400' },
  completed: { label: 'Paid', className: 'bg-green-500/20 text-green-400' },
  cancelled: { label: 'Moved to ticket value', className: 'bg-white/5 text-fog' },
  expired: { label: 'Deadline missed', className: 'bg-red-500/20 text-red-400' },
  moved: { label: 'Moved to another event', className: 'bg-white/5 text-fog' },
}

interface InstallmentPlanCardProps {
  plan: PaymentPlan
  ticketValue: number
  /** Reload plans and ticket value after a change. */
  onChanged: () => void
  notify: (type: 'success' | 'error', title: string, message?: string) => void
}

/** A part-paid ticket: what's paid, what's left, the deadline, and ways to pay. */
export default function InstallmentPlanCard({ plan, ticketValue, onChanged, notify }: InstallmentPlanCardProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'next' | 'all' | null>(null)
  const [source, setSource] = useState<'credit' | 'mpesa'>('mpesa')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [confirmRelease, setConfirmRelease] = useState(false)
  const [error, setError] = useState('')
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null)

  const unpaid = plan.installments.filter((i) => !i.paid_at)
  const next = unpaid[0]
  const left = Math.max(0, plan.total_amount - plan.amount_paid)
  const progress = plan.total_amount > 0 ? Math.min(100, (plan.amount_paid / plan.total_amount) * 100) : 0
  const inProgress = plan.payment_in_progress
  const status = STATUS_LABELS[plan.status]
  const nextAmount = next ? Math.min(left, plan.installments.filter((i) => i.seq <= next.seq).reduce((s, i) => s + i.amount, 0) - plan.amount_paid) : 0
  const amountFor = (m: 'next' | 'all') => (m === 'next' ? nextAmount : left)

  const start = (m: 'next' | 'all') => {
    setSource(ticketValue > 0 ? 'credit' : 'mpesa')
    setError('')
    setMode(m)
  }

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
          result.completed ? 'Ticket fully paid' : 'Payment made',
          result.completed
            ? 'Your QR ticket has been emailed to you.'
            : `${formatKes(result.amount)} of ticket value used.`
        )
        setMode(null)
        onChanged()
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Payment failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const moveToAnotherEvent = () => {
    setPendingMove({ planId: plan.id, eventId: plan.event_id, eventTitle: plan.event_title, amountPaid: plan.amount_paid })
    navigate('/events')
  }

  const release = async () => {
    setSubmitting(true)
    setError('')
    try {
      const result = await releasePlan(plan.id)
      notify(
        'success',
        'Moved to ticket value',
        result.credited > 0
          ? `${formatKes(result.credited)} is now ticket value${result.expiresAt ? `, usable until ${formatCreditDate(result.expiresAt)}` : ''}.`
          : 'Your seat has been released.'
      )
      setConfirmRelease(false)
      onChanged()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not release this ticket. Please try again.')
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
            {plan.quantity === 1 ? '' : 's'}
          </p>
        </div>
        <span className={`inline-block px-2.5 py-0.5 text-xs font-bold uppercase ${status.className}`}>{status.label}</span>
      </div>

      <div>
        <div className="flex flex-wrap justify-between gap-2 text-xs text-fog light:text-fog-light mb-1">
          <span>
            {formatKes(plan.amount_paid)} of {formatKes(plan.total_amount)} paid
          </span>
          {plan.status === 'active' && <span>{formatKes(left)} left to pay</span>}
        </div>
        <div className="h-2 bg-white/10 light:bg-black/10">
          <div className="h-2 bg-accent light:bg-accent-light" style={{ width: `${progress}%` }} />
        </div>
        {plan.status === 'active' && plan.deadline_at && (
          <p className="text-xs text-amber-400 mt-1">Pay everything by {formatCreditDate(plan.deadline_at)}, 11:59 pm.</p>
        )}
      </div>

      <ul className="text-sm space-y-1">
        {plan.installments.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              {i.paid_at ? (
                <CheckCircle2 size={14} className="text-green-400" />
              ) : (
                <Circle size={14} className="text-fog light:text-fog-light" />
              )}
              {i.seq === 1 ? 'First payment' : `Payment ${i.seq}`}
              <span className="text-fog light:text-fog-light">
                · {i.paid_at ? `paid ${formatDate(i.paid_at)}` : `by ${formatDate(i.due_at)}`}
              </span>
            </span>
            <span>{formatKes(i.amount)}</span>
          </li>
        ))}
      </ul>

      {plan.status === 'active' && (
        <>
          {inProgress && (
            <p className="text-xs text-yellow-400">An M-Pesa payment is being confirmed. This can take a minute.</p>
          )}
          {!mode && !confirmRelease && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => start('all')} disabled={inProgress}>
                Pay balance {formatKes(left)}
              </Button>
              {next && nextAmount > 0 && nextAmount < left && (
                <Button size="sm" variant="outline" onClick={() => start('next')} disabled={inProgress}>
                  Pay next part early {formatKes(nextAmount)}
                </Button>
              )}
              {plan.amount_paid > 0 && (
                <Button size="sm" variant="outline" onClick={moveToAnotherEvent} disabled={inProgress}>
                  Use on another event
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => setConfirmRelease(true)} disabled={inProgress}>
                I can't make it
              </Button>
            </div>
          )}

          {mode && (
            <div className="border border-white/10 light:border-black/10 p-3 space-y-3">
              <p className="text-sm font-semibold">
                Pay {formatKes(amountFor(mode))} {mode === 'all' ? '(everything left)' : ''}
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                {ticketValue > 0 && (
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={source === 'credit'} onChange={() => setSource('credit')} />
                    Ticket value ({formatKes(ticketValue)})
                  </label>
                )}
                <label className="flex items-center gap-2">
                  <input type="radio" checked={source === 'mpesa'} onChange={() => setSource('mpesa')} />
                  M-Pesa
                </label>
              </div>
              {source === 'credit' && ticketValue < amountFor(mode) && (
                <p className="text-xs text-fog light:text-fog-light">
                  {formatKes(ticketValue)} of ticket value will be used. Pay the rest by M-Pesa afterwards.
                </p>
              )}
              {source === 'mpesa' && (
                <FormInput
                  label="M-Pesa number"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07XX XXX XXX"
                />
              )}
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="secondary" onClick={() => setMode(null)} disabled={submitting}>
                  Back
                </Button>
                <Button size="sm" onClick={pay} isLoading={submitting}>
                  {source === 'credit' ? 'Use ticket value' : 'Send M-Pesa prompt'}
                </Button>
              </div>
            </div>
          )}

          {confirmRelease && (
            <div className="border border-amber-500/30 p-3 space-y-3 text-sm">
              <p>
                Your seat will be released and the {formatKes(plan.amount_paid)} you've paid becomes ticket value straight
                away. You can use it on another event.
              </p>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="secondary" onClick={() => setConfirmRelease(false)} disabled={submitting}>
                  Keep my ticket
                </Button>
                <Button size="sm" onClick={release} isLoading={submitting}>
                  Release seat
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="flex gap-2 bg-red-500/10 border border-red-500/20 p-2 text-sm text-red-400">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}
          <p className="text-xs text-fog light:text-fog-light">
            Your QR ticket is issued once everything is paid. If it isn't fully paid by the deadline, the seat is released
            and what you paid becomes ticket value.
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
