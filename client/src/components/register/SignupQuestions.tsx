import {
  CHOICE_QUESTIONS,
  OTHER_TEXT_MAX,
  SIGNUP_QUESTIONS_COPY as COPY,
  ZONE_TITLE,
  zoneOptions,
  type AnswerField,
  type AnswerOption,
  type SignupAnswers,
} from '../../content/signupQuestions'
import type { Zone } from '../../api/zones'
import AnswerDropdown from './AnswerDropdown'

const textClass =
  'w-full bg-ash light:bg-smoke-light border border-white/10 light:border-black/10 text-chalk light:text-chalk-light placeholder:text-fog/70 light:placeholder:text-fog-light/70 font-barlow text-base py-3 px-4 outline-none transition-all duration-200 focus:border-gold/60 clip-angled'

interface Question {
  field: AnswerField
  title: string
  options: AnswerOption[]
}

export default function SignupQuestions({
  values,
  onChange,
  zones,
  hideZone = false,
  onSkip,
  idPrefix = 'signup-q',
}: {
  values: SignupAnswers
  onChange: (field: keyof SignupAnswers, value: string) => void
  zones: Zone[]
  hideZone?: boolean
  /** Shows the "Skip for now" link when given. */
  onSkip?: () => void
  idPrefix?: string
}) {
  const questions: Question[] = [
    ...CHOICE_QUESTIONS,
    ...(hideZone ? [] : [{ field: 'zone' as const, title: ZONE_TITLE, options: zoneOptions(zones) }]),
  ]

  return (
    <fieldset className="min-w-0 w-full m-0 flex flex-col gap-5 border border-gold/30 border-l-4 border-l-gold bg-gold/10 px-4 py-5 sm:px-5">
      <legend className="sr-only">{COPY.title}</legend>
      <div className="flex flex-col gap-1">
        <h3 className="m-0 font-bebas text-2xl tracking-tight text-gold">{COPY.title}</h3>
        <p className="m-0 text-sm text-fog light:text-fog-light">{COPY.line}</p>
      </div>

      {questions.map((question) => {
        const id = `${idPrefix}-${question.field}`
        const labelId = `${id}-label`
        return (
          <div key={question.field} className="flex flex-col gap-2">
            <p id={labelId} className="m-0 text-sm font-semibold text-chalk light:text-chalk-light leading-snug">
              {question.title}
            </p>
            <AnswerDropdown
              id={id}
              labelId={labelId}
              placeholder={COPY.choose}
              options={question.options}
              value={values[question.field]}
              onChange={(value) => onChange(question.field, value)}
            />
            {question.field === 'hardest_now' && values.hardest_now === 'other' && (
              <input
                id={`${idPrefix}-hardest_now_other`}
                type="text"
                aria-label="What is hardest for you right now? Type it in"
                className={textClass}
                placeholder={COPY.otherPlaceholder}
                maxLength={OTHER_TEXT_MAX}
                value={values.hardest_now_other}
                onChange={(e) => onChange('hardest_now_other', e.target.value)}
              />
            )}
          </div>
        )
      })}

      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="self-start bg-transparent border-0 p-0 min-h-11 cursor-pointer font-barlow-condensed font-bold text-sm tracking-widest uppercase text-gold hover:underline"
        >
          {COPY.skip}
        </button>
      )}
    </fieldset>
  )
}
