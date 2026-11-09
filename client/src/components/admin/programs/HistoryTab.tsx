import { useCallback, useEffect, useState } from 'react'
import { Loader, RotateCcw } from 'lucide-react'
import AdminConfirmDialog from '../../AdminConfirmDialog'
import { listProgramVersions, type ProgramVersion } from '../../../api/admin/programs'
import { errorMessage, type ProgramEditorApi } from '../../../hooks/useProgramEditor'
import { cardClass, hintClass, secondaryButton } from './fields'

const STATE_LABELS: Record<ProgramVersion['state'], string> = {
  draft: 'Current draft',
  published: 'Live now',
  superseded: 'Published before',
}

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

export default function HistoryTab({ api, hasUnsaved }: { api: ProgramEditorApi; hasUnsaved: boolean }) {
  const programId = api.editor!.program.id
  const draftUpdatedAt = api.editor!.draftUpdatedAt
  const publishedAt = api.editor!.publishedAt
  const [versions, setVersions] = useState<ProgramVersion[] | null>(null)
  const [error, setError] = useState('')
  const [restoring, setRestoring] = useState<ProgramVersion | null>(null)

  const load = useCallback(() => {
    listProgramVersions(programId)
      .then((items) => {
        setVersions(items)
        setError('')
      })
      .catch((err) => setError(errorMessage(err, 'Failed to load the history')))
  }, [programId])

  useEffect(() => {
    load()
  }, [load, draftUpdatedAt, publishedAt])

  const restore = async () => {
    const target = restoring
    setRestoring(null)
    if (target) await api.restore(target.id)
  }

  return (
    <div className={`${cardClass} space-y-4 max-w-3xl`}>
      <div>
        <h2 className="text-lg font-bold">History</h2>
        <p className={hintClass}>
          Every time you publish, the old version is kept here. Restoring copies it into the draft, so you can check it
          before publishing again.
        </p>
      </div>
      {error && <p className="text-red-600">{error}</p>}
      {!versions ? (
        <div className="flex justify-center py-8">
          <Loader className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {versions.map((v) => (
            <li key={v.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {STATE_LABELS[v.state]}
                  <span className="font-normal text-gray-500 dark:text-gray-400"> · {v.week_count} weeks</span>
                </p>
                <p className={hintClass}>
                  {v.state === 'draft'
                    ? `Last saved ${formatDate(v.updated_at)}${v.updated_by_name ? ` by ${v.updated_by_name}` : ''}`
                    : `Published ${formatDate(v.published_at ?? v.created_at)}${v.published_by_name ? ` by ${v.published_by_name}` : ''}`}
                </p>
              </div>
              {v.state !== 'draft' && (
                <button type="button" onClick={() => setRestoring(v)} disabled={api.busy} className={secondaryButton}>
                  <RotateCcw size={16} /> Restore to draft
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <AdminConfirmDialog
        open={restoring !== null}
        title="Restore this version to the draft?"
        message={`It replaces the current draft${hasUnsaved ? ' and your unsaved changes' : ''}. Members see it only after you publish.`}
        confirmLabel="Restore"
        onConfirm={() => void restore()}
        onCancel={() => setRestoring(null)}
      />
    </div>
  )
}
