import { useEffect, useState } from 'react'
import { checkPaymentStatus } from '../api/payments'

export type PaymentPollStatus = 'pending' | 'success' | 'failed'

const MAX_ATTEMPTS = 100
const POLL_INTERVAL_MS = 3000

function isPaymentSuccess(result: Record<string, unknown>) {
  const resultCode = result.ResultCode ?? result.resultCode
  const responseCode = result.ResponseCode ?? result.responseCode
  return (
    resultCode === '0' ||
    resultCode === 0 ||
    responseCode === '0' ||
    responseCode === 0 ||
    result.payment_status === 'paid'
  )
}

function isPaymentFailed(result: Record<string, unknown>) {
  const resultCode = result.ResultCode ?? result.resultCode
  return resultCode === '1' || resultCode === 1 || result.payment_status === 'failed'
}

export interface PaymentPollingMessages {
  rejected?: string
  timeout?: string
  unreachable?: string
}

const DEFAULT_MESSAGES: Required<PaymentPollingMessages> = {
  rejected: 'Payment was rejected. Please try again.',
  timeout:
    'Payment confirmation timeout. If M-Pesa deducted your money, close this and check your ticket confirmation page.',
  unreachable: 'Unable to verify payment status. Please check M-Pesa.',
}

export function usePaymentPolling(
  checkoutRequestId: string | null | undefined,
  enabled: boolean,
  messages: PaymentPollingMessages = {}
) {
  const [status, setStatus] = useState<PaymentPollStatus>('pending')
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const msgs = { ...DEFAULT_MESSAGES, ...messages }

  useEffect(() => {
    setStatus('pending')
    setError('')
    setAttempts(0)
  }, [checkoutRequestId])

  useEffect(() => {
    if (!enabled || !checkoutRequestId || status !== 'pending') return

    const checkStatus = async () => {
      try {
        const result = await checkPaymentStatus(checkoutRequestId)

        if (isPaymentSuccess(result)) {
          setStatus('success')
          return
        }
        if (isPaymentFailed(result)) {
          setError(msgs.rejected)
          setStatus('failed')
          return
        }
        if (attempts < MAX_ATTEMPTS) {
          setAttempts((prev) => prev + 1)
        } else {
          setError(msgs.timeout)
          setStatus('failed')
        }
      } catch {
        if (attempts < MAX_ATTEMPTS) {
          setAttempts((prev) => prev + 1)
        } else {
          setError(msgs.unreachable)
          setStatus('failed')
        }
      }
    }

    const timer = setTimeout(() => {
      void checkStatus()
    }, attempts === 0 ? 1000 : POLL_INTERVAL_MS)

    return () => clearTimeout(timer)
  }, [enabled, checkoutRequestId, attempts, status])

  return { status, error }
}
