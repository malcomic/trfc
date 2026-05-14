import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getEvents } from '../api/events'
import EventCard from '../components/EventCard'
import { Event } from '../types'

export default function Events() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const data = await getEvents()
      setEvents(data)
    } catch (err) {
      setError('Failed to load events')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Upcoming Events</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-600">Loading events...</p>
        ) : events.length === 0 ? (
          <p className="text-gray-600">No events available</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Link
                to={`/events/${event.id}`}
                key={event.id}
                className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition transform hover:scale-105"
              >
                <EventCard event={event} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
