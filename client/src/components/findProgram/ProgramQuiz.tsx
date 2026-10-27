import { forwardRef, useEffect, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import {
  DAYS_QUESTION,
  EXPERIENCE_QUESTION,
  FIND_COPY,
  GOAL_QUESTION,
  clearQuizResult,
  loadQuizResult,
  matchProgram,
  saveQuizResult,
  weekLine,
  type QuizAnswers,
  type QuizQuestion,
} from '../../content/quiz'
import CtaButton from '../programs/CtaButton'
import SectionHeading from '../programs/SectionHeading'
import QuizResult from './QuizResult'

const EMPTY: QuizAnswers = { goal: null, experience: null, days: null }

function initialAnswers(): { answers: QuizAnswers; done: boolean } {
  const stored = loadQuizResult()
  if (!stored) return { answers: EMPTY, done: false }
  return { answers: { goal: stored.goal, experience: stored.experience, days: stored.days }, done: true }
}

const optionBase =
  'w-full min-h-[56px] px-5 py-3 text-left rounded-lg font-barlow text-lg border-[1.5px] transition-colors duration-150 cursor-pointer'
const optionOff =
  'bg-transparent text-chalk light:text-chalk-light border-mist light:border-mist-light hover:border-chalk light:hover:border-chalk-light'
const optionOn =
  'bg-chalk text-night light:bg-chalk-light light:text-night-light border-chalk light:border-chalk-light font-semibold'

function QuestionFieldset<T extends string>({
  question,
  value,
  onPick,
}: {
  question: QuizQuestion<T>
  value: T | null
  onPick: (value: T) => void
}) {
  return (
    <fieldset className="m-0 p-0 border-0 flex flex-col gap-3">
      <legend className="mb-3 font-barlow-condensed font-bold text-2xl md:text-[26px] text-chalk light:text-chalk-light">
        {question.legend}
      </legend>
      {question.options.map((option) => {
        const selected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onPick(option.value)}
            className={`${optionBase} ${selected ? optionOn : optionOff}`}
          >
            {option.label}
          </button>
        )
      })}
    </fieldset>
  )
}

const ProgramQuiz = forwardRef<HTMLElement>(function ProgramQuiz(_props, ref) {
  const [{ answers, done }, setState] = useState(initialAnswers)
  const contentRef = useRef<HTMLDivElement>(null)
  const hasMounted = useRef(false)

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true
      return
    }
    contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [done])

  const ready = Boolean(answers.goal && answers.experience && answers.days)

  const pick = (key: keyof QuizAnswers) => (value: string) =>
    setState((prev) => ({ ...prev, answers: { ...prev.answers, [key]: value } }))

  const submit = () => {
    if (!answers.goal || !answers.experience || !answers.days) return
    const match = matchProgram(answers.goal, answers.experience)
    saveQuizResult({
      goal: answers.goal,
      experience: answers.experience,
      days: answers.days,
      ...match,
      completedAt: new Date().toISOString(),
    })
    setState((prev) => ({ ...prev, done: true }))
  }

  const retake = () => {
    clearQuizResult()
    setState({ answers: EMPTY, done: false })
  }

  const match = done && answers.goal && answers.experience ? matchProgram(answers.goal, answers.experience) : null

  return (
    <section ref={ref} id="quiz" className="scroll-mt-24 px-4 md:px-6 py-12 md:py-20 bg-ink light:bg-ink-light">
      <div ref={contentRef} className="scroll-mt-24 max-w-[760px] mx-auto flex flex-col gap-10">
        {match && answers.days ? (
          <QuizResult program={match.program} nextUp={match.nextUp} week={weekLine(answers.days)} onRetake={retake} />
        ) : (
          <>
            <SectionHeading>{FIND_COPY.quiz.heading}</SectionHeading>
            <QuestionFieldset question={GOAL_QUESTION} value={answers.goal} onPick={pick('goal')} />
            <QuestionFieldset question={EXPERIENCE_QUESTION} value={answers.experience} onPick={pick('experience')} />
            <QuestionFieldset question={DAYS_QUESTION} value={answers.days} onPick={pick('days')} />
            <CtaButton onClick={submit} disabled={!ready} className="self-start max-sm:w-full">
              {FIND_COPY.quiz.submit} <ArrowRight size={20} aria-hidden="true" />
            </CtaButton>
          </>
        )}
      </div>
    </section>
  )
})

export default ProgramQuiz
