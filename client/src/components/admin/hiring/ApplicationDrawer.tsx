import { FormEvent, ReactNode, useEffect, useState } from 'react'
import { ExternalLink, Loader, Mail, MessageCircle, X } from 'lucide-react'
import {
  HIRING_STATUSES,
  HIRING_STATUS_LABELS,
  getApplication,
  updateApplication,
  type AdminOption,
  type CoachApplication,
  type HiringStatus,
} from '../../../api/admin/hiring'
import { formatDate } from '../reachOut/memberDisplay'
import { adminSelectClass } from '../reachOut/ReachOutFilters'
import { HiringStatusBadge, adminName, hoursLabel } from './hiringDisplay'

const NOTES_MAX = 5000

function Answer({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="m-0 mt-0.5 text-sm whitespace-pre-wrap break-words">{children}</dd>
    </div>
  )
}

export default function ApplicationDrawer({
  id,
  admins,
  onClose,
  onSaved,
}: {
  id: string
  admins: AdminOption[]
  onClose: () => void
  onSaved: (application: CoachApplication) => void
}) {
  const [app, setApp] = useState<CoachApplication | null>(null)
  const [loadError, setLoadError] = useState('')
  const [status, setStatus] = useState<HiringStatus>('new')
  const [handledBy, setHandledBy] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setApp(null)
    setLoadError('')
    getApplication(id)
      .then((data) => {
        if (cancelled) return
        setApp(data)
        setStatus(data.status)
        setHandledBy(data.handled_by ?? '')
        setNotes(data.notes ?? '')
      })
      .catch((err) => !cancelled && setLoadError(err.response?.status === 404 ? 'This application was not found.' : 'Could not load this application.'))
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  const dirty =
    app !== null && (status !== app.status || handledBy !== (app.handled_by ?? '') || notes.trim() !== (app.notes ?? ''))

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!app) return
    try {
      setSaving(true)
      setError('')
      const body: Parameters<typeof updateApplication>[1] = {}
      if (status !== app.status) body.status = status
      if (notes.trim() !== (app.notes ?? '')) body.notes = notes
      if (handledBy !== (app.handled_by ?? '')) body.handledBy = handledBy || null
      const updated = await updateApplication(app.id, body)
      setApp(updated)
      setStatus(updated.status)
      setHandledBy(updated.handled_by ?? '')
      setNotes(updated.notes ?? '')
      setSavedAt(Date.now())
      onSaved(updated)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const whatsapp = app ? `https://wa.me/${app.phone}` : ''

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="application-title">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <aside className="relative w-full max-w-xl h-full overflow-y-auto bg-white dark:bg-gray-800 shadow-2xl text-gray-900 dark:text-gray-100">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 p-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="min-w-0">
            <h2 id="application-title" className="text-xl font-bold truncate">{app?.full_name ?? 'Application'}</h2>
            {app && (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400 m-0">
                  Applied {formatDate(app.created_at, true)} · {app.location}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <HiringStatusBadge status={app.status} />
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-green-700 dark:text-green-400">
                    <MessageCircle size={16} /> WhatsApp
                  </a>
                  <a href={`mailto:${app.email}`} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400">
                    <Mail size={16} /> Email
                  </a>
                </div>
              </>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={20} />
          </button>
        </header>

        {loadError ? (
          <p className="p-5 text-sm text-red-600 dark:text-red-400">{loadError}</p>
        ) : !app ? (
          <div className="p-5"><Loader className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : (
          <div className="p-5 space-y-6">
            <form onSubmit={save} className="space-y-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="block mb-1 text-gray-600 dark:text-gray-300">Status</span>
                  <select value={status} onChange={(e) => setStatus(e.target.value as HiringStatus)} className={adminSelectClass}>
                    {HIRING_STATUSES.map((s) => (
                      <option key={s} value={s}>{HIRING_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="block mb-1 text-gray-600 dark:text-gray-300">Handled by</span>
                  <select value={handledBy} onChange={(e) => setHandledBy(e.target.value)} className={adminSelectClass}>
                    <option value="">Nobody yet</option>
                    {admins.map((a) => (
                      <option key={a.id} value={a.id}>{adminName(a)}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block text-sm">
                <span className="block mb-1 text-gray-600 dark:text-gray-300">Notes</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={NOTES_MAX}
                  rows={4}
                  placeholder="What you thought of the video, call times, next steps"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 m-0">
                Changing the status sets you as the handler unless you pick someone else.
              </p>
              {error && <p className="text-sm text-red-600 dark:text-red-400 m-0">{error}</p>}
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving || !dirty}
                  className="px-4 min-h-[44px] rounded-lg bg-primary dark:bg-primary-dark text-white dark:text-black font-semibold disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                {savedAt && !dirty && <span className="text-sm text-green-700 dark:text-green-400">Saved</span>}
              </div>
            </form>

            <section>
              <h3 className="text-sm font-semibold mb-2">Video</h3>
              {app.video_source === 'upload' ? (
                <video src={app.video_url} controls preload="metadata" className="w-full max-h-[360px] rounded-lg bg-black" />
              ) : null}
              <a href={app.video_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 break-all">
                <ExternalLink size={16} className="flex-shrink-0" /> {app.video_source === 'upload' ? 'Open the video file' : app.video_url}
              </a>
            </section>

            <section>
              <h3 className="text-sm font-semibold mb-3">Answers</h3>
              <dl className="m-0 space-y-4">
                <Answer label="Phone (WhatsApp)">{app.phone}</Answer>
                <Answer label="Email">{app.email}</Answer>
                <Answer label="Based in">{app.location}</Answer>
                <Answer label="Social link">
                  <a href={app.social_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 break-all">{app.social_url}</a>
                </Answer>
                <Answer label="Coaching experience">{app.experience}</Answer>
                <Answer label="Can give 3 hours every day">{app.can_give_3_hours ? 'Yes' : 'No'}</Answer>
                <Answer label="Hours they can give">{hoursLabel(app.hours)}</Answer>
                <Answer label="A time they worked harder than anyone">{app.worked_harder}</Answer>
                <Answer label="Agreed to">
                  Coach standards and storing their details, {formatDate(app.agreed_storage_at, true)}
                </Answer>
                {app.status_changed_at && (
                  <Answer label="Status last changed">{formatDate(app.status_changed_at, true)}</Answer>
                )}
              </dl>
            </section>
          </div>
        )}
      </aside>
    </div>
  )
}
