import type { ProgramEditorApi } from '../../../hooks/useProgramEditor'
import { useSectionDraft } from '../../../hooks/useSectionDraft'
import {
  FINDER_GOALS,
  FINDER_HIKE_TARGETS,
  FINDER_LEVELS,
  FINDER_RACE_DISTANCES,
  FINDER_SEXES,
  FINDER_TRAIN_WHERE,
  type FinderGoal,
  type FinderHikeTarget,
  type FinderLevel,
  type FinderRaceDistance,
  type FinderSex,
  type FinderTrainWhere,
  type ProgramQuizMatching,
} from '../../../types/programContent'
import { NumberField, SaveBar, cardClass, hintClass, inputClass } from './fields'

const EMPTY_QUIZ: ProgramQuizMatching = { goals: [], sex: 'any' }

const GOAL_LABELS: Record<FinderGoal, string> = {
  lose_fat: 'Lose weight or fat',
  build_muscle: 'Build muscle',
  get_stronger: 'Get stronger',
  start_running: 'Start running',
  longer_race: 'Run a longer race',
  hike: 'Hike or climb a mountain',
}

const SEX_LABELS: Record<FinderSex, string> = {
  women: "Women's version",
  men: "Men's version",
  any: 'Any (women or men)',
}

const LEVEL_LABELS: Record<FinderLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

const RACE_LABELS: Record<FinderRaceDistance, string> = {
  '10k': 'First 10K',
  '15k': 'First 15K',
  '21k': 'First 21K',
  '42k': 'First 42K',
}

const HIKE_LABELS: Record<FinderHikeTarget, string> = {
  day_hikes: 'Day hikes and local trails',
  satima: 'Mt Satima or Elephant Hill',
  kenya: 'Mt Kenya, Point Lenana',
  unsure: 'Not sure yet',
}

const TRAIN_LABELS: Record<FinderTrainWhere, string> = {
  home: 'At home',
  gym: 'At the gym',
  outside: 'Outside',
  mix: 'A bit of everything',
}

function toggleIn<T extends string>(list: T[] | undefined, value: T): T[] {
  const current = list ?? []
  return current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
}

function CheckboxGroup<T extends string>({
  legend,
  hint,
  options,
  labels,
  values,
  onChange,
}: {
  legend: string
  hint?: string
  options: readonly T[]
  labels: Record<T, string>
  values: T[] | undefined
  onChange: (next: T[]) => void
}) {
  const selected = values ?? []
  return (
    <fieldset className="space-y-2 m-0 p-0 border-0">
      <legend className="text-sm font-semibold mb-1">{legend}</legend>
      {hint && <p className={hintClass}>{hint}</p>}
      <div className="grid sm:grid-cols-2 gap-2">
        {options.map((option) => {
          const id = `finder-${legend}-${option}`
          const checked = selected.includes(option)
          return (
            <label key={option} htmlFor={id} className="flex items-center gap-2 min-h-[44px] cursor-pointer">
              <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={() => onChange(toggleIn(selected, option))}
                className="w-4 h-4"
              />
              <span className="text-sm">{labels[option]}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export default function FinderMatchingTab({
  api,
  onDirtyChange,
}: {
  api: ProgramEditorApi
  onDirtyChange: (dirty: boolean) => void
}) {
  const saved = api.editor!.content!.quiz ?? EMPTY_QUIZ
  const { value, setValue, dirty, reset } = useSectionDraft(saved, onDirtyChange)
  const set = (next: Partial<ProgramQuizMatching>) => setValue({ ...value, ...next })

  return (
    <div className={`${cardClass} space-y-6 max-w-3xl`}>
      <div>
        <h2 className="text-lg font-bold">Finder matching</h2>
        <p className={hintClass}>
          Tags decide when Find my program offers this program. Leave goals empty to keep it out of matching
          (Couch to 5K is still the fallback when nothing matches).
        </p>
      </div>

      <CheckboxGroup
        legend="Goals"
        hint="Which Find my program goals can land on this program."
        options={FINDER_GOALS}
        labels={GOAL_LABELS}
        values={value.goals}
        onChange={(goals) => set({ goals })}
      />

      <div className="space-y-2">
        <label htmlFor="finder-sex" className="block text-sm font-semibold">
          Sex version
        </label>
        <select
          id="finder-sex"
          value={value.sex}
          onChange={(e) => set({ sex: e.target.value as FinderSex })}
          className={inputClass}
        >
          {FINDER_SEXES.map((sex) => (
            <option key={sex} value={sex}>
              {SEX_LABELS[sex]}
            </option>
          ))}
        </select>
      </div>

      <CheckboxGroup
        legend="Gym / experience levels (optional)"
        hint="If you set levels, the finder only matches when the member’s gym experience fits."
        options={FINDER_LEVELS}
        labels={LEVEL_LABELS}
        values={value.levels}
        onChange={(levels) => set({ levels: levels.length ? levels : undefined })}
      />

      <CheckboxGroup
        legend="Race distances (optional)"
        options={FINDER_RACE_DISTANCES}
        labels={RACE_LABELS}
        values={value.raceDistances}
        onChange={(raceDistances) => set({ raceDistances: raceDistances.length ? raceDistances : undefined })}
      />

      <CheckboxGroup
        legend="Hike targets (optional)"
        options={FINDER_HIKE_TARGETS}
        labels={HIKE_LABELS}
        values={value.hikeTargets}
        onChange={(hikeTargets) => set({ hikeTargets: hikeTargets.length ? hikeTargets : undefined })}
      />

      <CheckboxGroup
        legend="Where they train (optional)"
        options={FINDER_TRAIN_WHERE}
        labels={TRAIN_LABELS}
        values={value.trainWhere}
        onChange={(trainWhere) => set({ trainWhere: trainWhere.length ? trainWhere : undefined })}
      />

      <label htmlFor="finder-elite" className="flex items-center gap-2 min-h-[44px] cursor-pointer">
        <input
          id="finder-elite"
          type="checkbox"
          checked={value.eliteOffer === true}
          onChange={(e) => set({ eliteOffer: e.target.checked ? true : undefined })}
          className="w-4 h-4"
        />
        <span className="text-sm font-semibold">Show as Elite Coaching for Mothers upsell when they have children</span>
      </label>

      <NumberField
        label="Match priority"
        optional
        value={value.priority}
        min={0}
        max={1000}
        onChange={(priority) => set({ priority: priority ?? undefined })}
        hint="Higher wins when several programs match. Blank uses catalog order."
      />

      <SaveBar dirty={dirty} busy={api.busy} onReset={reset} onSave={() => void api.saveSection('quiz', value)} label="Save finder matching" />
    </div>
  )
}
