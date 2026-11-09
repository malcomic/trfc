import { PROGRAM_COPY } from '../../../content/programPages'
import { DoneBox } from './ProgramBits'

interface RoundChecklistProps {
  rounds: number
  roundsDone: number
  work: string
  rest?: string
  onChange: (roundsDone: number) => void
}

/** Rounds are ticked in order: ticking round 3 marks 1 to 3 done, unticking it leaves 1 and 2. */
export default function RoundChecklist({ rounds, roundsDone, work, rest, onChange }: RoundChecklistProps) {
  const copy = PROGRAM_COPY.session
  return (
    <ol className="space-y-2">
      {Array.from({ length: rounds }, (_, i) => i + 1).map((n) => {
        const checked = n <= roundsDone
        return (
          <li key={n} className="flex items-center gap-3">
            <DoneBox
              checked={checked}
              onChange={(next) => onChange(next ? n : n - 1)}
              label={copy.round(n)}
            />
            <span className="min-w-0">
              <span className="block font-barlow font-semibold text-chalk light:text-chalk-light">
                {copy.round(n)}: {work}
              </span>
              {rest && <span className="block text-sm text-fog light:text-fog-light">{copy.rest(rest)}</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
