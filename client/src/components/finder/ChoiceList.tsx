import type { ChoiceOption } from '../../content/finder/questions'

const base =
  'w-full min-h-[56px] px-4 py-3 text-left rounded-lg font-barlow text-[15px] border-[1.5px] transition-colors cursor-pointer'
const off = 'bg-black/[0.04] text-night border-transparent hover:border-black/20'
const on = 'bg-cta/20 border-cta font-medium text-night'

export function ChoiceList({
  options,
  value,
  onPick,
}: {
  options: ChoiceOption[]
  value?: string | null
  onPick: (value: string) => void
}) {
  return (
    <div className="w-full flex flex-col gap-2.5">
      {options.map((option) => {
        const selected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onPick(option.value)}
            className={`${base} ${selected ? on : off}`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function MultiChoiceList({
  options,
  values,
  max,
  onChange,
}: {
  options: ChoiceOption[]
  values: string[]
  max: number
  onChange: (next: string[]) => void
}) {
  return (
    <div className="w-full flex flex-col gap-2.5">
      {options.map((option) => {
        const selected = values.includes(option.value)
        const locked = !selected && values.length >= max
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            disabled={locked}
            onClick={() => {
              if (selected) onChange(values.filter((v) => v !== option.value))
              else if (!locked) onChange([...values, option.value])
            }}
            className={`${base} ${selected ? on : off} ${locked ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
