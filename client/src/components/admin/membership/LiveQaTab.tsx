import { useEffect, useState } from 'react'
import { AlertCircle, Check, Loader } from 'lucide-react'
import { adminSelectClass } from '../reachOut/ReachOutFilters'
import { getAdminLiveQa, saveLiveQa, type AdminLiveQa } from '../../../api/admin/membership'
import { memberDateTime } from '../../../content/membership'
import { fromNairobiInput, toNairobiInput } from './membershipAdmin'

interface Form {
  nextAt: string
  zoomUrl: string
  title: string
  notes: string
}

const toForm = (qa: AdminLiveQa): Form => ({
  nextAt: qa.nextAt ? toNairobiInput(qa.nextAt) : '',
  zoomUrl: qa.zoomUrl,
  title: qa.title,
  notes: qa.notes,
})

export default function LiveQaTab() {
  const [qa, setQa] = useState<AdminLiveQa | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getAdminLiveQa()
      .then((data) => {
        setQa(data)
        setForm(toForm(data))
      })
      .catch(() => setError('Failed to load the live Q&A'))
  }, [])

  if (!form || !qa) {
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

  const set = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f))

  const save = async () => {
    const nextAt = form.nextAt ? fromNairobiInput(form.nextAt) : ''
    if (nextAt === null) return setError('Choose a valid date and time')
    try {
      setSaving(true)
      setError('')
      const next = await saveLiveQa({ nextAt, zoomUrl: form.zoomUrl, title: form.title, notes: form.notes })
      setQa(next)
      setForm(toForm(next))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 md:p-5 text-gray-900 dark:text-gray-100 text-sm space-y-4">
      {!qa.on && (
        <p className="m-0 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300">
          The live Q&A perk is not switched on, so members will not see this session. Turn it on in the Perks tab.
        </p>
      )}
      <p className="m-0 text-gray-600 dark:text-gray-400">
        Set the next session each month. Members see the date straight away. The Zoom link only shows in their account from 1 hour before the start.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="block mb-1">Date and time (Nairobi time)</span>
          <input type="datetime-local" value={form.nextAt} onChange={(e) => set({ nextAt: e.target.value })} className={adminSelectClass} />
        </label>
        <label className="block">
          <span className="block mb-1">Zoom link</span>
          <input type="url" value={form.zoomUrl} onChange={(e) => set({ zoomUrl: e.target.value })} placeholder="https://zoom.us/j/…" className={adminSelectClass} />
        </label>
        <label className="block md:col-span-2">
          <span className="block mb-1">Title (optional)</span>
          <input value={form.title} onChange={(e) => set({ title: e.target.value })} maxLength={120} placeholder="Live Q&A with Coach Maurice" className={adminSelectClass} />
        </label>
        <label className="block md:col-span-2">
          <span className="block mb-1">Notes for members (optional)</span>
          <textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })} rows={3} maxLength={1000} placeholder="Topic, what to prepare, how to send questions…" className={adminSelectClass} />
        </label>
      </div>
      {qa.nextAt && (
        <p className="m-0 text-gray-600 dark:text-gray-400">
          {qa.reminderSentAt
            ? `The reminder went out on ${memberDateTime(qa.reminderSentAt)}.`
            : `A reminder goes out about a day before, from ${memberDateTime(qa.reminderAt!)}. Members see it on their dashboard, and those who accept news emails also get an email.`}
        </p>
      )}
      <p className="m-0 text-xs text-gray-500 dark:text-gray-400">Leave the date empty and save to clear the session.</p>
      <div className="flex items-center justify-end gap-3">
        {error && <p className="text-sm text-red-600 dark:text-red-400 m-0">{error}</p>}
        <button type="button" onClick={save} disabled={saving} className="inline-flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-lg bg-primary dark:bg-primary-dark text-white dark:text-black font-semibold disabled:opacity-50">
          {saved ? <><Check size={16} /> Saved</> : saving ? 'Saving…' : 'Save session'}
        </button>
      </div>
    </section>
  )
}
