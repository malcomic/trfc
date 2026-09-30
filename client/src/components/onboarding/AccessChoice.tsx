import type { ReactNode } from 'react'
import type { Program } from '../../content/programs'
import { ACCESS_COPY, type Tier } from '../../content/onboarding'
import { StepShell, StepTitle } from './ui'

function TierCard({
  name,
  description,
  price,
  button,
  onClick,
  highlighted,
  locked,
}: {
  name: ReactNode
  description: string
  price?: string
  button: string
  onClick: () => void
  highlighted?: boolean
  locked?: boolean
}) {
  return (
    <div
      className={`flex flex-col p-5 border ${
        highlighted ? 'border-accent bg-accent/10' : 'border-white/15 bg-white/5'
      } ${locked ? 'opacity-90' : ''}`}
    >
      {locked && (
        <span className="self-start font-barlow-condensed font-bold text-[11px] tracking-widest uppercase text-white/70 border border-white/25 px-2 py-0.5 mb-3">
          {ACCESS_COPY.locked.badge}
        </span>
      )}
      <h3 className="font-bebas text-3xl leading-none text-white mb-2">{name}</h3>
      <p className="text-sm text-white/85 mb-2">{description}</p>
      {price && <p className="text-xs text-white/60 leading-relaxed mb-4">{price}</p>}
      <button
        type="button"
        onClick={onClick}
        className={`mt-auto font-barlow-condensed font-black text-sm tracking-wider uppercase px-5 py-3 transition-all duration-200 ${
          highlighted
            ? 'bg-accent text-black hover:bg-accent/90'
            : 'border border-white/40 text-white hover:border-accent hover:text-accent'
        }`}
      >
        {button}
      </button>
    </div>
  )
}

export default function AccessChoice({
  program,
  onChoose,
  onSwitchToFoundations,
  onBack,
}: {
  program: Program
  onChoose: (tier: Tier) => void
  onSwitchToFoundations: () => void
  onBack: () => void
}) {
  const { elite } = ACCESS_COPY

  return (
    <StepShell eyebrow={program.name} onBack={onBack}>
      <StepTitle>{ACCESS_COPY.title}</StepTitle>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
        {program.requiresPaid ? (
          <>
            <TierCard
              locked
              name={ACCESS_COPY.locked.free.name}
              description={ACCESS_COPY.locked.free.description(program.name)}
              button={ACCESS_COPY.locked.free.button}
              onClick={onSwitchToFoundations}
            />
            <TierCard
              highlighted
              name={ACCESS_COPY.locked.plus.name(program.name)}
              description={ACCESS_COPY.locked.plus.description}
              price={ACCESS_COPY.plusPrice}
              button={ACCESS_COPY.locked.plus.button}
              onClick={() => onChoose('plus')}
            />
          </>
        ) : (
          <>
            <TierCard
              highlighted
              name={ACCESS_COPY.foundations.free.name}
              description={ACCESS_COPY.foundations.free.description}
              price={ACCESS_COPY.foundations.free.price}
              button={ACCESS_COPY.foundations.free.button}
              onClick={() => onChoose('free')}
            />
            <TierCard
              name={ACCESS_COPY.foundations.plus.name}
              description={ACCESS_COPY.foundations.plus.description}
              price={ACCESS_COPY.plusPrice}
              button={ACCESS_COPY.foundations.plus.button}
              onClick={() => onChoose('plus')}
            />
          </>
        )}
        <TierCard
          name={elite.name}
          description={elite.description}
          price={elite.price}
          button={elite.button}
          onClick={() => onChoose('elite')}
        />
      </div>
    </StepShell>
  )
}
