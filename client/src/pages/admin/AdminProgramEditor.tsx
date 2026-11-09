import { useEffect, useState } from 'react'
import { Link, useBlocker, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Loader, RefreshCw, Send, Undo2 } from 'lucide-react'
import AdminConfirmDialog from '../../components/AdminConfirmDialog'
import BrowseCardTab from '../../components/admin/programs/BrowseCardTab'
import CheckinQuestionsTab from '../../components/admin/programs/CheckinQuestionsTab'
import HistoryTab from '../../components/admin/programs/HistoryTab'
import PublicPageTab from '../../components/admin/programs/PublicPageTab'
import PublishDialog from '../../components/admin/programs/PublishDialog'
import SettingsTab from '../../components/admin/programs/SettingsTab'
import WeeklyPlanTab from '../../components/admin/programs/WeeklyPlanTab'
import { ErrorBox, primaryButton, secondaryButton } from '../../components/admin/programs/fields'
import { usePrograms } from '../../context/ProgramsContext'
import { programListStatus } from '../../content/programEditor'
import { useProgramEditor } from '../../hooks/useProgramEditor'
import { StatusBadge } from './AdminPrograms'

const TABS = [
  { id: 'plan', label: 'Weekly plan' },
  { id: 'checkin', label: 'Check-in questions' },
  { id: 'page', label: 'Public page' },
  { id: 'card', label: 'Browse card' },
  { id: 'settings', label: 'Settings' },
  { id: 'history', label: 'History' },
] as const
type TabId = (typeof TABS)[number]['id']

export default function AdminProgramEditor() {
  const { id } = useParams()
  const api = useProgramEditor(id)
  const { reload: reloadCatalog } = usePrograms()
  const [tab, setTab] = useState<TabId>('plan')
  const [dirty, setDirty] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname
  )

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const confirmLeave = (action: () => void) => setPendingAction(() => action)

  const switchTab = (next: TabId) => {
    if (next === tab) return
    if (dirty) confirmLeave(() => setTab(next))
    else setTab(next)
  }

  if (api.loading && !api.editor) {
    return (
      <div className="flex items-center justify-center h-60">
        <Loader className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    )
  }
  if (!api.editor || !api.editor.content) {
    return (
      <div className="space-y-4">
        <Link to="/admin/programs" className="inline-flex items-center gap-1 text-sm font-semibold text-primary dark:text-primary-dark">
          <ArrowLeft size={16} /> All programs
        </Link>
        <ErrorBox>{api.loadError || 'This program has no content yet.'}</ErrorBox>
      </div>
    )
  }

  const { program, hasDraft, hasPublished, draftUpdatedAt, publishedAt } = api.editor
  const status = programListStatus({ status: program.status, draft_updated_at: draftUpdatedAt, published_at: publishedAt })
  const canPublish = hasDraft && program.status !== 'archived'
  const tabProps = { api, onDirtyChange: setDirty }

  const discard = async () => {
    setConfirmDiscard(false)
    setDirty(false)
    await api.discard()
  }

  return (
    <div className="text-gray-900 dark:text-gray-100">
      <Link to="/admin/programs" className="inline-flex items-center gap-1 min-h-[44px] text-sm font-semibold text-primary dark:text-primary-dark">
        <ArrowLeft size={16} /> All programs
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">{program.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <StatusBadge status={status} />
            <span>/programs/{program.slug}</span>
            {hasDraft && draftUpdatedAt && <span>· Draft saved {new Date(draftUpdatedAt).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/programs/${program.slug}?preview=draft`} target="_blank" rel="noopener noreferrer" className={secondaryButton}>
            <ExternalLink size={16} /> Preview draft
          </a>
          {hasDraft && hasPublished && (
            <button type="button" onClick={() => setConfirmDiscard(true)} disabled={api.busy} className={secondaryButton}>
              <Undo2 size={16} /> Discard draft
            </button>
          )}
          <button
            type="button"
            onClick={() => (dirty ? confirmLeave(() => setPublishing(true)) : setPublishing(true))}
            disabled={!canPublish || api.busy}
            className={primaryButton}
            title={canPublish ? undefined : program.status === 'archived' ? 'Bring the program back first' : 'No unpublished changes'}
          >
            <Send size={16} /> Publish
          </button>
        </div>
      </div>

      {api.conflict && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-3 text-sm">
          <span className="flex-1">Someone else changed this program. Reload to get the latest version before you keep editing.</span>
          <button
            type="button"
            onClick={() => {
              setDirty(false)
              void api.reload()
            }}
            className={secondaryButton}
          >
            <RefreshCw size={16} /> Reload
          </button>
        </div>
      )}
      {api.error && !api.conflict && (
        <div className="mb-4">
          <ErrorBox>{api.error}</ErrorBox>
        </div>
      )}

      <div role="tablist" aria-label="Program sections" className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-700 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => switchTab(t.id)}
            className={`px-4 min-h-[44px] whitespace-nowrap font-semibold border-b-2 -mb-px ${
              tab === t.id
                ? 'border-primary text-primary dark:border-primary-dark dark:text-primary-dark'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === 'plan' && <WeeklyPlanTab {...tabProps} dirty={dirty} confirmLeave={confirmLeave} />}
        {tab === 'checkin' && <CheckinQuestionsTab {...tabProps} />}
        {tab === 'page' && <PublicPageTab {...tabProps} />}
        {tab === 'card' && <BrowseCardTab {...tabProps} />}
        {tab === 'settings' && <SettingsTab {...tabProps} onChanged={() => void reloadCatalog()} />}
        {tab === 'history' && <HistoryTab api={api} hasUnsaved={dirty} />}
      </div>

      {publishing && (
        <PublishDialog
          programId={program.id}
          programName={program.name}
          enrolledCount={api.editor.enrolledCount}
          onClose={() => setPublishing(false)}
          onPublished={(next) => {
            setPublishing(false)
            setDirty(false)
            api.setEditor(next)
            void reloadCatalog()
          }}
        />
      )}

      <AdminConfirmDialog
        open={pendingAction !== null}
        title="Discard unsaved changes?"
        message="You have changes on this screen that are not saved to the draft yet."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        variant="danger"
        onConfirm={() => {
          const action = pendingAction
          setPendingAction(null)
          setDirty(false)
          action?.()
        }}
        onCancel={() => setPendingAction(null)}
      />
      <AdminConfirmDialog
        open={blocker.state === 'blocked'}
        title="Leave without saving?"
        message="You have changes on this screen that are not saved to the draft yet."
        confirmLabel="Leave"
        cancelLabel="Keep editing"
        variant="danger"
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />
      <AdminConfirmDialog
        open={confirmDiscard}
        title="Discard the draft?"
        message="All unpublished changes are thrown away and the editor goes back to what is live now. This cannot be undone."
        confirmLabel="Discard draft"
        variant="danger"
        onConfirm={() => void discard()}
        onCancel={() => setConfirmDiscard(false)}
      />
    </div>
  )
}
