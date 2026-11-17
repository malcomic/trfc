import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader } from 'lucide-react'
import { getCoachInbox, type CoachConversationSummary } from '../../api/coaches'

export default function CoachInbox() {
  const [items, setItems] = useState<CoachConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getCoachInbox()
      .then((data) => !cancelled && setItems(data.items))
      .catch(() => !cancelled && setError('Could not load inbox.'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-fog light:text-fog-light font-barlow">
        <Loader className="animate-spin" size={18} /> Loading inbox…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="m-0 font-bebas text-4xl text-chalk light:text-chalk-light">Inbox</h1>
        <p className="m-0 mt-2 font-barlow text-fog light:text-fog-light">
          Messages with participants in your assigned programs.
        </p>
      </div>

      {error && <p className="m-0 text-red-500 font-barlow text-sm">{error}</p>}

      {items.length === 0 ? (
        <p className="m-0 font-barlow text-fog light:text-fog-light">No conversations yet.</p>
      ) : (
        <ul className="m-0 p-0 list-none divide-y divide-white/10 light:divide-black/10 border border-white/10 light:border-black/10">
          {items.map((item) => (
            <li key={item.conversationId}>
              <Link
                to={`/dashboard/coach/programs/${item.programSlug}/participants/${item.participantId}#messages`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 no-underline hover:bg-white/5 light:hover:bg-black/5"
              >
                <div className="min-w-0">
                  <div className="font-barlow font-semibold text-chalk light:text-chalk-light">
                    {item.participantName}
                    {item.unreadCount > 0 && (
                      <span className="ml-2 text-accent light:text-accent-light text-xs font-barlow-condensed tracking-widest uppercase">
                        {item.unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="font-barlow text-sm text-fog light:text-fog-light truncate">
                    {item.programName} · {item.lastMessagePreview || 'No messages yet'}
                  </div>
                </div>
                <span className="font-barlow text-xs text-fog light:text-fog-light whitespace-nowrap">
                  {new Date(item.lastMessageAt).toLocaleString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
