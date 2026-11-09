import { FormEvent, useCallback, useEffect, useState } from 'react'
import { AlertCircle, Loader, Mail, Megaphone } from 'lucide-react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminConfirmDialog from '../../components/AdminConfirmDialog'
import AnnouncementBody from '../../components/announcements/AnnouncementBody'
import {
  archiveAnnouncement,
  createAnnouncement,
  getAnnouncements,
  getRecipientCount,
  sendTestAnnouncement,
  type AdminAnnouncement,
  type AnnouncementDraft,
  type RecipientCount,
} from '../../api/admin/announcements'
import type { AnnouncementAudience, AnnouncementKind } from '../../api/announcements'

const TITLE_MAX = 150
const BODY_MAX = 5000
const LINK_LABEL_MAX = 40
const POLL_MS = 30_000

const KIND_OPTIONS: { value: AnnouncementKind; label: string; hint: string }[] = [
  {
    value: 'important',
    label: 'Important notice',
    hint: 'Emailed to everyone in the audience. Use for changes they need to know about, like a cancelled run.',
  },
  {
    value: 'news',
    label: 'News',
    hint: 'Emailed only to people who opted in to news, with an unsubscribe link. Everyone still sees it in the dashboard.',
  },
]

const AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  all: 'Everyone',
  members: 'Members only',
  free: 'Free accounts only',
}

const EMPTY_DRAFT: AnnouncementDraft = {
  title: '',
  body: '',
  link_url: '',
  link_label: '',
  kind: 'important',
  audience: 'all',
  send_email: true,
}

const inputClass =
  'w-full px-4 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
const primaryButton =
  'px-4 py-2 min-h-[44px] rounded-lg bg-primary dark:bg-primary-dark text-white font-semibold disabled:opacity-50'
const secondaryButton =
  'px-4 py-2 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold disabled:opacity-50'
const cardClass = 'bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 text-gray-900 dark:text-gray-100'

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })

function confirmMessage(draft: AnnouncementDraft, count: RecipientCount | null): string {
  if (!count) return 'Send this announcement now?'
  const dashboard = `${plural(count.dashboard, 'person')} will see it in their dashboard.`
  if (!draft.send_email) return `${dashboard} No emails will be sent.`
  const pace = count.minutes > 1 ? ` Emails go out over about ${count.minutes} minutes.` : ''
  return `${dashboard} ${plural(count.email, 'email')} will be sent.${pace} This can't be undone.`
}

