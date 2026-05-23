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
    } catch (err: any) {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        {/* Header */}
        <div className="bg-primary text-white p-6 rounded-t-lg">
          <h2 className="text-2xl font-bold">Payment Status</h2>
          <p className="text-sm opacity-90">M-Pesa transaction</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {status === 'pending' && (
            <div className="text-center">
              <Loader className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
              <p className="font-semibold text-lg mb-2">Waiting for Payment Confirmation</p>
              <p className="text-gray-600 text-sm mb-4">
                We're waiting for payment confirmation on
              </p>
              <div className="bg-gray-50 p-3 rounded mb-4 font-mono text-sm font-semibold break-all">
                {phone}
              </div>
              <p className="text-xs text-gray-500">
                Check your phone for the M-Pesa prompt. Enter your PIN to complete the
                transaction.
              </p>
              <div className="mt-6 text-sm text-gray-600">
                <p>This window will close automatically once payment is confirmed.</p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="font-semibold text-lg mb-2">Payment Successful!</p>
              <p className="text-gray-600 text-sm mb-4">Your order has been confirmed.</p>
              <div className="bg-green-50 border border-green-200 p-4 rounded text-sm text-green-800 mb-4">
                <p className="font-semibold">Transaction Confirmed</p>
                <p className="text-xs mt-1">You will receive a confirmation email shortly.</p>
              </div>
            </div>
          )}

          {status === 'failed' && (
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <p className="font-semibold text-lg mb-2">Payment Failed</p>
              <p className="text-gray-600 text-sm mb-4">{error}</p>
              <div className="bg-red-50 border border-red-200 p-4 rounded text-sm text-red-800">
                <p>Please try again or contact support for assistance.</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-gray-100 border-t px-6 py-4">
          {status !== 'pending' && (
            <button
              onClick={onClose}
              className="w-full bg-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 font-semibold"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
