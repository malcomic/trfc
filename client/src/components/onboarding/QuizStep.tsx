import { StepShell, StepTitle, tone } from './ui'

interface QuizStepProps<T extends string> {
  eyebrow: string
  prompt: string
  options: { value: T; label: string }[]
  selected?: T
  onSelect: (value: T) => void
  onBack: () => void
}

export default function QuizStep<T extends string>({
  eyebrow,
  prompt,
  options,
  selected,
  onSelect,
  onBack,
}: QuizStepProps<T>) {
  return (
    <StepShell eyebrow={eyebrow} onBack={onBack}>
      <StepTitle>{prompt}</StepTitle>
      <div className="grid gap-3 mt-6">
        {options.map((option) => {
          const isSelected = option.value === selected
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={`text-left px-5 py-4 md:py-5 border transition-all duration-200 font-barlow-condensed font-bold text-lg md:text-xl tracking-tight flex items-center justify-between gap-4 group ${
                isSelected
                  ? `${tone.accentBorder} bg-accent/15 light:bg-accent-light/10 ${tone.text}`
                  : `${tone.border} ${tone.surface} ${tone.textStrong} ${tone.hoverAccentBorder} ${tone.hoverAccentSoftBg}`
              }`}
            >
              <span>{option.label}</span>
              <span className={`${tone.accentText} opacity-60 group-hover:opacity-100 transition-opacity`}>→</span>
            </button>
          )
        })}
      </div>
    </StepShell>
  )
}
