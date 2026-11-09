import { useEffect, useState } from 'react'
import { AlertTriangle, Loader, XCircle } from 'lucide-react'
import { getPublishCheck, publishProgram, type AdminProgramEditor, type PublishCheck, type PublishIssue } from '../../../api/admin/programs'
import { errorMessage } from '../../../hooks/useProgramEditor'
import { ErrorBox, hintClass, primaryButton, secondaryButton } from './fields'

function IssueList({ issues, tone }: { issues: PublishIssue[]; tone: 'error' | 'warning' }) {
  const Icon = tone === 'error' ? XCircle : AlertTriangle
  const color = tone === 'error' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
  return (
    <ul className="space-y-1.5 max-h-56 overflow-y-auto">
      {issues.map((issue, i) => (
        <li key={i} className="flex gap-2 text-sm">
          <Icon size={16} className={`shrink-0 mt-0.5 ${color}`} aria-hidden="true" />
          <span>
            <strong>{issue.where}:</strong> {issue.message}
          </span>
        </li>
      ))}
    </ul>
  )
}

export default function PublishDialog({
  programId,
  programName,
  enrolledCount,
  onClose,
  onPublished,
}: {
  programId: string
  programName: string
  enrolledCount: number
  onClose: () => void
  onPublished: (editor: AdminProgramEditor) => void
}) {
  const [check, setCheck] = useState<PublishCheck | null>(null)
  const [error, setError] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    let cancelled = false
    getPublishCheck(programId)
      .then((result) => !cancelled && setCheck(result))
      .catch((err) => !cancelled && setError(errorMessage(err, 'Failed to check the program')))
    return () => {
      cancelled = true
    }
  }, [programId])

  const publish = async () => {
    setPublishing(true)
    setError('')
    try {
      onPublished(await publishProgram(programId, accepted))
    } catch (err: any) {
      const data = err?.response?.data
      if (data?.errors || data?.warnings) {
        setCheck({ hasDraft: true, errors: data.errors ?? [], warnings: data.warnings ?? [] })
        setAccepted(false)
      }
      setError(errorMessage(err, 'Failed to publish the program'))
    } finally {
      setPublishing(false)
    }
  }

  const blocked = !check || check.errors.length > 0
  const needsAccept = !!check && check.warnings.length > 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]" role="dialog" aria-modal="true" aria-labelledby="publish-title">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-lg w-full p-6 space-y-4 text-gray-900 dark:text-gray-100">
        <h2 id="publish-title" className="text-xl font-bold">
          Publish {programName}?
        </h2>
        {!check && !error && (
          <p className="flex items-center gap-2 text-gray-500">
            <Loader size={16} className="animate-spin" /> Checking the program…
          </p>
        )}
        {check && !check.hasDraft && <p>There are no unpublished changes.</p>}
        {check && check.errors.length > 0 && (
          <div className="space-y-2">
            <p className="font-semibold">Fix these first:</p>
            <IssueList issues={check.errors} tone="error" />
          </div>
        )}
        {check && check.errors.length === 0 && check.hasDraft && (
          <p className="text-gray-600 dark:text-gray-300">
            Your changes go live on the public page and in members' dashboards straight away.
            {enrolledCount > 0 && ` ${enrolledCount} member${enrolledCount === 1 ? ' is' : 's are'} in this program.`}
          </p>
        )}
        {check && check.errors.length === 0 && needsAccept && (
          <div className="space-y-2">
            <p className="font-semibold">Before you publish, check these:</p>
            <IssueList issues={check.warnings} tone="warning" />
            <label className="flex items-start gap-2 min-h-[44px] cursor-pointer">
              <input type="checkbox" className="mt-1" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
              <span className="text-sm">I have checked these and want to publish anyway.</span>
            </label>
          </div>
        )}
        {error && <ErrorBox>{error}</ErrorBox>}
        <p className={hintClass}>You can bring back an older version from the History tab at any time.</p>
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void publish()}
            disabled={blocked || !check?.hasDraft || (needsAccept && !accepted) || publishing}
            className={primaryButton}
          >
            {publishing ? 'Publishing…' : 'Publish now'}
          </button>
        </div>
      </div>
    </div>
  )
}
