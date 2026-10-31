import { useEffect, useState } from 'react'
import { Loader, X } from 'lucide-react'
import { getEventWaitlist, type WaitlistEntry } from '../../api/admin/events'

/** People waiting for a seat, in order. Seats that open are offered to the first in line by email and WhatsApp. */
export default function EventWaitlistPanel({ eventId, title, onClose }: { eventId: string; title: string; onClose: () => void }) {
  const [entries, setEntries] = useState<WaitlistEntry[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getEventWaitlist(eventId)
      .then(setEntries)
      .catch((err: any) => setError(err.response?.data?.error || 'Failed to load the waiting list'))
  }, [eventId])

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-xl h-full overflow-y-auto bg-white dark:bg-gray-900 p-6 shadow-xl text-gray-900 dark:text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold">Waiting list</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2">
            <X size={20} />
          </button>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}
        {!entries && !error ? (
          <Loader className="w-6 h-6 animate-spin text-gray-400" />
        ) : entries && entries.length === 0 ? (
          <p className="text-sm text-gray-500">Nobody is waiting for this event.</p>
        ) : (
          <ol className="divide-y divide-gray-200 dark:divide-gray-700">
            {entries?.map((entry, i) => (
              <li key={entry.id} className="py-2 flex justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {i + 1}. {entry.name || entry.email}
                    {entry.has_account && <span className="ml-2 text-xs text-gray-500">member account</span>}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {entry.email}
                    {entry.phone ? ` · ${entry.phone}` : ''}
                  </p>
                </div>
                <div className="text-right text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  <p>Joined {new Date(entry.created_at).toLocaleDateString()}</p>
                  <p>{entry.notified_at ? `Told of a seat ${new Date(entry.notified_at).toLocaleDateString()}` : 'Waiting'}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
