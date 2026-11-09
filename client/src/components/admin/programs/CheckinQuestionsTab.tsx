import { QUESTION_TYPE_LABELS, newQuestion, questionIdFromLabel } from '../../../content/programEditor'
import type { ProgramEditorApi } from '../../../hooks/useProgramEditor'
import { useSectionDraft } from '../../../hooks/useSectionDraft'
import { QUESTION_TYPES, type CheckinQuestion, type QuestionType } from '../../../types/programContent'
import { LinesField, RepeatList, SaveBar, SelectField, TextField, cardClass, hintClass } from './fields'

const TYPE_OPTIONS = QUESTION_TYPES.map((t) => ({ value: t, label: QUESTION_TYPE_LABELS[t] }))

export default function CheckinQuestionsTab({
  api,
  onDirtyChange,
}: {
  api: ProgramEditorApi
  onDirtyChange: (dirty: boolean) => void
}) {
  const plan = api.editor!.content!.plan
  const { value, setValue, dirty, reset } = useSectionDraft(plan, onDirtyChange)
  const savedIds = plan.checkinQuestions.map((q) => q.id)
  const questions = value.checkinQuestions

  const setQuestions = (checkinQuestions: CheckinQuestion[]) => setValue({ ...value, checkinQuestions })

  const updateQuestion = (q: CheckinQuestion, next: CheckinQuestion) => {
    // New questions take their answer key from the text; saved ones keep theirs so old answers still line up.
    if (!savedIds.includes(q.id) && next.label !== q.label) {
      const taken = questions.filter((other) => other !== q).map((other) => other.id)
      next = { ...next, id: questionIdFromLabel(next.label || 'question', taken) }
    }
    if (next.type === 'text') next = { ...next, options: undefined }
    else if (!next.options) next = { ...next, options: ['', ''] }
    return next
  }

  return (
    <div className={`${cardClass} space-y-5 max-w-3xl`}>
      <div>
        <h2 className="text-lg font-bold">Sunday check-in questions</h2>
        <p className={hintClass}>
          Members answer these every Sunday. Sending the check-in opens their next week, and their captain gets the
          answer to the first question on WhatsApp.
        </p>
      </div>
      <RepeatList<CheckinQuestion>
        label="Questions"
        items={questions}
        onChange={setQuestions}
        blank={() => newQuestion(questions.map((q) => q.id))}
        addLabel="Add a question"
        render={(q, update, index) => (
          <>
            <TextField
              label={`Question ${index + 1}`}
              value={q.label}
              onChange={(label) => update(updateQuestion(q, { ...q, label }))}
            />
            <div className="grid sm:grid-cols-2 gap-3">
              <SelectField<QuestionType>
                label="Answer type"
                value={q.type}
                options={TYPE_OPTIONS}
                onChange={(type) => update(updateQuestion(q, { ...q, type }))}
              />
              <label className="flex items-center gap-2 min-h-[44px] sm:mt-6 cursor-pointer">
                <input type="checkbox" checked={q.required} onChange={(e) => update({ ...q, required: e.target.checked })} />
                <span className="text-sm font-semibold">Members must answer</span>
              </label>
            </div>
            {q.type !== 'text' && (
              <LinesField
                label="Answers to pick from"
                value={q.options}
                rows={4}
                onChange={(options) => update({ ...q, options })}
                hint="One answer per line, at least two."
              />
            )}
            {savedIds.includes(q.id) && (
              <p className={hintClass}>
                Answer key: <code>{q.id}</code>. It stays the same when you change the wording, so past answers still match.
              </p>
            )}
          </>
        )}
      />
      <SaveBar dirty={dirty} busy={api.busy} onReset={reset} onSave={() => void api.saveSection('plan', value)} />
    </div>
  )
}
