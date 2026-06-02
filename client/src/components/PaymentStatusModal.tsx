import { AlertCircle, CheckCircle, Loader } from 'lucide-react'
import { useEffect, useState } from 'react'
import { checkPaymentStatus } from '../api/payments'

interface PaymentStatusModalProps {
  isOpen: boolean
  checkoutRequestId: string
  phone: string
  onClose: () => void
}

export default function PaymentStatusModal({
  isOpen,
  checkoutRequestId,
  phone,
  onClose,
}: PaymentStatusModalProps) {
  const [status, setStatus] = useState<'pending' | 'success' | 'failed'>('pending')
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    if (!isOpen || !checkoutRequestId) return

    const timer = setTimeout(() => {
      checkStatus()
    }, 1000)

    return () => clearTimeout(timer)
  }, [isOpen, checkoutRequestId, attempts])

  const checkStatus = async () => {
    try {
      const result = await checkPaymentStatus(checkoutRequestId)

      if (result.ResultCode === '0' || result.ResultCode === 0) {
        setStatus('success')
      } else if (result.ResultCode === '1') {
        setError('Payment was rejected. Please try again.')
        setStatus('failed')
      } else {
        if (attempts < 60) {
          setAttempts(attempts + 1)
        } else {
          setError('Payment confirmation timeout. Please check your M-Pesa')
          setStatus('failed')
        }
      }
    } catch {
      if (attempts < 60) {
        setAttempts(attempts + 1)
      } else {
        setError('Unable to verify payment status. Please check M-Pesa.')
        setStatus('failed')
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-ash border border-white/10 clip-angled-sm shadow-lg max-w-md w-full font-barlow">
        <div className="bg-fire text-white px-6 py-5 border-b border-white/10">
          <h2 className="font-bebas text-3xl leading-tight">PAYMENT STATUS</h2>
          <p className="font-barlow-condensed text-xs letter-spacing-widest text-transform-uppercase text-white/80 mt-1">M-Pesa transaction</p>
        </div>

        <div className="p-6 text-chalk">
          {status === 'pending' && (
            <div className="text-center">
              <Loader className="w-14 h-14 text-fire animate-spin mx-auto mb-4" />
              <p className="font-barlow-condensed font-bold text-lg letter-spacing-tighter mb-2">Waiting for Confirmation</p>
              <p className="text-fog text-sm mb-4">
                We&apos;re waiting for payment confirmation on
              </p>
              <div className="bg-smoke border border-white/10 p-3 mb-4 font-mono text-sm font-semibold break-all text-chalk">
                {phone}
              </div>
              <p className="text-xs text-fog">
                Check your phone for the M-Pesa prompt. Enter your PIN to complete the transaction.
              </p>
              <p className="mt-6 text-sm text-fog">This window will close automatically once payment is confirmed.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-4" />
              <p className="font-barlow-condensed font-bold text-lg letter-spacing-tighter mb-2">Payment Successful!</p>
              <p className="text-fog text-sm mb-4">Your order has been confirmed.</p>
              <div className="bg-green-500/10 border border-green-500/25 p-4 text-sm text-green-300">
                <p className="font-semibold">Transaction Confirmed</p>
                <p className="text-xs mt-1 text-fog">You will receive a confirmation email shortly.</p>
              </div>
            </div>
          )}

          {status === 'failed' && (
            <div className="text-center">
              <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
              <p className="font-barlow-condensed font-bold text-lg letter-spacing-tighter mb-2">Payment Failed</p>
              <p className="text-fog text-sm mb-4">{error}</p>
              <div className="bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-300">
                <p>Please try again or contact support for assistance.</p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-white/10 px-6 py-4 bg-night/50">
          {status !== 'pending' && (
            <button
              onClick={onClose}
              className="w-full bg-fire text-white px-4 py-3 font-barlow-condensed font-black text-sm letter-spacing-widest text-transform-uppercase clip-angled hover:bg-ember transition-colors duration-200"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
