import { useState } from 'react'
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react'
import AdminConfirmDialog from '../../AdminConfirmDialog'
import { isWeekUnfinished } from '../../../content/programEditor'
import type { ProgramEditorApi } from '../../../hooks/useProgramEditor'
import { useSectionDraft } from '../../../hooks/useSectionDraft'
import type { ProgramPlanContent, ProgramWeekContent } from '../../../types/programContent'
import DayEditor from './DayEditor'
import { VoiceNoteField } from './UploadFields'
import { LinesField, SaveBar, TextArea, TextField, cardClass, hintClass, iconButton, secondaryButton } from './fields'

function WeekForm({
  week,
  api,
  onDirtyChange,
}: {
  week: ProgramWeekContent
  api: ProgramEditorApi
  onDirtyChange: (dirty: boolean) => void
}) {
  const { value, setValue, dirty, reset } = useSectionDraft(week, onDirtyChange)
  const set = (next: Partial<ProgramWeekContent>) => setValue({ ...value, ...next })

  return (
    <div className={`${cardClass} space-y-5`}>
      <h2 className="text-lg font-bold">Week {week.week}</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <TextField label="Title" value={value.title} maxLength={120} onChange={(title) => set({ title })} />
        <TextField
          label="One-line summary"
          value={value.summary}
          maxLength={400}
          onChange={(summary) => set({ summary })}
          hint="Shown in the list of weeks."
        />
      </div>
      <TextArea label="What this week is for" value={value.purpose} onChange={(purpose) => set({ purpose })} />
      <TextArea label="Note from the coach" value={value.coachNote} onChange={(coachNote) => set({ coachNote })} />
      <VoiceNoteField value={value.voiceNoteUrl} onChange={(voiceNoteUrl) => set({ voiceNoteUrl })} />
      <TextArea label="Tip of the week" value={value.tip} rows={2} onChange={(tip) => set({ tip })} />

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Days</h3>
        <p className={hintClass}>Monday to Sunday. Tap a day to edit it.</p>
        {value.days.map((day) => (
          <DayEditor
            key={day.day}
            day={day}
            onChange={(next) => set({ days: value.days.map((d) => (d.day === next.day ? next : d)) })}
          />
        ))}
      </div>

      <SaveBar dirty={dirty} busy={api.busy} onReset={reset} onSave={() => void api.saveWeek(week.week, value)} />
    </div>
  )
}

function PlanBasics({
  plan,
  api,
  onDirtyChange,
}: {
  plan: ProgramPlanContent
  api: ProgramEditorApi
  onDirtyChange: (dirty: boolean) => void
}) {
  const { value, setValue, dirty, reset } = useSectionDraft(plan, onDirtyChange)
  return (
    <div className={`${cardClass} space-y-5`}>
      <h2 className="text-lg font-bold">Program home page</h2>
      <p className={hintClass}>What members see at the top of their program in the dashboard.</p>
      <LinesField label="How your week works" value={value.howYourWeekWorks} onChange={(howYourWeekWorks) => setValue({ ...value, howYourWeekWorks })} />
      <LinesField label="How weeks open" value={value.howWeeksOpen} onChange={(howWeeksOpen) => setValue({ ...value, howWeeksOpen })} />
      <TextField
        label="Graduation heading"
        value={value.graduation.heading}
        onChange={(heading) => setValue({ ...value, graduation: { ...value.graduation, heading } })}
      />
      <TextArea
        label="Graduation text"
        value={value.graduation.body}
        onChange={(body) => setValue({ ...value, graduation: { ...value.graduation, body } })}
      />
      <SaveBar dirty={dirty} busy={api.busy} onReset={reset} onSave={() => void api.saveSection('plan', value)} />
    </div>
  )
}

