import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getEvents } from '../api/events'

export default function Home() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      const data = await getEvents()
      setEvents(data.slice(0, 3))
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-orange-600 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-4">TRFC</h1>
          <p className="text-xl mb-8">Thika Road Fitness Community - Your Journey to Wellness</p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Link to="/register" className="bg-white text-primary px-8 py-3 rounded-full font-semibold hover:scale-105 transition">Join Now</Link>
            <Link to="/events" className="border-2 border-white px-8 py-3 rounded-full font-semibold hover:bg-white hover:text-primary transition">Upcoming Events</Link>
            <Link to="/shop" className="bg-dark px-8 py-3 rounded-full font-semibold hover:scale-105 transition">Shop Merch</Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 px-4 bg-light">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { label: 'Members', value: '500+' },
            { label: 'Events Run', value: '50+' },
            { label: 'Programs', value: '10+' },
            { label: 'Years Active', value: '5+' },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-6 bg-white rounded-2xl shadow-md">
              <p className="text-4xl font-bold text-primary mb-2">{stat.value}</p>
              <p className="text-gray-600">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Events */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-8 text-center">Upcoming Events</h2>
          {loading ? (
            <p className="text-center">Loading events...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {events.map((event: any) => (
                <Link to={`/events/${event.id}`} key={event.id} className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition">
                  <img src={event.image_url || 'https://via.placeholder.com/300'} alt={event.title} className="w-full h-48 object-cover" />
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-2">{event.title}</h3>
                    <p className="text-gray-600 text-sm mb-2">{event.location}</p>
                    <p className="text-primary font-semibold">${event.price}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
