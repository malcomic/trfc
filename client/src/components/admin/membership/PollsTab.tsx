import { useEffect, useState } from 'react'
import { AlertCircle, Loader, Lock, Pencil, Plus, Trash2, X } from 'lucide-react'
import { adminSelectClass } from '../reachOut/ReachOutFilters'
import { closePoll, createPoll, deletePoll, getAdminPolls, updatePoll } from '../../../api/admin/membership'
import type { MemberPoll } from '../../../api/membership'
import PollResultBars from '../../member/membership/PollResultBars'
import { MEMBERSHIP_COPY, memberDateTime } from '../../../content/membership'
import { fromNairobiInput, toNairobiInput } from './membershipAdmin'

const MIN_OPTIONS = 2
const MAX_OPTIONS = 8
const errorOf = (err: any, fallback: string) => err?.response?.data?.error || fallback

const STATUS_STYLES: Record<MemberPoll['status'], string> = {
  open: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  upcoming: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  closed: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}
const STATUS_LABELS: Record<MemberPoll['status'], string> = { open: 'Open', upcoming: 'Opens later', closed: 'Closed' }

function CreatePollForm({ onCreated }: { onCreated: (poll: MemberPoll) => void }) {
  const [question, setQuestion] = useState('')
  const [description, setDescription] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [opensAt, setOpensAt] = useState('')
  const [closesAt, setClosesAt] = useState('')
  const [announce, setAnnounce] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const submit = async () => {
    const opens = opensAt ? fromNairobiInput(opensAt) : ''
    const closes = fromNairobiInput(closesAt)
    if (opens === null || !closes) return setError('Choose valid dates')
    try {
      setSaving(true)
      setError('')
      setMessage('')
      const result = await createPoll({
        question,
        description,
        options: options.map((o) => o.trim()).filter(Boolean),
        opensAt: opens,
        closesAt: closes,
        announce,
      })
      if (result.poll) onCreated(result.poll)
      setMessage(announce && !result.announced ? 'Poll created, but the announcement could not be sent.' : 'Poll created.')
      setQuestion('')
      setDescription('')
      setOptions(['', ''])
      setOpensAt('')
      setClosesAt('')
    } catch (err) {
      setError(errorOf(err, 'Could not create the poll'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-gray-900 dark:text-gray-100 text-sm">
      <h2 className="text-base font-bold mt-0 mb-3">New poll</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block md:col-span-2">
          <span className="block mb-1">Question</span>
          <input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={200} placeholder="Where should the March hike go?" className={adminSelectClass} />
        </label>
        <label className="block md:col-span-2">
          <span className="block mb-1">Description (optional)</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={1000} className={adminSelectClass} />
        </label>
        <div className="md:col-span-2 space-y-2">
          <span className="block">Options ({MIN_OPTIONS} to {MAX_OPTIONS})</span>
          {options.map((option, i) => (
            <div key={i} className="flex gap-2">
              <input
                aria-label={`Option ${i + 1}`}
                value={option}
                onChange={(e) => setOptions((list) => list.map((o, j) => (j === i ? e.target.value : o)))}
                maxLength={120}
                className={`${adminSelectClass} flex-1`}
              />
              <button
                type="button"
                aria-label="Remove option"
                disabled={options.length <= MIN_OPTIONS}
                onClick={() => setOptions((list) => list.filter((_, j) => j !== i))}
                className="p-2 min-h-[44px] min-w-[44px] text-red-600 dark:text-red-400 disabled:opacity-30"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          {options.length < MAX_OPTIONS && (
            <button type="button" onClick={() => setOptions((list) => [...list, ''])} className="inline-flex items-center gap-1 text-sm font-semibold text-gray-700 dark:text-gray-300 min-h-[44px]">
              <Plus size={16} /> Add an option
            </button>
          )}
        </div>
        <label className="block">
          <span className="block mb-1">Opens (Nairobi time, empty for now)</span>
          <input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className={adminSelectClass} />
        </label>
        <label className="block">
          <span className="block mb-1">Closes (Nairobi time)</span>
          <input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className={adminSelectClass} />
        </label>
        <label className="flex items-center gap-3 md:col-span-2 min-h-[44px]">
          <input type="checkbox" checked={announce} onChange={(e) => setAnnounce(e.target.checked)} className="w-5 h-5" />
          <span>
            <span className="font-semibold">Announce to members</span>
            <span className="block text-xs text-gray-500 dark:text-gray-400">Posts a notice on members' dashboards and emails those who accept news emails.</span>
          </span>
        </label>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-0">Options are locked once anyone votes.</p>
      <div className="flex items-center justify-end gap-3 mt-3">
        {error && <p className="text-sm text-red-600 dark:text-red-400 m-0">{error}</p>}
        {message && <p className="text-sm text-green-700 dark:text-green-400 m-0">{message}</p>}
        <button type="button" onClick={submit} disabled={saving} className="inline-flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-lg bg-primary dark:bg-primary-dark text-white dark:text-black font-semibold disabled:opacity-50">
          {saving ? 'Creating…' : 'Create poll'}
        </button>
      </div>
    </section>
  )
}

function EditPollForm({ poll, onSaved, onCancel }: { poll: MemberPoll; onSaved: (poll: MemberPoll) => void; onCancel: () => void }) {
  const locked = poll.total > 0
  const [question, setQuestion] = useState(poll.question)
  const [description, setDescription] = useState(poll.description)
  const [opensAt, setOpensAt] = useState(toNairobiInput(poll.opensAt))
  const [closesAt, setClosesAt] = useState(toNairobiInput(poll.closesAt))
  const [options, setOptions] = useState(poll.options.map((o) => o.label))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    const opens = fromNairobiInput(opensAt)
    const closes = fromNairobiInput(closesAt)
    if (!opens || !closes) return setError('Choose valid dates')
    try {
      setSaving(true)
      setError('')
      onSaved(
        await updatePoll(poll.id, {
          question,
          description,
          opensAt: opens,
          closesAt: closes,
          ...(locked ? {} : { options: options.map((o) => o.trim()).filter(Boolean) }),
        })
      )
    } catch (err) {
      setError(errorOf(err, 'Could not save the poll'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
      <label className="block md:col-span-2">
        <span className="block mb-1">Question</span>
        <input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={200} className={adminSelectClass} />
      </label>
      <label className="block md:col-span-2">
        <span className="block mb-1">Description</span>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={1000} className={adminSelectClass} />
      </label>
      <label className="block">
        <span className="block mb-1">Opens (Nairobi time)</span>
        <input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className={adminSelectClass} />
      </label>
      <label className="block">
        <span className="block mb-1">Closes (Nairobi time)</span>
        <input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className={adminSelectClass} />
      </label>
      {locked ? (
        <p className="md:col-span-2 m-0 text-xs text-gray-500 dark:text-gray-400">Options are locked because members have voted.</p>
      ) : (
        <div className="md:col-span-2 space-y-2">
          <span className="block">Options</span>
          {options.map((option, i) => (
            <div key={i} className="flex gap-2">
              <input
                aria-label={`Option ${i + 1}`}
                value={option}
                onChange={(e) => setOptions((list) => list.map((o, j) => (j === i ? e.target.value : o)))}
                maxLength={120}
                className={`${adminSelectClass} flex-1`}
              />
              <button
                type="button"
                aria-label="Remove option"
                disabled={options.length <= MIN_OPTIONS}
                onClick={() => setOptions((list) => list.filter((_, j) => j !== i))}
                className="p-2 min-h-[44px] min-w-[44px] text-red-600 dark:text-red-400 disabled:opacity-30"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          {options.length < MAX_OPTIONS && (
            <button type="button" onClick={() => setOptions((list) => [...list, ''])} className="inline-flex items-center gap-1 text-sm font-semibold text-gray-700 dark:text-gray-300 min-h-[44px]">
              <Plus size={16} /> Add an option
            </button>
          )}
        </div>
      )}
      <div className="md:col-span-2 flex items-center justify-end gap-2">
        {error && <p className="text-sm text-red-600 dark:text-red-400 m-0 mr-auto">{error}</p>}
        <button type="button" onClick={onCancel} className="px-4 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 font-semibold">
          Cancel
        </button>
        <button type="button" onClick={save} disabled={saving} className="px-4 min-h-[44px] rounded-lg bg-primary dark:bg-primary-dark text-white dark:text-black font-semibold disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function PollCard({ poll, onChanged, onDeleted }: { poll: MemberPoll; onChanged: (poll: MemberPoll) => void; onDeleted: (id: string) => void }) {
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
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

  const close = () => {
    if (!window.confirm('Close this poll now? Members will no longer be able to vote.')) return
    void run(async () => onChanged(await closePoll(poll.id)), 'Could not close the poll')
  }
  const remove = () => {
    if (!window.confirm('Delete this poll?')) return
    void run(async () => {
      await deletePoll(poll.id)
      onDeleted(poll.id)
    }, 'Could not delete the poll')
  }

  const closedAt = poll.closedEarlyAt ?? poll.closesAt
  return (
    <li className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-gray-900 dark:text-gray-100 text-sm">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[poll.status]}`}>{STATUS_LABELS[poll.status]}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {poll.status === 'upcoming' && `Opens ${memberDateTime(poll.opensAt)} · `}
          {poll.status === 'closed' ? `Closed ${memberDateTime(closedAt)}` : `Closes ${memberDateTime(poll.closesAt)}`}
          {' · '}
          {MEMBERSHIP_COPY.vote.votes(poll.total)}
        </span>
        {poll.total > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Lock size={12} /> Options locked
          </span>
        )}
      </div>
      <p className="font-semibold m-0">{poll.question}</p>
      {poll.description && <p className="text-gray-600 dark:text-gray-300 mt-1 mb-0">{poll.description}</p>}
      <div className="mt-3">
        <PollResultBars poll={poll} />
      </div>
      {editing && (
        <EditPollForm
          poll={poll}
          onCancel={() => setEditing(false)}
          onSaved={(updated) => {
            onChanged(updated)
            setEditing(false)
          }}
        />
      )}
      <div className="flex flex-wrap items-center justify-end gap-2 mt-3">
        {error && <p className="text-sm text-red-600 dark:text-red-400 m-0 mr-auto">{error}</p>}
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 px-4 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 font-semibold">
            <Pencil size={16} /> Edit
          </button>
        )}
        {poll.status !== 'closed' && (
          <button type="button" onClick={close} disabled={busy} className="px-4 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 font-semibold disabled:opacity-50">
            Close now
          </button>
        )}
        {poll.total === 0 && (
          <button type="button" onClick={remove} disabled={busy} className="inline-flex items-center gap-1 px-4 min-h-[44px] rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 font-semibold disabled:opacity-50">
            <Trash2 size={16} /> Delete
          </button>
        )}
      </div>
    </li>
  )
}

export default function PollsTab() {
  const [polls, setPolls] = useState<MemberPoll[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getAdminPolls().then(setPolls).catch(() => setError('Failed to load polls'))
  }, [])

  if (!polls) {
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

  return (
    <div className="space-y-6">
      <CreatePollForm onCreated={(poll) => setPolls((list) => [poll, ...(list ?? [])])} />
      {polls.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-gray-400 m-0">No polls yet.</p>
      ) : (
        <ul className="space-y-3 list-none p-0 m-0">
          {polls.map((poll) => (
            <PollCard
              key={poll.id}
              poll={poll}
              onChanged={(updated) => setPolls((list) => list?.map((p) => (p.id === updated.id ? updated : p)) ?? list)}
              onDeleted={(id) => setPolls((list) => list?.filter((p) => p.id !== id) ?? list)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