export default function WeeklyPlanTab({
  api,
  dirty,
  onDirtyChange,
  confirmLeave,
}: {
  api: ProgramEditorApi
  dirty: boolean
  onDirtyChange: (dirty: boolean) => void
  /** Asks before throwing away unsaved edits; runs the action if the admin agrees. */
  confirmLeave: (action: () => void) => void
}) {
  const content = api.editor!.content!
  const weeks = content.weeks
  const [selected, setSelected] = useState<number | 'basics'>(1)
  const [removing, setRemoving] = useState<number | null>(null)
  const current = typeof selected === 'number' ? weeks.find((w) => w.week === selected) ?? weeks[0] : null

  const select = (next: number | 'basics') => {
    if (next === selected) return
    if (dirty) confirmLeave(() => setSelected(next))
    else setSelected(next)
  }

  const guarded = (action: () => Promise<void>) => {
    if (dirty) confirmLeave(() => void action())
    else void action()
  }

  const add = (copyFrom: number | null) =>
    guarded(async () => {
      if (await api.addWeek(copyFrom)) setSelected(weeks.length + 1)
    })

  const move = (week: number, direction: 'up' | 'down') =>
    guarded(async () => {
      if (await api.moveWeek(week, direction)) setSelected(direction === 'up' ? week - 1 : week + 1)
    })

  const remove = async () => {
    const week = removing
    setRemoving(null)
    if (!week) return
    if (await api.removeWeek(week)) setSelected(Math.max(1, Math.min(week, weeks.length - 1)))
  }

  return (
    <div className="grid lg:grid-cols-[280px_minmax(0,1fr)] gap-6 items-start">
      <nav aria-label="Weeks" className={`${cardClass} !p-3 space-y-1 lg:sticky lg:top-4`}>
        <button
          type="button"
          onClick={() => select('basics')}
          aria-current={selected === 'basics' ? 'true' : undefined}
          className={`w-full text-left px-3 min-h-[44px] rounded-lg font-semibold ${
            selected === 'basics' ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
          }`}
        >
          Program home page
        </button>
        <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
        {weeks.map((w) => {
          const on = current?.week === w.week && selected !== 'basics'
          return (
            <div key={w.week} className={`flex items-center rounded-lg ${on ? 'bg-gray-100 dark:bg-gray-700' : ''}`}>
              <button
                type="button"
                onClick={() => select(w.week)}
                aria-current={on ? 'true' : undefined}
                className="flex-1 min-w-0 text-left px-3 py-2 min-h-[44px]"
              >
                <span className="block text-sm font-semibold">Week {w.week}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">{w.title}</span>
                {isWeekUnfinished(w) && <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">To be added</span>}
              </button>
              {on && (
                <div className="flex shrink-0">
                  <button type="button" aria-label="Move week up" disabled={w.week === 1 || api.busy} onClick={() => move(w.week, 'up')} className={iconButton}>
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label="Move week down"
                    disabled={w.week === weeks.length || api.busy}
                    onClick={() => move(w.week, 'down')}
                    className={iconButton}
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>
              )}
            </div>
          )
        })}
        <div className="pt-2 flex flex-col gap-2">
          <button type="button" onClick={() => add(null)} disabled={api.busy} className={secondaryButton}>
            <Plus size={16} /> Add a week
          </button>
          {current && selected !== 'basics' && (
            <>
              <button type="button" onClick={() => add(current.week)} disabled={api.busy} className={secondaryButton}>
                <Copy size={16} /> Copy week {current.week} to the end
              </button>
              <button
                type="button"
                onClick={() => setRemoving(current.week)}
                disabled={api.busy || weeks.length === 1}
                className={`${secondaryButton} text-red-600`}
              >
                <Trash2 size={16} /> Remove week {current.week}
              </button>
            </>
          )}
        </div>
      </nav>

      {selected === 'basics' ? (
        <PlanBasics plan={content.plan} api={api} onDirtyChange={onDirtyChange} />
      ) : current ? (
        <WeekForm key={current.week} week={current} api={api} onDirtyChange={onDirtyChange} />
      ) : null}

      <AdminConfirmDialog
        open={removing !== null}
        title={`Remove week ${removing}?`}
        message="The weeks after it move up by one. Members only see this after you publish."
        confirmLabel="Remove week"
        variant="danger"
        onConfirm={() => void remove()}
        onCancel={() => setRemoving(null)}
      />
    </div>
  )
}
