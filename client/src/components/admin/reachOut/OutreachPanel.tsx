import { FormEvent, useEffect, useState } from 'react'
import { Loader, MessageCircle, Phone, X } from 'lucide-react'
import { addOutreachEntry, getOutreachLog, type OutreachEntry, type ReachOutMember } from '../../../api/admin/reachOut'
import {
  CHOICE_QUESTIONS,
  OUTREACH_STATUSES,
  QUESTION_SHORT_TITLES,
  answerLabel,
  type OutreachStatus,
} from '../../../content/signupQuestions'
import { StatusBadge, contactLinks, formatDate, zoneDisplay } from './memberDisplay'
import { adminSelectClass } from './ReachOutFilters'

const NOTE_MAX = 1000

export default function OutreachPanel({
  member,
  onClose,
  onLogged,
}: {
  member: ReachOutMember
  onClose: () => void
  onLogged: (member: ReachOutMember) => void
}) {
  const [history, setHistory] = useState<OutreachEntry[] | null>(null)
  const [status, setStatus] = useState<OutreachStatus>('contacted')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const links = contactLinks(member)

  useEffect(() => {
    let cancelled = false
    getOutreachLog(member.id)
      .then((entries) => !cancelled && setHistory(entries))
      .catch(() => !cancelled && setError('Could not load contact history'))
    return () => {
      cancelled = true
    }
  }, [member.id])

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

  const save = async (e: FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      setError('')
      const entry = await addOutreachEntry(member.id, { status, note: note.trim() || undefined })
      setHistory((prev) => [entry, ...(prev ?? [])])
      setNote('')
      onLogged({
        ...member,
        outreach_status: entry.status,
        last_contacted_at: entry.created_at,
        last_contacted_by: entry.contacted_by_name,
        last_note: entry.note,
      })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="outreach-title">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <aside className="relative w-full max-w-lg h-full overflow-y-auto bg-white dark:bg-gray-800 shadow-2xl text-gray-900 dark:text-gray-100">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 p-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div>
            <h2 id="outreach-title" className="text-xl font-bold">{member.name || 'Member'}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {member.phone || '-'}
              {member.email ? ` · ${member.email}` : ''}
            </p>
            <div className="mt-2 flex items-center gap-3">
              <StatusBadge status={member.outreach_status} />
              {links.whatsapp && (
                <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-green-700 dark:text-green-400">
                  <MessageCircle size={16} /> WhatsApp
                </a>
              )}
              {links.call && (
                <a href={links.call} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400">
                  <Phone size={16} /> Call
                </a>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={20} />
          </button>
        </header>

        <div className="p-5 space-y-6">
          <section>
            <h3 className="text-sm font-semibold mb-2">Answers</h3>
            <dl className="grid grid-cols-1 gap-1.5 text-sm m-0">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500 dark:text-gray-400">Zone</dt>
                <dd className="m-0 text-right">{zoneDisplay(member)}</dd>
              </div>
              {CHOICE_QUESTIONS.map((q) => (
                <div key={q.field} className="flex justify-between gap-3">
                  <dt className="text-gray-500 dark:text-gray-400">{QUESTION_SHORT_TITLES[q.field]}</dt>
                  <dd className="m-0 text-right">
                    {answerLabel(q.field, member[q.field])}
                    {q.field === 'hardest_now' && member.hardest_now_other && (
                      <div className="text-xs italic text-gray-500 dark:text-gray-400">"{member.hardest_now_other}"</div>
                    )}
                  </dd>
                </div>
              ))}
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500 dark:text-gray-400">Joined / last active</dt>
                <dd className="m-0 text-right">
                  {formatDate(member.created_at)} / {formatDate(member.last_active_at)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500 dark:text-gray-400">Events attended</dt>
                <dd className="m-0 text-right">{member.events_attended}</dd>
              </div>
            </dl>
          </section>

          <form onSubmit={save} className="space-y-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold m-0">Log contact</h3>
            <label className="block text-sm">
              <span className="block mb-1 text-gray-600 dark:text-gray-300">Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as OutreachStatus)} className={adminSelectClass}>
                {OUTREACH_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="block mb-1 text-gray-600 dark:text-gray-300">Note</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={NOTE_MAX}
                rows={3}
                placeholder="What was said, what to follow up on"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </label>
            {error && <p className="text-sm text-red-600 dark:text-red-400 m-0">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="px-4 min-h-[44px] rounded-lg bg-primary dark:bg-primary-dark text-white dark:text-black font-semibold disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </form>

          <section>
            <h3 className="text-sm font-semibold mb-2">History</h3>
            {history === null ? (
              <Loader className="w-5 h-5 animate-spin text-gray-400" />
            ) : history.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No contact logged yet.</p>
            ) : (
              <ol className="list-none m-0 p-0 space-y-3">
                {history.map((entry) => (
                  <li key={entry.id} className="border-l-2 border-gray-300 dark:border-gray-600 pl-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <StatusBadge status={entry.status} />
                      <span>
                        {entry.contacted_by_name ?? 'Someone'}, {formatDate(entry.created_at, true)}
                      </span>
                    </div>
                    {entry.note && <p className="mt-1 mb-0 text-sm whitespace-pre-wrap">{entry.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </aside>
    </div>
  )
}
