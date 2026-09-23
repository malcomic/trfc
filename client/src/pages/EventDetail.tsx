import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { MapPin, Clock, AlertCircle, Minus, Plus, Ticket } from 'lucide-react'
import { getEventById } from '../api/events'
import { Event, EventTicketType } from '../types'
import { pageRoot, cardSurface, inputField } from '../utils/themeClasses'
import { getSafeImageUrl } from '../utils/imageUrl'
import { formatEventDate, formatEventTime } from '../utils/eventDate'
import { trackViewContent } from '../utils/tiktokPixel'

const EVENT_IMAGE_FALLBACK =
  'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&q=80'

export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedType, setSelectedType] = useState<EventTicketType | null>(null)
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
      const types = (data.ticket_types || []).filter((t: EventTicketType) => t.is_active)
      const firstAvailable = types.find((t: EventTicketType) => !t.is_sold_out) || types[0] || null
      setSelectedType(firstAvailable)
      setQuantity(1)
      trackViewContent(
        {
          content_id: String(data.id),
          content_type: 'event',
          content_name: data.title,
        },
        Number(data.min_price ?? 0)
      )
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
              <button onClick={() => (error ? fetchEvent() : navigate('/events'))} className="bg-accent light:bg-accent-light text-black light:text-white px-4 py-2 clip-angled-sm mr-3">
                {error ? 'Retry' : 'Back to Events'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const ticketTypes = (event.ticket_types || []).filter((t) => t.is_active)
  const formattedDate = event.event_date ? formatEventDate(event.event_date) : 'Date TBA'
  const formattedTime = event.event_date ? formatEventTime(event.event_date) : ''
  const unitPrice = selectedType ? Number(selectedType.price) : 0
  const isFree = unitPrice === 0
  const maxQty =
    selectedType?.remaining != null
      ? Math.min(10, selectedType.remaining)
      : 10
  const canBuy =
    selectedType && !selectedType.is_sold_out && maxQty >= 1 && ticketTypes.length > 0

  const selectType = (type: EventTicketType) => {
    if (type.is_sold_out) return
    setSelectedType(type)
    setQuantity(1)
  }

  return (
    <div className={pageRoot}>
      <section className="bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-14 pb-8">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => navigate('/events')} className="text-accent light:text-accent-light text-sm mb-4 bg-transparent border-0 cursor-pointer font-barlow-condensed font-bold hover:underline">
            ← Back to Events
          </button>
          <h1 className="font-bebas text-5xl leading-tight">{event.title}</h1>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-[6%] py-10 pb-20">
        <div className="bg-smoke light:bg-smoke-light mb-8">
          <img
            src={getSafeImageUrl(event.image_url, EVENT_IMAGE_FALLBACK)}
            alt={event.title}
            className="w-full max-h-[480px] object-contain mx-auto"
          />
        </div>

        <p className="text-fog light:text-fog-light mb-8 leading-relaxed whitespace-pre-line">{event.description}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className={`${cardSurface} p-5 flex items-start gap-3`}>
            <MapPin size={18} className="text-accent light:text-accent-light flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-fog light:text-fog-light uppercase tracking-widest mb-1">Location</p>
              <p className="font-semibold">{event.location}</p>
            </div>
          </div>
          <div className={`${cardSurface} p-5 flex items-start gap-3`}>
            <Clock size={18} className="text-accent light:text-accent-light flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-fog light:text-fog-light uppercase tracking-widest mb-1">Date & Time</p>
              <p className="font-semibold">{formattedDate}</p>
              {formattedTime && <p className="text-fog light:text-fog-light text-sm">{formattedTime}</p>}
            </div>
          </div>
        </div>

        <div className={`${cardSurface} p-6`}>
          <label className="block font-barlow-condensed font-bold text-sm tracking-widest uppercase text-accent light:text-accent-light mb-4">
            Ticket type
          </label>

          {ticketTypes.length === 0 ? (
            <p className="text-fog light:text-fog-light mb-4">
              Tickets are not available for this event yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2 mb-6">
              {ticketTypes.map((type) => {
                const soldOut = type.is_sold_out
                const selected = selectedType?.id === type.id
                return (
                  <button
                    key={type.id}
                    type="button"
                    disabled={soldOut}
                    onClick={() => selectType(type)}
                    className={`text-left px-4 py-3 border transition ${
                      soldOut
                        ? 'opacity-50 cursor-not-allowed border-white/10 light:border-black/10'
                        : selected
                          ? 'border-accent light:border-accent-light bg-accent/10 light:bg-accent-light/10'
                          : `${inputField} hover:border-accent light:hover:border-accent-light`
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{type.name}</p>
                        {type.remaining != null && !soldOut && (
                          <p className="text-xs text-fog light:text-fog-light mt-0.5">
                            {type.remaining} left
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {soldOut ? (
                          <span className="text-sm font-barlow-condensed font-bold uppercase tracking-widest text-red-400">
                            Sold out
                          </span>
                        ) : (
                          <span className="font-bebas text-xl text-accent light:text-accent-light">
                            {Number(type.price) === 0
                              ? 'FREE'
                              : `KES ${Number(type.price).toLocaleString()}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {canBuy && (
            <>
              <label className="block font-barlow-condensed font-bold text-sm tracking-widest uppercase text-accent light:text-accent-light mb-4">
                Number of Tickets
              </label>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className={`w-10 h-10 flex items-center justify-center hover:bg-accent light:hover:bg-accent-light hover:text-white transition ${inputField}`}
                >
                  <Minus size={16} />
                </button>
                <span className="font-bebas text-3xl w-12 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
                  className={`w-10 h-10 flex items-center justify-center hover:bg-accent light:hover:bg-accent-light hover:text-white transition ${inputField}`}
                >
                  <Plus size={16} />
                </button>
                <span className="text-fog light:text-fog-light ml-4">
                  Total:{' '}
                  <strong className="text-accent light:text-accent-light font-bebas text-2xl">
                    {isFree ? 'FREE' : `KES ${(unitPrice * quantity).toLocaleString()}`}
                  </strong>
                </span>
              </div>

              <button
                onClick={() =>
                  navigate(`/events/${id}/checkout`, {
                    state: { quantity, ticketTypeId: selectedType!.id },
                  })
                }
                className="w-full bg-accent light:bg-accent-light text-black light:text-white py-4 font-barlow-condensed font-black text-sm tracking-widest uppercase clip-angled hover:bg-accent/90 light:hover:bg-accent-light/90 flex items-center justify-center gap-2"
              >
                <Ticket size={18} />
                Buy {quantity} {selectedType!.name} Ticket{quantity > 1 ? 's' : ''}
              </button>
            </>
          )}

          {ticketTypes.length > 0 && !canBuy && (
            <p className="text-fog light:text-fog-light">
              All ticket types are sold out for this event.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
