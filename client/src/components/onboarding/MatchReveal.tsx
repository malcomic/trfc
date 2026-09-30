import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { SUMMARY_LABELS, type Program } from '../../content/programs'
import { MATCH_COPY } from '../../content/onboarding'
import { PrimaryButton, StepShell, StepTitle } from './ui'

function LearnMore({ program }: { program: Program }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-t border-white/10 mt-6 pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between font-barlow-condensed font-bold text-sm tracking-widest uppercase text-accent hover:text-accent/80 transition-colors"
      >
        <span>{MATCH_COPY.learnMore}</span>
        <ChevronDown size={18} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-5 space-y-5">
          {program.detail.map((section) => (
            <div key={section.title}>
              <h3 className="font-barlow-condensed font-bold text-lg tracking-tight text-white mb-1.5">
                {section.title}
              </h3>
              {section.body && <p className="text-sm leading-relaxed text-white/70">{section.body}</p>}
              {section.items && (
                <ul className="list-disc pl-5 space-y-1 text-sm text-white/70">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MatchReveal({
  program,
  onContinue,
  onBack,
}: {
  program: Program
  onContinue: () => void
  onBack: () => void
}) {
  return (
    <StepShell eyebrow="Your match" onBack={onBack}>
      <StepTitle>{program.headline}</StepTitle>
      <p className="text-base md:text-lg leading-relaxed text-white/80 mb-6">{program.tagline}</p>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/10 border border-white/10">
        {SUMMARY_LABELS.map(({ key, label }) => (
          <div key={key} className="bg-black/60 px-4 py-3">
            <dt className="font-barlow-condensed font-bold text-[11px] tracking-widest uppercase text-accent mb-0.5">
              {label}
            </dt>
            <dd className="text-sm text-white/90">{program.summary[key]}</dd>
          </div>
        ))}
      </dl>

      <LearnMore program={program} />

      <p className="font-barlow-condensed font-bold text-lg tracking-tight text-white mt-8 mb-4">
        {MATCH_COPY.almostThere}
      </p>
      <PrimaryButton onClick={onContinue}>Continue</PrimaryButton>
    </StepShell>
  )
}
