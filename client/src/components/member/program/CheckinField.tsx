import type { CheckinQuestion } from '../../../api/programs'
import { PROGRAM_COPY } from '../../../content/programPages'
import { inputField } from '../../../utils/themeClasses'

interface CheckinFieldProps {
  question: CheckinQuestion
  value: string
  onChange: (value: string) => void
}

export default function CheckinField({ question, value, onChange }: CheckinFieldProps) {
  const legend = (
    <legend className="font-barlow font-semibold text-chalk light:text-chalk-light mb-3">
      {question.label}
      {!question.required && (
        <span className="ml-2 text-xs font-normal text-fog light:text-fog-light">{PROGRAM_COPY.checkin.optional}</span>
      )}
    </legend>
  )

  if (question.type === 'text' || !question.options?.length) {
    return (
      <fieldset>
        {legend}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          maxLength={1000}
          className={`${inputField} w-full rounded-lg px-4 py-3`}
        />
      </fieldset>
    )
  }

  return (
    <fieldset>
      {legend}
      <div className="flex flex-wrap gap-2" role="radiogroup">
        {question.options.map((option) => {
          const selected = value === option
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option)}
              className={`min-h-[44px] px-4 rounded-full border font-barlow font-semibold transition-colors ${
                selected
                  ? 'bg-cta border-cta text-cta-ink'
                  : 'border-mist light:border-mist-light text-chalk light:text-chalk-light hover:border-cta'
              }`}
            >
              {option}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
