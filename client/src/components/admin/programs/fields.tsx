import { useEffect, useId, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { listToText, moveItem, sameContent, textToList } from '../../../content/programEditor'

export const inputClass =
  'w-full px-3 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
export const primaryButton =
  'inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] rounded-lg bg-primary dark:bg-primary-dark text-white dark:text-black font-semibold disabled:opacity-50'
export const secondaryButton =
  'inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold disabled:opacity-50'
export const dangerButton =
  'inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] rounded-lg border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 font-semibold disabled:opacity-50'
export const cardClass = 'bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 text-gray-900 dark:text-gray-100'
export const iconButton =
  'inline-flex items-center justify-center w-11 h-11 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30'
export const hintClass = 'text-xs text-gray-500 dark:text-gray-400'

function Label({ htmlFor, label, optional }: { htmlFor: string; label: string; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-semibold">
      {label} {optional && <span className="font-normal text-gray-500">(optional)</span>}
    </label>
  )
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  optional,
  maxLength = 200,
  placeholder,
}: {
  label: string
  value: string | undefined
  onChange: (value: string) => void
  hint?: ReactNode
  optional?: boolean
  maxLength?: number
  placeholder?: string
}) {
  const id = useId()
  return (
    <div className="space-y-1">
      <Label htmlFor={id} label={label} optional={optional} />
      <input
        id={id}
        type="text"
        value={value ?? ''}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
      {hint && <p className={hintClass}>{hint}</p>}
    </div>
  )
}

export function TextArea({
  label,
  value,
  onChange,
  hint,
  optional,
  rows = 3,
  maxLength = 2000,
}: {
  label: string
  value: string | undefined
  onChange: (value: string) => void
  hint?: ReactNode
  optional?: boolean
  rows?: number
  maxLength?: number
}) {
  const id = useId()
  return (
    <div className="space-y-1">
      <Label htmlFor={id} label={label} optional={optional} />
      <textarea
        id={id}
        rows={rows}
        value={value ?? ''}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} py-2`}
      />
      {hint && <p className={hintClass}>{hint}</p>}
    </div>
  )
}

/** Edits a list of short texts as one line each. */
export function LinesField({
  label,
  value,
  onChange,
  hint,
  rows = 4,
}: {
  label: string
  value: string[] | undefined
  onChange: (value: string[]) => void
  hint?: ReactNode
  rows?: number
}) {
  const id = useId()
  const [text, setText] = useState(() => listToText(value))
  // Keep blank lines the admin is typing; only resync when the list changed from outside.
  useEffect(() => {
    setText((current) => (sameContent(textToList(current), value ?? []) ? current : listToText(value)))
  }, [value])
  return (
    <div className="space-y-1">
      <Label htmlFor={id} label={label} />
      <textarea
        id={id}
        rows={rows}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          onChange(textToList(e.target.value))
        }}
        className={`${inputClass} py-2`}
      />
      <p className={hintClass}>{hint ?? 'One per line.'}</p>
    </div>
  )
}

export function NumberField({
  label,
  value,
  onChange,
  hint,
  min = 0,
  max,
  optional,
}: {
  label: string
  value: number | undefined
  onChange: (value: number | undefined) => void
  hint?: ReactNode
  min?: number
  max?: number
  optional?: boolean
}) {
  const id = useId()
  return (
    <div className="space-y-1">
      <Label htmlFor={id} label={label} optional={optional} />
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Math.max(min, Math.floor(Number(e.target.value))))}
        className={inputClass}
      />
      {hint && <p className={hintClass}>{hint}</p>}
    </div>
  )
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  hint?: ReactNode
}) {
  const id = useId()
  return (
    <div className="space-y-1">
      <Label htmlFor={id} label={label} />
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className={inputClass}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <p className={hintClass}>{hint}</p>}
    </div>
  )
}

/** A list of small records (FAQs, tiles) with add, remove and reorder. */
export function RepeatList<T>({
  label,
  items,
  onChange,
  blank,
  addLabel,
  render,
  hint,
}: {
  label: string
  items: T[]
  onChange: (items: T[]) => void
  blank: () => T
  addLabel: string
  render: (item: T, update: (next: T) => void, index: number) => ReactNode
  hint?: ReactNode
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="block text-sm font-semibold mb-1">{label}</legend>
      {hint && <p className={hintClass}>{hint}</p>}
      {items.map((item, index) => (
        <div key={index} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex gap-2">
          <div className="flex-1 min-w-0 space-y-3">
            {render(item, (next) => onChange(items.map((it, i) => (i === index ? next : it))), index)}
          </div>
          <div className="flex flex-col">
            <button
              type="button"
              aria-label="Move up"
              disabled={index === 0}
              onClick={() => onChange(moveItem(items, index, 'up'))}
              className={iconButton}
            >
              <ArrowUp size={16} />
            </button>
            <button
              type="button"
              aria-label="Move down"
              disabled={index === items.length - 1}
              onClick={() => onChange(moveItem(items, index, 'down'))}
              className={iconButton}
            >
              <ArrowDown size={16} />
            </button>
            <button
              type="button"
              aria-label="Remove"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              className={`${iconButton} text-red-600`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, blank()])} className={secondaryButton}>
        <Plus size={16} /> {addLabel}
      </button>
    </fieldset>
  )
}

export function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400"
    >
      {children}
    </div>
  )
}

/** Sticky footer with the save button for a tab. */
export function SaveBar({
  dirty,
  busy,
  onSave,
  onReset,
  label = 'Save draft',
}: {
  dirty: boolean
  busy: boolean
  onSave: () => void
  onReset: () => void
  label?: string
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-5 px-5 py-3 bg-white/95 dark:bg-gray-800/95 border-t border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-3">
      <button type="button" onClick={onSave} disabled={!dirty || busy} className={primaryButton}>
        {busy ? 'Saving…' : label}
      </button>
      <button type="button" onClick={onReset} disabled={!dirty || busy} className={secondaryButton}>
        Undo changes
      </button>
      <span className={hintClass}>
        {dirty ? 'You have unsaved changes.' : 'Saved to the draft. Members see it after you publish.'}
      </span>
    </div>
  )
}
