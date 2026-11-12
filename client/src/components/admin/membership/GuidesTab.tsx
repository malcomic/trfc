import { useEffect, useRef, useState } from 'react'
import { AlertCircle, ArrowDown, ArrowUp, Check, FileText, Loader, Pencil, Trash2, Upload, X } from 'lucide-react'
import { adminSelectClass } from '../reachOut/ReachOutFilters'
import {
  deleteGuide,
  getAdminGuides,
  reorderGuides,
  updateGuide,
  uploadGuide,
  type AdminGuide,
} from '../../../api/admin/membership'
import type { GuideCategory } from '../../../api/membership'
import { GUIDE_CATEGORY_LABELS, fileSize } from '../../../content/membership'
import { moveItem } from './membershipAdmin'

const CATEGORIES = Object.keys(GUIDE_CATEGORY_LABELS) as GuideCategory[]
const MAX_BYTES = 25 * 1024 * 1024
const errorOf = (err: any, fallback: string) => err?.response?.data?.error || fallback

function UploadForm({ onUploaded }: { onUploaded: (guide: AdminGuide) => void }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<GuideCategory>('grocery')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  const pick = (next: File | null) => {
    setError('')
    if (next && next.size > MAX_BYTES) {
      setError('The PDF must be 25 MB or smaller')
      return setFile(null)
    }
    setFile(next)
    if (next && !title) setTitle(next.name.replace(/\.pdf$/i, ''))
  }

  const submit = async () => {
    if (!file) return setError('Choose a PDF to upload')
    if (!title.trim()) return setError('Give the guide a title')
    try {
      setError('')
      setProgress(0)
      const guide = await uploadGuide({ title, category, description }, file, setProgress)
      onUploaded(guide)
      setTitle('')
      setDescription('')
      setFile(null)
      if (fileInput.current) fileInput.current.value = ''
    } catch (err) {
      setError(errorOf(err, 'Could not upload the guide'))
    } finally {
      setProgress(null)
    }
  }

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-gray-900 dark:text-gray-100 text-sm">
      <h2 className="text-base font-bold mt-0 mb-3">Upload a guide</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block md:col-span-2">
          <span className="block mb-1">PDF file (up to 25 MB)</span>
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
            className="block w-full text-sm min-h-[44px]"
          />
        </label>
        <label className="block">
          <span className="block mb-1">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} className={adminSelectClass} />
        </label>
        <label className="block">
          <span className="block mb-1">Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as GuideCategory)} className={adminSelectClass}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{GUIDE_CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </label>
        <label className="block md:col-span-2">
          <span className="block mb-1">Description (optional)</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={1000} className={adminSelectClass} />
        </label>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-0">New guides start unpublished. Members only see a guide once you publish it.</p>
      <div className="flex items-center justify-end gap-3 mt-3">
        {error && <p className="text-sm text-red-600 dark:text-red-400 m-0">{error}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={progress !== null}
          className="inline-flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-lg bg-primary dark:bg-primary-dark text-white dark:text-black font-semibold disabled:opacity-50"
        >
          <Upload size={16} /> {progress !== null ? `Uploading ${progress}%` : 'Upload'}
        </button>
      </div>
    </section>
  )
}

