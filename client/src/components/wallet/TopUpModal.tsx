import { FormEvent, useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle, Loader } from 'lucide-react'
import { Modal, Button, FormInput } from '../ui'
import { MAX_TOPUP, MIN_TOPUP, topUpWallet } from '../../api/wallet'
import { usePaymentPolling } from '../../hooks/usePaymentPolling'
import { useAuth } from '../../context/AuthContext'
import { formatKes } from '../../utils/captainDisplay'

interface TopUpModalProps {
  isOpen: boolean
  onClose: () => void
  /** Called once the M-Pesa payment is confirmed and the wallet has been credited. */
  onSuccess: (amount: number) => void
  defaultAmount?: number
  title?: string
  /** Wallet limit and remaining top-up room; omit to allow up to the per-transaction maximum. */
  cap?: number
  headroom?: number
}

const QUICK_AMOUNTS = [500, 1000, 2000, 5000]

export default function TopUpModal({
  isOpen,
  onClose,
  onSuccess,
  defaultAmount,
  title = 'Top up wallet',
  cap,
  headroom,
}: TopUpModalProps) {
  const { user } = useAuth()
  const maxAmount = headroom == null ? MAX_TOPUP : Math.min(MAX_TOPUP, Math.floor(headroom))
  const atLimit = maxAmount < MIN_TOPUP
  const initialAmount = defaultAmount ? String(Math.min(Math.ceil(defaultAmount), Math.max(maxAmount, 0))) : ''
  const shortOfNeed = defaultAmount != null && !atLimit && Math.ceil(defaultAmount) > maxAmount
  const [amount, setAmount] = useState(initialAmount)
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null)
  const notified = useRef(false)

  const { status, error: pollError } = usePaymentPolling(checkoutRequestId, isOpen && !!checkoutRequestId, {
    rejected: 'The M-Pesa payment was cancelled or failed. Nothing was added to your wallet.',
  })

  useEffect(() => {
    if (!isOpen) return
    setAmount(initialAmount)
    setPhone(user?.phone ?? '')
    setError('')
    setCheckoutRequestId(null)
    notified.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultAmount, user?.phone])

  useEffect(() => {
    if (status === 'success' && checkoutRequestId && !notified.current) {
      notified.current = true
      onSuccess(Number(amount))
    }
  }, [status, checkoutRequestId, amount, onSuccess])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const result = await topUpWallet({ amount: Number(amount), phone })
      setCheckoutRequestId(result.checkoutRequestId)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not start the top-up. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const waiting = !!checkoutRequestId

  return (
    <Modal isOpen={isOpen} onClose={status === 'pending' && waiting ? () => undefined : onClose} title={title}>
      {!waiting && atLimit && (
        <div className="space-y-4">
          <p className="text-sm text-fog light:text-fog-light">
            Your wallet is at its limit{cap != null ? ` of ${formatKes(cap)}` : ''}. The limit follows the cost of
            upcoming events, so spend some of your balance on tickets before topping up again.
          </p>
          <div className="flex justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
      {!waiting && !atLimit && (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-fog light:text-fog-light">
            Wallet funds can be used for event tickets and installments. They are non-refundable.
          </p>
          {headroom != null && cap != null && (
            <p className="text-sm text-chalk light:text-chalk-light">
              You can add up to <strong>{formatKes(maxAmount)}</strong> (wallet limit {formatKes(cap)}).
            </p>
          )}
          {shortOfNeed && (
            <p className="text-sm text-yellow-400 light:text-yellow-700">
              You need {formatKes(Math.ceil(defaultAmount!))}, but your wallet limit only allows {formatKes(maxAmount)}{' '}
              more. Pay the rest directly with M-Pesa at checkout.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.filter((value) => value <= maxAmount).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAmount(String(value))}
                className={`px-3 py-1.5 text-sm border ${
                  Number(amount) === value
                    ? 'border-accent light:border-accent-light text-accent light:text-accent-light'
                    : 'border-white/10 light:border-black/10 text-fog light:text-fog-light'
                }`}
              >
                {formatKes(value)}
              </button>
            ))}
          </div>
          <FormInput
            label="Amount (KES)"
            type="number"
            min={MIN_TOPUP}
            max={maxAmount}
            step={1}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <FormInput
            label="M-Pesa number"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07XX XXX XXX"
          />
          {error && (
            <div className="flex gap-2 bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Send M-Pesa prompt
            </Button>
          </div>
        </form>
      )}

      {waiting && status === 'pending' && (
        <div className="text-center py-4">
          <Loader className="w-12 h-12 animate-spin text-accent light:text-accent-light mx-auto mb-4" />
          <p className="font-barlow-condensed font-bold text-lg">Check your phone</p>
          <p className="text-sm text-fog light:text-fog-light mt-1">
            Enter your M-Pesa PIN to add {formatKes(Number(amount))} to your wallet.
          </p>
        </div>
      )}
      {waiting && status === 'success' && (
        <div className="text-center py-4 space-y-4">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
          <p className="font-barlow-condensed font-bold text-lg">{formatKes(Number(amount))} added to your wallet</p>
          <Button onClick={onClose}>Done</Button>
        </div>
      )}
      {waiting && status === 'failed' && (
        <div className="text-center py-4 space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <p className="text-sm text-fog light:text-fog-light">{pollError}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => setCheckoutRequestId(null)}>Try again</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
