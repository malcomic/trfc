import { useState } from 'react'
import { Mail, Loader, Check } from 'lucide-react'
import { resendMedalEmail } from '../api/medals'

interface MedalResendButtonProps {
  checkoutRequestId?: string
  purchaseId?: string
  paymentStatus: string
  verify?: { email?: string; phone?: string }
  className?: string
  compact?: boolean
}

export default function MedalResendButton({
  checkoutRequestId,
  purchaseId,
  paymentStatus,
  verify,
  className = '',
  compact = false,
}: MedalResendButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const canResend = paymentStatus === 'paid' && (checkoutRequestId || purchaseId)

  const handleResend = async () => {
    if (!canResend) {
      setError('Payment must be completed before resending')
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      setSuccess(false)
      await resendMedalEmail({
        checkoutRequestId,
        purchaseId,
        email: verify?.email,
        phone: verify?.phone,
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 4000)
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          err.message ||
          'Failed to resend email. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleResend}
        disabled={isLoading || !canResend}
        className={`
          inline-flex items-center justify-center gap-2 font-barlow-condensed font-black
          text-xs tracking-widest uppercase transition-colors border
          ${compact ? 'px-3 py-2' : 'px-4 py-2.5'}
          ${
            canResend
              ? 'border-white/20 light:border-black/20 text-chalk light:text-chalk-light hover:border-accent/40 light:hover:border-accent-light/40 cursor-pointer'
              : 'border-white/10 text-fog cursor-not-allowed'
          }
          ${isLoading ? 'opacity-70' : ''}
        `}
      >
        {isLoading ? (
          <>
            <Loader className="h-3.5 w-3.5 animate-spin" />
            Sending…
          </>
        ) : success ? (
          <>
            <Check className="h-3.5 w-3.5" />
            Email sent
          </>
        ) : (
          <>
            <Mail className="h-3.5 w-3.5" />
            Resend email
          </>
        )}
      </button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  )
}