function GuideRow({
  guide,
  index,
  count,
  onMove,
  onSaved,
  onDeleted,
}: {
  guide: AdminGuide
  index: number
  count: number
  onMove: (delta: -1 | 1) => void
  onSaved: (guide: AdminGuide) => void
  onDeleted: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ title: guide.title, description: guide.description, category: guide.category })
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async (action: () => Promise<void>, fallback: string) => {
    try {
      setBusy(true)
      setError('')
      await action()
    } catch (err) {
      setError(errorOf(err, fallback))
    } finally {
      setBusy(false)
    }
  }

  const togglePublished = () =>
    run(async () => onSaved(await updateGuide(guide.id, { isPublished: !guide.isPublished })), 'Could not update the guide')

  const save = () => {
    if (file && file.size > MAX_BYTES) return setError('The PDF must be 25 MB or smaller')
    return run(async () => {
      onSaved(await updateGuide(guide.id, form, file))
      setFile(null)
      setEditing(false)
    }, 'Could not save the guide')
  }

  const remove = () => {
    if (!window.confirm(`Delete "${guide.title}"? Members will no longer be able to download it.`)) return
    void run(async () => {
      await deleteGuide(guide.id)
      onDeleted(guide.id)
    }, 'Could not delete the guide')
  }

  const iconButton = 'p-2 min-h-[44px] min-w-[44px] rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-30'

  return (
    <li className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-gray-900 dark:text-gray-100 text-sm">
      <div className="flex flex-wrap items-start gap-3">
        <FileText className="w-5 h-5 mt-1 text-gray-500 flex-shrink-0" />
        <div className="flex-1 min-w-[12rem]">
          <p className="font-semibold m-0">{guide.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 m-0">
            {guide.fileName} · {fileSize(guide.bytes)}
          </p>
          {guide.description && <p className="text-gray-600 dark:text-gray-300 mt-1 mb-0">{guide.description}</p>}
        </div>
        <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
          <input type="checkbox" checked={guide.isPublished} onChange={togglePublished} disabled={busy} className="w-5 h-5" />
          <span className="font-semibold">{guide.isPublished ? 'Published' : 'Draft'}</span>
        </label>
        <div className="flex gap-1">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0 || busy} aria-label="Move up" className={iconButton}>
            <ArrowUp size={16} />
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={index === count - 1 || busy} aria-label="Move down" className={iconButton}>
            <ArrowDown size={16} />
          </button>
          <button type="button" onClick={() => setEditing((v) => !v)} aria-label={editing ? 'Stop editing' : 'Edit'} className={iconButton}>
            {editing ? <X size={16} /> : <Pencil size={16} />}
          </button>
          <button type="button" onClick={remove} disabled={busy} aria-label="Delete" className={`${iconButton} text-red-600 dark:text-red-400`}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {editing && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <label className="block">
            <span className="block mb-1">Title</span>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={160} className={adminSelectClass} />
          </label>
          <label className="block">
            <span className="block mb-1">Category</span>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as GuideCategory })} className={adminSelectClass}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{GUIDE_CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="block mb-1">Description</span>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} maxLength={1000} className={adminSelectClass} />
          </label>
          <label className="block md:col-span-2">
            <span className="block mb-1">Replace the PDF (optional)</span>
            <input type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm min-h-[44px]" />
          </label>
          <div className="md:col-span-2 flex justify-end">
            <button type="button" onClick={save} disabled={busy} className="inline-flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-lg bg-primary dark:bg-primary-dark text-white dark:text-black font-semibold disabled:opacity-50">
              {busy ? 'Saving…' : <><Check size={16} /> Save</>}
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400 mt-2 mb-0">{error}</p>}
    </li>
  )
}

export default function GuidesTab() {
  const [guides, setGuides] = useState<AdminGuide[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getAdminGuides().then(setGuides).catch(() => setError('Failed to load guides'))
  }, [])

  const move = async (category: GuideCategory, index: number, delta: -1 | 1) => {
    if (!guides) return
    const inCategory = guides.filter((g) => g.category === category)
    const next = moveItem(inCategory, index, delta)
    if (next === inCategory) return
    const previous = guides
    setGuides([...guides.filter((g) => g.category !== category), ...next])
    try {
      setGuides(await reorderGuides(next.map((g) => g.id)))
    } catch {
      setError('Could not save the new order')
      setGuides(previous)
    }
  }

  if (!guides) {
    return error ? (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-3 text-red-700 dark:text-red-400">
        <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
      </div>
    ) : (
      <div className="flex items-center justify-center h-48">
        <Loader className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    )
  }

  const replace = (guide: AdminGuide) => setGuides((list) => list?.map((g) => (g.id === guide.id ? guide : g)) ?? list)

  return (
    <div className="space-y-6">
      <UploadForm onUploaded={(guide) => setGuides((list) => [...(list ?? []), guide])} />
      {error && <p className="text-sm text-red-600 dark:text-red-400 m-0">{error}</p>}
      {guides.length === 0 && <p className="text-sm text-gray-600 dark:text-gray-400 m-0">No guides yet. Upload the first one above.</p>}
      {CATEGORIES.map((category) => {
        const items = guides.filter((g) => g.category === category)
        if (items.length === 0) return null
        return (
          <section key={category}>
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-2">
              {GUIDE_CATEGORY_LABELS[category]}
            </h3>
            <ul className="space-y-3 list-none p-0 m-0">
              {items.map((guide, i) => (
                <GuideRow
                  key={guide.id}
                  guide={guide}
                  index={i}
                  count={items.length}
                  onMove={(delta) => void move(category, i, delta)}
                  onSaved={replace}
                  onDeleted={(id) => setGuides((list) => list?.filter((g) => g.id !== id) ?? list)}
                />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
