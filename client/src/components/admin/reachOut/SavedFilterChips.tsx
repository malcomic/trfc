import { FormEvent, useState } from 'react'
import { Bookmark, Plus, X } from 'lucide-react'
import { createSavedFilter, deleteSavedFilter, type ReachOutFilters, type SavedFilter } from '../../../api/admin/reachOut'
import { filtersToParams, hasFilters } from './filterParams'

export default function SavedFilterChips({
  saved,
  current,
  onApply,
  onChanged,
}: {
  saved: SavedFilter[]
  current: ReachOutFilters
  onApply: (filters: ReachOutFilters) => void
  onChanged: () => void
}) {
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const currentKey = filtersToParams(current).toString()

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    try {
      setBusy(true)
      setError('')
      await createSavedFilter(name.trim(), current)
      setName('')
      setNaming(false)
      onChanged()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not save the list')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (item: SavedFilter) => {
    if (!window.confirm(`Delete the saved list "${item.name}"?`)) return
    try {
      await deleteSavedFilter(item.id)
      onChanged()
    } catch {
      setError('Could not delete the list')
    }
  }

  if (saved.length === 0 && !hasFilters(current)) return null

  return (
    <section className="mb-4 flex flex-wrap items-center gap-2" aria-label="Saved lists">
      <Bookmark size={16} className="text-gray-500 dark:text-gray-400" aria-hidden="true" />
      {saved.map((item) => {
        const active = filtersToParams(item.filters).toString() === currentKey
        return (
          <span
            key={item.id}
            className={`inline-flex items-center rounded-full border text-sm ${
              active
                ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-400 text-amber-900 dark:text-amber-200'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200'
            }`}
          >
            <button type="button" onClick={() => onApply(item.filters)} className="pl-3 pr-1 min-h-[36px]" title={item.created_by_name ? `Saved by ${item.created_by_name}` : undefined}>
              {item.name} <span className="font-semibold tabular-nums">({item.count})</span>
            </button>
            <button type="button" onClick={() => remove(item)} aria-label={`Delete ${item.name}`} className="px-2 min-h-[36px] text-gray-400 hover:text-red-600">
              <X size={14} />
            </button>
          </span>
        )
      })}

      {hasFilters(current) &&
        (naming ? (
          <form onSubmit={save} className="inline-flex items-center gap-2">
            <input
              autoFocus
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Zone Juja, start then stop"
              className="px-3 min-h-[36px] w-64 max-w-full border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
            />
            <button type="submit" disabled={busy || !name.trim()} className="px-3 min-h-[36px] rounded-full bg-primary dark:bg-primary-dark text-white dark:text-black text-sm disabled:opacity-50">
              Save
            </button>
            <button type="button" onClick={() => setNaming(false)} className="px-2 min-h-[36px] text-sm text-gray-500">
              Cancel
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setNaming(true)}
            className="inline-flex items-center gap-1 px-3 min-h-[36px] rounded-full border border-dashed border-gray-400 dark:border-gray-500 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Plus size={14} /> Save this filter
          </button>
        ))}

      {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
    </section>
  )
}
