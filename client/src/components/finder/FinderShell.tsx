import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PHASE_LABELS, PROMO_LINE, phaseFor, phaseProgress } from '../../content/finder/schema'
import type { FinderStepId } from '../../content/finder/types'
import CtaButton from '../programs/CtaButton'

export default function FinderShell({
  stepId,
  title,
  subtitle,
  children,
  onBack,
  onContinue,
  continueLabel = 'Continue',
  continueDisabled,
  hideContinue,
}: {
  stepId: FinderStepId
  title: string
  subtitle?: string
  children?: ReactNode
  onBack?: () => void
  onContinue?: () => void
  continueLabel?: string
  continueDisabled?: boolean
  hideContinue?: boolean
}) {
  const phase = phaseFor(stepId)
  const progress = phaseProgress(stepId)
  const highlight = (text: string) => {
    const words = ['progress', 'your path', 'ready']
    let out: ReactNode = text
    for (const word of words) {
      const re = new RegExp(`(${word})`, 'i')
      if (typeof out === 'string' && re.test(out)) {
        const parts = out.split(re)
        out = parts.map((part, i) =>
          re.test(part) ? (
            <span key={i} className="bg-cta/25 px-1 rounded-sm">
              {part}
            </span>
          ) : (
            part
          )
        )
        break
      }
    }
    return out
  }

  return (
    <div className="min-h-[100dvh] bg-white text-night light:text-night-light flex flex-col font-barlow">
      <div className="h-9 bg-night text-chalk flex items-center justify-center text-xs font-medium px-3 text-center">
        First 200 members get <span className="text-cta font-bold ml-1">Couch to 5K free</span>
        <span className="sr-only">{PROMO_LINE}</span>
      </div>

      {stepId !== 'Main' && (
        <div className="px-5 pt-3.5">
          <div className="relative h-[18px]">
            <div className="absolute left-0 right-0 top-2 h-[3px] rounded bg-black/10" />
            <div
              className="absolute left-0 top-2 h-[3px] rounded bg-cta transition-[width] duration-300"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
            {(['getting_started', 'your_goal', 'your_plan'] as const).map((p, i) => {
              const done = phase === p || (phase === 'your_goal' && i === 0) || (phase === 'your_plan' && i < 2)
              const left = i === 0 ? '0' : i === 1 ? 'calc(50% - 7px)' : 'auto'
              const right = i === 2 ? '0' : undefined
              return (
                <div
                  key={p}
                  className={`absolute top-0.5 w-3.5 h-3.5 rounded-full ${done ? 'bg-cta' : 'bg-black/15'}`}
                  style={{ left, right }}
                />
              )
            })}
          </div>
          <div className="flex justify-between text-[11px] text-fog mt-1.5">
            {(['getting_started', 'your_goal', 'your_plan'] as const).map((p) => (
              <span key={p} className={phase === p ? 'font-semibold text-night' : ''}>
                {PHASE_LABELS[p]}
              </span>
            ))}
          </div>
        </div>
      )}

      {onBack && stepId !== 'Main' && (
        <div className="px-5 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="text-[13px] text-fog min-h-8 inline-flex items-center bg-transparent border-0 cursor-pointer p-0"
          >
            ‹ Back
          </button>
        </div>
      )}

      <div className="flex-1 px-5 py-4 flex flex-col items-center gap-3.5 text-center max-w-lg mx-auto w-full">
        {stepId === 'Main' && (
          <div className="w-full flex items-center justify-between pt-2">
            <Link to="/" className="font-bebas text-lg tracking-[0.12em] text-night no-underline">
              TRFC
            </Link>
            <span className="text-[11px] text-fog">Thika Road Fitness Community</span>
          </div>
        )}
        <h1 className="m-0 font-barlow-condensed font-bold text-[26px] leading-[1.2] text-night">{highlight(title)}</h1>
        {subtitle && <p className="m-0 text-[13px] leading-snug text-fog">{subtitle}</p>}
        <div className="w-full flex flex-col gap-2.5 mt-1 text-left">{children}</div>
      </div>

      {!hideContinue && onContinue && (
        <div className="px-5 pb-7 max-w-lg mx-auto w-full">
          <CtaButton onClick={onContinue} disabled={continueDisabled} className="w-full !rounded-full">
            {continueLabel}
          </CtaButton>
        </div>
      )}
    </div>
  )
}
