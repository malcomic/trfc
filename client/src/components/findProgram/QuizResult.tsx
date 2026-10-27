import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { PROGRAMS, formatKsh, programPath, type ProgramId } from '../../content/programs'
import { FIND_COPY } from '../../content/quiz'
import { cardSurface } from '../../utils/themeClasses'
import CtaButton from '../programs/CtaButton'

interface QuizResultProps {
  program: ProgramId
  nextUp: ProgramId | null
  week: string
  onRetake: () => void
}

export default function QuizResult({ program: programId, nextUp, week, onRetake }: QuizResultProps) {
  const copy = FIND_COPY.result
  const program = PROGRAMS[programId]
  const next = nextUp ? PROGRAMS[nextUp] : null

  const rows = [
    { label: copy.length, value: `${program.lengthWeeks} weeks` },
    { label: copy.price, value: formatKsh(program.price) },
    { label: copy.memberPrice, value: formatKsh(program.memberPrice) },
  ]

  return (
    <div className="flex flex-col gap-6" aria-live="polite">
      <div className="flex flex-col gap-2">
        <div className="font-semibold text-lg text-chalk light:text-chalk-light">{copy.eyebrow}</div>
        <h2 className="m-0 font-barlow-condensed font-bold text-[32px] md:text-[40px] leading-[1.08] text-chalk light:text-chalk-light">
          {program.title}
        </h2>
      </div>

      <div className={`${cardSurface} rounded-xl px-5 md:px-7 py-3`}>
        {rows.map((row, index) => (
          <div
            key={row.label}
            className={`flex justify-between gap-4 py-3.5 ${index < rows.length - 1 ? 'border-b border-white/10 light:border-black/10' : ''}`}
          >
            <span className="text-fog light:text-fog-light">{row.label}</span>
            <span className="font-semibold text-chalk light:text-chalk-light">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-smoke light:bg-smoke-light px-5 py-4 text-chalk light:text-chalk-light">
        <strong>{copy.week}</strong> {week}
      </div>

      {next && (
        <div className={`${cardSurface} rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2`}>
          <div>
            <div className="text-[15px] text-fog light:text-fog-light">{copy.nextUp}</div>
            <strong className="text-chalk light:text-chalk-light">{next.name}</strong>{' '}
            <span className="text-fog light:text-fog-light">{formatKsh(next.price)}</span>
          </div>
          <Link
            to={programPath(next.id)}
            className="inline-flex items-center gap-1.5 min-h-[44px] font-semibold text-chalk light:text-chalk-light underline"
          >
            {copy.seeIt} <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      )}

      <CtaButton to={programPath(program.id)} className="self-start max-sm:w-full">
        {copy.button} <ArrowRight size={20} aria-hidden="true" />
      </CtaButton>

      <p className="m-0 text-fog light:text-fog-light">{copy.note}</p>

      <button
        type="button"
        onClick={onRetake}
        className="self-start min-h-[44px] p-0 bg-transparent border-0 font-semibold text-[17px] text-chalk light:text-chalk-light underline cursor-pointer"
      >
        {copy.retake}
      </button>
    </div>
  )
}
