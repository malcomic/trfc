import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, Loader } from 'lucide-react'
import { getPrivateTicketType } from '../api/events'
import { pageRoot } from '../utils/themeClasses'

/** Lands on a private ticket share link and sends the buyer to checkout for that type. */
export default function PrivateTicketLink() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const trimmed = String(token || '').trim()
      if (!trimmed) {
        setError('This private ticket link is invalid')
        return
      }
      try {
        const event = await getPrivateTicketType(trimmed)
        if (cancelled) return
        const type = event.ticket_types?.[0]
        if (!type) {
          setError('This private ticket link is invalid')
          return
        }
        navigate(`/events/${event.id}/checkout?privateToken=${encodeURIComponent(trimmed)}`, {
          replace: true,
          state: {
            ticketTypeId: type.id,
            privateToken: trimmed,
            quantity: 1,
          },
        })
      } catch (err: any) {
        if (cancelled) return
        setError(err.response?.data?.error || 'This private ticket link is invalid or no longer available')
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [token, navigate])

  if (error) {
    return (
      <div className={`${pageRoot} min-h-[50vh] flex items-center justify-center px-4`}>
        <div className="max-w-md text-center space-y-4">
          <AlertCircle className="mx-auto text-red-500" size={40} />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Link unavailable</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
          <Link to="/events" className="inline-block text-primary dark:text-primary-dark font-semibold">
            Browse events
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={`${pageRoot} min-h-[50vh] flex items-center justify-center px-4`}>
      <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
        <Loader className="animate-spin" size={22} />
        <span>Opening private ticket…</span>
      </div>
    </div>
  )
}