function EmailProgress({ item }: { item: AdminAnnouncement }) {
  if (!item.send_email) return <span className="text-gray-500 dark:text-gray-400">Dashboard only</span>
  if (item.emails_total === 0) return <span className="text-gray-500 dark:text-gray-400">No recipients</span>
  const done = item.emails_sent + item.emails_failed
  return (
    <div className="space-y-1 min-w-[140px]">
      <div className="h-2 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div
          className="h-full bg-primary dark:bg-primary-dark transition-all"
          style={{ width: `${Math.round((done / item.emails_total) * 100)}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {item.emails_sent} of {item.emails_total} sent
        {item.emails_failed > 0 && <span className="text-red-600 dark:text-red-400"> · {item.emails_failed} failed</span>}
      </p>
    </div>
  )
}

export default function AdminAnnouncements() {
  const [draft, setDraft] = useState<AnnouncementDraft>(EMPTY_DRAFT)
  const [count, setCount] = useState<RecipientCount | null>(null)
  const [history, setHistory] = useState<AdminAnnouncement[] | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loadError, setLoadError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [sending, setSending] = useState(false)
  const [testing, setTesting] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<AdminAnnouncement | null>(null)

  const update = <K extends keyof AnnouncementDraft>(key: K, value: AnnouncementDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }))

  const loadHistory = useCallback(
    () =>
      getAnnouncements()
        .then((items) => {
          setHistory(items)
          setLoadError('')
        })
        .catch(() => setLoadError('Failed to load past announcements')),
    []
  )

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const hasPendingEmails = history?.some((item) => item.emails_pending > 0) ?? false
  useEffect(() => {
    if (!hasPendingEmails) return
    const timer = setInterval(loadHistory, POLL_MS)
    return () => clearInterval(timer)
  }, [hasPendingEmails, loadHistory])

  useEffect(() => {
    let cancelled = false
    setCount(null)
    getRecipientCount({ audience: draft.audience, kind: draft.kind, sendEmail: draft.send_email })
      .then((result) => !cancelled && setCount(result))
      .catch(() => !cancelled && setCount(null))
    return () => {
      cancelled = true
    }
  }, [draft.audience, draft.kind, draft.send_email])

  const validate = (): string => {
    if (draft.title.trim().length < 3) return 'Add a title of at least 3 characters.'
    if (!draft.body.trim()) return 'Write a message.'
    if (draft.link_url.trim() && !draft.link_label.trim()) return 'Add a label for the button.'
    if (draft.link_label.trim() && !draft.link_url.trim()) return 'Add the link the button opens.'
    return ''
  }

  const openConfirm = (e: FormEvent) => {
    e.preventDefault()
    setNotice('')
    const problem = validate()
    setError(problem)
    if (!problem) setConfirming(true)
  }

  const send = async () => {
    setConfirming(false)
    setSending(true)
    setError('')
    try {
      const { queued } = await createAnnouncement(draft)
      setDraft(EMPTY_DRAFT)
      setNotice(
        draft.send_email
          ? `Published. ${plural(queued, 'email')} queued.`
          : 'Published to dashboards. No emails were sent.'
      )
      loadHistory()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send the announcement')
    } finally {
      setSending(false)
    }
  }

  const sendTest = async () => {
    setNotice('')
    const problem = validate()
    setError(problem)
    if (problem) return
    setTesting(true)
    try {
      const { sentTo } = await sendTestAnnouncement(draft)
      setNotice(`Test email sent to ${sentTo}.`)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send the test email')
    } finally {
      setTesting(false)
    }
  }

  const archive = async () => {
    const target = archiveTarget
    setArchiveTarget(null)
    if (!target) return
    try {
      await archiveAnnouncement(target.id)
      loadHistory()
    } catch (err: any) {
      setLoadError(err.response?.data?.error || 'Failed to archive the announcement')
    }
  }

  const kindHint = KIND_OPTIONS.find((o) => o.value === draft.kind)?.hint

  return (
    <div>
      <AdminPageHeader
        title="Announcements"
        subtitle="Send a notification to members' dashboards, and optionally by email."
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-10">
        <form onSubmit={openConfirm} className={`${cardClass} space-y-5`}>
          <fieldset className="space-y-2">
            <legend className="block text-sm font-semibold mb-1">Type</legend>
            <div className="flex flex-wrap gap-4">
              {KIND_OPTIONS.map((option) => (
                <label key={option.value} className="inline-flex items-center gap-2 min-h-[44px] cursor-pointer">
                  <input
                    type="radio"
                    name="kind"
                    value={option.value}
                    checked={draft.kind === option.value}
                    onChange={() => update('kind', option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{kindHint}</p>
          </fieldset>

          <div className="space-y-1">
            <label htmlFor="announcement-audience" className="block text-sm font-semibold">
              Audience
            </label>
            <select
              id="announcement-audience"
              value={draft.audience}
              onChange={(e) => update('audience', e.target.value as AnnouncementAudience)}
              className={inputClass}
            >
              {(Object.keys(AUDIENCE_LABELS) as AnnouncementAudience[]).map((value) => (
                <option key={value} value={value}>
                  {AUDIENCE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="announcement-title" className="block text-sm font-semibold">
              Title
            </label>
            <input
              id="announcement-title"
              type="text"
              maxLength={TITLE_MAX}
              value={draft.title}
              onChange={(e) => update('title', e.target.value)}
              className={inputClass}
              placeholder="Saturday long run moves to 6:30am"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">Also used as the email subject.</p>
          </div>

          <div className="space-y-1">
            <label htmlFor="announcement-body" className="block text-sm font-semibold">
              Message
            </label>
            <textarea
              id="announcement-body"
              rows={7}
              maxLength={BODY_MAX}
              value={draft.body}
              onChange={(e) => update('body', e.target.value)}
              className={`${inputClass} py-3`}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Plain text. Leave a blank line between paragraphs. {draft.body.length}/{BODY_MAX}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="announcement-link-label" className="block text-sm font-semibold">
                Button label <span className="font-normal text-gray-500">(optional)</span>
              </label>
              <input
                id="announcement-link-label"
                type="text"
                maxLength={LINK_LABEL_MAX}
                value={draft.link_label}
                onChange={(e) => update('link_label', e.target.value)}
                className={inputClass}
                placeholder="View events"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="announcement-link-url" className="block text-sm font-semibold">
                Button link <span className="font-normal text-gray-500">(optional)</span>
              </label>
              <input
                id="announcement-link-url"
                type="text"
                value={draft.link_url}
                onChange={(e) => update('link_url', e.target.value)}
                className={inputClass}
                placeholder="/events or https://…"
              />
            </div>
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={draft.send_email}
              onChange={(e) => update('send_email', e.target.checked)}
            />
            <span>
              <span className="font-semibold">Also send by email</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                Emails go out 20 a minute so Gmail doesn't block the account.
              </span>
            </span>
          </label>

          <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 p-3 text-sm">
            {count ? (
              <>
                <strong>{plural(count.dashboard, 'person')}</strong> will see this in their dashboard
                {draft.send_email && (
                  <>
                    , and <strong>{plural(count.email, 'email')}</strong> will be sent
                    {count.minutes > 1 && <> over about {count.minutes} minutes</>}
                  </>
                )}
                .
              </>
            ) : (
              <span className="text-gray-500 dark:text-gray-400">Counting recipients…</span>
            )}
          </div>

          {error && (
            <div className="flex gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}
          {notice && <p className="text-sm text-green-600 dark:text-green-400">{notice}</p>}

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={sending} className={`${primaryButton} inline-flex items-center gap-2`}>
              <Megaphone size={16} /> {sending ? 'Sending…' : 'Send announcement'}
            </button>
            <button
              type="button"
              onClick={sendTest}
              disabled={testing || sending}
              className={`${secondaryButton} inline-flex items-center gap-2`}
            >
              <Mail size={16} /> {testing ? 'Sending test…' : 'Email me a test'}
            </button>
          </div>
        </form>

        <section className={`${cardClass} space-y-3`}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Preview</h2>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  draft.kind === 'important'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                }`}
              >
                {draft.kind === 'important' ? 'Important' : 'News'}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{AUDIENCE_LABELS[draft.audience]}</span>
            </div>
            <h3 className="text-lg font-semibold break-words">{draft.title.trim() || 'Your title'}</h3>
            <AnnouncementBody
              body={draft.body.trim() || 'Your message appears here.'}
              linkUrl={draft.link_url.trim() || null}
              linkLabel={draft.link_label.trim() || null}
              className="text-sm text-gray-700 dark:text-gray-300"
              linkClassName="inline-flex items-center gap-1.5 font-semibold text-primary dark:text-primary-dark underline"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            New accounts only see announcements sent after they signed up.
          </p>
        </section>
      </div>

      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Sent</h2>
      {loadError && <p className="text-red-600 mb-4">{loadError}</p>}
      {!history ? (
        <div className="flex items-center justify-center h-40">
          <Loader className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : history.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No announcements yet.</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-x-auto">
          <table className="w-full text-sm text-gray-900 dark:text-gray-100">
            <thead className="text-left text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3">Announcement</th>
                <th className="px-4 py-3">Audience</th>
                <th className="px-4 py-3">Read by</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr
                  key={item.id}
                  className={`border-b border-gray-100 dark:border-gray-700 last:border-0 ${item.archived_at ? 'opacity-60' : ''}`}
                >
                  <td className="px-4 py-3 align-top">
                    <p className="font-semibold break-words">{item.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.kind === 'important' ? 'Important' : 'News'} · {formatDate(item.published_at)}
                      {item.created_by_name && <> · {item.created_by_name}</>}
                      {item.archived_at && <> · Archived</>}
                    </p>
                  </td>
                  <td className="px-4 py-3 align-top whitespace-nowrap">{AUDIENCE_LABELS[item.audience]}</td>
                  <td className="px-4 py-3 align-top">{item.reads}</td>
                  <td className="px-4 py-3 align-top">
                    <EmailProgress item={item} />
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    {!item.archived_at && (
                      <button
                        type="button"
                        onClick={() => setArchiveTarget(item)}
                        className="text-sm font-semibold text-red-600 dark:text-red-400 hover:underline min-h-[44px]"
                      >
                        Archive
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminConfirmDialog
        open={confirming}
        title="Send this announcement?"
        message={confirmMessage(draft, count)}
        confirmLabel="Send now"
        onConfirm={send}
        onCancel={() => setConfirming(false)}
      />
      <AdminConfirmDialog
        open={archiveTarget != null}
        title="Archive this announcement?"
        message="It disappears from members' dashboards. Emails already sent can't be recalled; any still queued are cancelled."
        confirmLabel="Archive"
        variant="danger"
        onConfirm={archive}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  )
}
