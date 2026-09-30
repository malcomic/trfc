import { CHECKOUT_COPY, formatLocalPhone } from '../../content/onboarding'
import { ErrorNote, PrimaryButton, StepShell, StepTitle } from './ui'

export default function MpesaCheckout({
  eyebrow,
  phone,
  amount,
  isReturning,
  sending,
  error,
  onSend,
  onBack,
}: {
  eyebrow: string
  phone: string
  amount: number
  isReturning: boolean
  sending: boolean
  error: string
  onSend: () => void
  onBack: () => void
}) {
  return (
    <StepShell eyebrow={eyebrow} onBack={onBack}>
      <StepTitle>{CHECKOUT_COPY.title}</StepTitle>
      <p className="text-base leading-relaxed text-white/80 mb-6">
        {CHECKOUT_COPY.body(formatLocalPhone(phone))}
      </p>

      <div className="border border-white/15 bg-white/5 px-5 py-4 mb-6">
        <p className="font-bebas text-4xl text-accent leading-none">{CHECKOUT_COPY.amount(amount)}</p>
        {isReturning && <p className="text-xs text-white/60 mt-2">{CHECKOUT_COPY.returningNote}</p>}
      </div>

      <ErrorNote message={error} />

      <PrimaryButton onClick={onSend} disabled={sending} className="w-full sm:w-auto">
        {sending ? 'Sending…' : CHECKOUT_COPY.button}
      </PrimaryButton>
    </StepShell>
  )
}
