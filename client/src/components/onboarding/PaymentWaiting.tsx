import { useEffect } from 'react'
import { Loader } from 'lucide-react'
import { usePaymentPolling } from '../../hooks/usePaymentPolling'
import { WAITING_COPY } from '../../content/onboarding'
import { StepShell, StepTitle, tone } from './ui'

export default function PaymentWaiting({
  checkoutRequestId,
  onPaid,
  onFailed,
}: {
  checkoutRequestId: string
  onPaid: () => void
  onFailed: (message: string) => void
}) {
  const { status, error } = usePaymentPolling(checkoutRequestId, true, {
    rejected: 'The payment was cancelled or declined.',
    timeout: "We couldn't confirm the payment in time. If M-Pesa deducted your money, contact us and we'll sort it out.",
    unreachable: "We couldn't check the payment status. If M-Pesa deducted your money, contact us.",
  })

  useEffect(() => {
    if (status === 'success') onPaid()
    if (status === 'failed') onFailed(error)
  }, [status])

  return (
    <StepShell>
      <div className="text-center py-6">
        <Loader className={`w-14 h-14 ${tone.accentText} animate-spin mx-auto mb-6`} />
        <StepTitle>{WAITING_COPY.title}</StepTitle>
        <p className={`text-base leading-relaxed ${tone.textMuted} max-w-md mx-auto`}>{WAITING_COPY.body}</p>
      </div>
    </StepShell>
  )
}
