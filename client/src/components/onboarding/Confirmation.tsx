import { CheckCircle } from 'lucide-react'
import { CONFIRMATION_COPY, TIER_LABELS, type Tier } from '../../content/onboarding'
import { StepShell, StepTitle, tone } from './ui'

export default function Confirmation({
  paid,
  programName,
  tier,
}: {
  paid: boolean
  programName: string
  tier: Tier
}) {
  return (
    <StepShell eyebrow={`${programName} · ${TIER_LABELS[tier]}`}>
      <div className="text-center py-4">
        <CheckCircle className={`w-14 h-14 ${tone.accentText} mx-auto mb-6`} />
        <StepTitle>{paid ? CONFIRMATION_COPY.paidTitle : CONFIRMATION_COPY.freeTitle}</StepTitle>
        <p className={`text-base leading-relaxed ${tone.textMuted} max-w-md mx-auto mb-4`}>
          {CONFIRMATION_COPY.body}
        </p>
        <p className={`font-barlow-condensed font-bold text-lg tracking-widest uppercase ${tone.accentText}`}>
          {CONFIRMATION_COPY.signoff}
        </p>
      </div>
    </StepShell>
  )
}
