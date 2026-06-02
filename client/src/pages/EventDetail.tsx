import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { MapPin, Clock, Users, AlertCircle, Minus, Plus, Ticket } from 'lucide-react'
import { getEventById } from '../api/events'
import { Event } from '../types'
import { pageRoot, cardSurface, inputField } from '../utils/themeClasses'

export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (id) fetchEvent()
  }, [id])

  const fetchEvent = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await getEventById(id!)
      setEvent(data)
    } catch (err) {
      setError('Failed to load event')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={pageRoot}>
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="h-96 bg-smoke light:bg-smoke-light animate-pulse mb-8" />
          <div className="h-8 bg-smoke light:bg-smoke-light animate-pulse w-2/3 mb-4" />
          <div className="h-4 bg-smoke light:bg-smoke-light animate-pulse w-full mb-2" />
          <div className="h-4 bg-smoke light:bg-smoke-light animate-pulse w-4/5" />
        </div>
      </div>
    )
  }

  if (!event || error) {
    return (
      <div className={`${pageRoot} py-16 px-6`}>
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/20 border-l-4 border-l-red-500 p-6 flex gap-4">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-red-300 mb-4">{error || 'Event not found'}</p>
              <button onClick={() => (error ? fetchEvent() : navigate('/events'))} className="bg-fire text-white px-4 py-2 clip-angled-sm mr-3">
                {error ? 'Retry' : 'Back to Events'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const ev = event as any
  const eventDate = ev.event_date ? new Date(ev.event_date) : null
  const formattedDate = eventDate
    ? eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'Date TBA'
  const formattedTime = eventDate
    ? eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    : ''
  const isFree = !ev.price || Number(ev.price) === 0

  return (
    <div className={pageRoot}>
      <section className="bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-14 pb-8">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => navigate('/events')} className="text-fire text-sm mb-4 bg-transparent border-0 cursor-pointer font-barlow-condensed font-bold hover:underline">
            ← Back to Events
          </button>
          <h1 className="font-bebas text-5xl leading-tight">{ev.title}</h1>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-[6%] py-10 pb-20">
        <img
          src={ev.image_url || 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&q=80'}
          alt={ev.title}
          className="w-full h-80 object-cover brightness-85 clip-angled mb-8"
        />

        <p className="text-fog light:text-fog-light mb-8 leading-relaxed">{ev.description}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className={`${cardSurface} p-5 flex items-start gap-3`}>
            <MapPin size={18} className="text-fire flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-fog light:text-fog-light uppercase letter-spacing-widest mb-1">Location</p>
              <p className="font-semibold">{ev.location}</p>
            </div>
          </div>
          <div className={`${cardSurface} p-5 flex items-start gap-3`}>
            <Clock size={18} className="text-fire flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-fog light:text-fog-light uppercase letter-spacing-widest mb-1">Date & Time</p>
              <p className="font-semibold">{formattedDate}</p>
              {formattedTime && <p className="text-fog light:text-fog-light text-sm">{formattedTime}</p>}
            </div>
          </div>
          <div className={`${cardSurface} p-5 flex items-start gap-3`}>
            <Ticket size={18} className="text-fire flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-fog light:text-fog-light uppercase letter-spacing-widest mb-1">Price</p>
              <p className="font-bebas text-3xl text-fire">{isFree ? 'FREE' : `KES ${Number(ev.price).toLocaleString()}`}</p>
            </div>
          </div>
          {ev.capacity && (
            <div className={`${cardSurface} p-5 flex items-start gap-3`}>
              <Users size={18} className="text-fire flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-fog light:text-fog-light uppercase letter-spacing-widest mb-1">Capacity</p>
                <p className="font-semibold">{ev.capacity} spots</p>
              </div>
            </div>
          )}
        </div>

        <div className={`${cardSurface} p-6`}>
          <label className="block font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase text-fire mb-4">Number of Tickets</label>
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className={`w-10 h-10 flex items-center justify-center hover:bg-fire hover:text-white transition ${inputField}`}>
              <Minus size={16} />
            </button>
            <span className="font-bebas text-3xl w-12 text-center">{quantity}</span>
            <button onClick={() => setQuantity(Math.min(10, quantity + 1))} className={`w-10 h-10 flex items-center justify-center hover:bg-fire hover:text-white transition ${inputField}`}>
              <Plus size={16} />
            </button>
            <span className="text-fog light:text-fog-light ml-4">
              Total: <strong className="text-fire font-bebas text-2xl">{isFree ? 'FREE' : `KES ${(Number(ev.price) * quantity).toLocaleString()}`}</strong>
            </span>
          </div>

          <button
            onClick={() => navigate(`/events/${id}/checkout`, { state: { quantity } })}
            className="w-full bg-fire text-white py-4 font-barlow-condensed font-black text-sm letter-spacing-widest text-transform-uppercase clip-angled hover:bg-ember flex items-center justify-center gap-2"
          >
            <Ticket size={18} />
            Buy {quantity} Ticket{quantity > 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
