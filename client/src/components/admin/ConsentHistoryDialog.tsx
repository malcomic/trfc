import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { getUserConsents } from '../../api/admin/policies'
import { describeConsent, formatConsentTime, type ConsentHistoryEntry } from '../../api/privacy'

/** Every consent given or withdrawn by one user, newest first. */
export default function ConsentHistoryDialog({ user, onClose }: { user: { id: string; name: string }; onClose: () => void }) {
  const [entries, setEntries] = useState<ConsentHistoryEntry[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getUserConsents(user.id)
      .then(setEntries)
      .catch((err) => setError(err?.response?.data?.error || 'Failed to load consent history'))
  }, [user.id])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-lg w-full p-6 max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Consent history · {user.name}</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-900 dark:hover:text-white" aria-label="Close">
            <X size={22} />
          </button>
        </div>
        <div className="overflow-y-auto">
          {error ? (
            <p className="text-red-600 dark:text-red-400">{error}</p>
          ) : !entries ? (
            <p className="text-gray-600 dark:text-gray-400">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">No consents recorded yet.</p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              {entries.map((entry, i) => (
                <li key={i} className="py-2.5">
                  <span className={entry.granted ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                    {entry.granted ? 'Given' : 'Withdrawn'}
                  </span>{' '}
                  <span className="text-gray-900 dark:text-gray-100">{describeConsent(entry)}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{formatConsentTime(entry.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
