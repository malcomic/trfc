import { ChevronDown } from 'lucide-react'
import { DAY_KIND_LABELS, WEEKDAYS, isPlaceholder } from '../../../content/programEditor'
import { DAY_KINDS, type DayKind, type ProgramDay } from '../../../types/programContent'
import { LinesField, NumberField, SelectField, TextField, hintClass } from './fields'

const KIND_OPTIONS = DAY_KINDS.map((k) => ({ value: k, label: DAY_KIND_LABELS[k] }))

export default function DayEditor({ day, onChange }: { day: ProgramDay; onChange: (day: ProgramDay) => void }) {
  const steps = day.steps
  const main = steps.mainSet
  const setSteps = (next: Partial<ProgramDay['steps']>) => onChange({ ...day, steps: { ...steps, ...next } })
  const setMain = (next: Partial<NonNullable<ProgramDay['steps']['mainSet']>>) =>
    setSteps({ mainSet: { label: '', rounds: 1, work: '', ...main, ...next } })
  const unfinished = [day.title, ...steps.warmUp, ...steps.coolDown].some(isPlaceholder)

  return (
    <details className="group rounded-lg border border-gray-200 dark:border-gray-700">
      <summary className="flex items-center justify-between gap-3 px-4 min-h-[52px] cursor-pointer list-none">
        <span className="min-w-0">
          <span className="font-semibold">{WEEKDAYS[day.day - 1]}</span>
          <span className="text-gray-500 dark:text-gray-400"> · {DAY_KIND_LABELS[day.kind]}</span>
          <span className="block truncate text-sm">{day.title || 'No title yet'}</span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {unfinished && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              To be added
            </span>
          )}
          <ChevronDown size={18} className="transition-transform group-open:rotate-180" aria-hidden="true" />
        </span>
      </summary>
      <div className="px-4 pb-4 pt-1 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <SelectField<DayKind> label="Type of day" value={day.kind} options={KIND_OPTIONS} onChange={(kind) => onChange({ ...day, kind })} />
          <TextField label="Title" value={day.title} maxLength={120} onChange={(title) => onChange({ ...day, title })} />
        </div>
        {day.kind === 'rest' ? (
          <LinesField
            label="Optional suggestions"
            value={steps.coolDown}
            onChange={(coolDown) => setSteps({ coolDown })}
            hint="Shown on the rest day, one per line. Leave empty for a plain rest day."
            rows={2}
          />
        ) : (
          <>
            <LinesField label="Warm-up" value={steps.warmUp} onChange={(warmUp) => setSteps({ warmUp })} rows={3} />
            <fieldset className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-3">
              <legend className="px-1 text-sm font-semibold">Main set</legend>
              <p className={hintClass}>Members tick off each round. Leave "What to do" empty if there is no main set.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <TextField label="Name" value={main?.label} maxLength={80} placeholder="Jog and walk" onChange={(label) => setMain({ label })} />
                <NumberField label="Rounds" value={main?.rounds ?? 1} min={1} max={100} onChange={(rounds) => setMain({ rounds: rounds ?? 1 })} />
                <TextField label="What to do" value={main?.work} placeholder="Jog slowly for 1 minute" onChange={(work) => setMain({ work })} />
                <TextField label="Then rest" value={main?.rest} optional placeholder="Walk for 90 seconds" onChange={(rest) => setMain({ rest })} />
              </div>
            </fieldset>
            <LinesField label="Cool-down" value={steps.coolDown} onChange={(coolDown) => setSteps({ coolDown })} rows={3} />
            <NumberField
              label="About how many minutes"
              optional
              value={steps.durationMinutes}
              min={1}
              max={600}
              onChange={(durationMinutes) => setSteps({ durationMinutes })}
            />
          </>
        )}
      </div>
    </details>
  )
}
