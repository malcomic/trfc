import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AlertCircle, Calendar, MapPin, Users, Ticket } from 'lucide-react'
import { getEventById } from '../api/events'
import { useCart } from '../store/cartStore'
import { Event } from '../types'
import { Button, Card } from '../components/ui'

export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const { addItem } = useCart()

  useEffect(() => {
    if (id) fetchEvent()
  }, [id])

  const fetchEvent = async () => {
    try {
      setLoading(true)
      const data = await getEventById(id!)
      setEvent(data)
    } catch (err) {
      setError('Failed to load event')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = () => {
    if (!event) return
    const eventAsProduct = {
      id: event.id,
      name: event.title,
      description: event.description,
      price: event.price,
      stock: event.capacity || 0,
      category: 'event',
      image_url: event.image_url
    }
    addItem(eventAsProduct, quantity)
    alert(`Added ${quantity} ticket(s) to cart!`)
    navigate('/cart')
  }

  if (loading)
    return (
      <div className="min-h-screen bg-night text-chalk font-barlow flex items-center justify-center px-[6%]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-fire/20 border-t-fire rounded-full animate-spin mx-auto mb-4" />
          <p className="text-fog">Loading event details...</p>
        </div>
      </div>
    )

  if (!event || error)
    return (
      <div className="min-h-screen bg-night text-chalk font-barlow flex items-center justify-center px-[6%] py-12">
        <Card className="max-w-md w-full">
          <Card.Body className="text-center">
            <AlertCircle size={40} className="text-danger-red mx-auto mb-4" />
            <h2 className="font-bebas text-2xl text-chalk mb-2 letter-spacing-tighter">
              {error ? 'LOAD ERROR' : 'NOT FOUND'}
            </h2>
            <p className="text-fog mb-6">{error || 'This event could not be found.'}</p>
            <Button onClick={() => navigate('/events')} variant="primary" fullWidth>
              Back to Events
            </Button>
          </Card.Body>
        </Card>
      </div>
    )

  const eventDate = event.event_date ? new Date(event.event_date) : null
  const formattedDate = eventDate
    ? eventDate.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Date TBA'

  const formattedTime = eventDate
    ? eventDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : ''

  const capacityUsed = Math.max(0, (event.capacity || 0) - (event.capacity ? Math.floor((event.capacity || 0) * 0.3) : 0))
  const capacityPercent = event.capacity ? Math.round((capacityUsed / event.capacity) * 100) : 0

  return (
    <div className="min-h-screen bg-night text-chalk font-barlow">
      {/* ── Hero Image ── */}
      <section className="relative overflow-hidden bg-ash border-b border-white/5 px-[6%] pt-0 pb-0">
        <div className="max-w-5xl mx-auto">
          <img
            src={event.image_url || 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=1200&q=80'}
            alt={event.title}
            className="w-full h-96 object-cover brightness-75"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=1200&q=80'
            }}
          />
        </div>
      </section>

      {/* ── Main Content ── */}
      <div className="max-w-5xl mx-auto px-[6%] py-12">
        {/* Header */}
        <div className="mb-10">
          <p className="inline-flex items-center gap-2 font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire mb-3 before:block before:w-5 before:h-0.5 before:bg-fire">
            Event Details
          </p>
          <h1 className="font-bebas text-clamp-lg text-chalk mb-3 letter-spacing-tighter">
            {event.title}
          </h1>
          <p className="text-lg text-fog max-w-3xl leading-relaxed">
            {event.description}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Event Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <Card.Body className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-fire/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar size={20} className="text-fire" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog mb-1">Date & Time</p>
                    <p className="font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase text-chalk">
                      {formattedDate}
                    </p>
                    {formattedTime && (
                      <p className="text-sm text-fog mt-1">{formattedTime}</p>
                    )}
                  </div>
                </Card.Body>
              </Card>

              <Card>
                <Card.Body className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-fire/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin size={20} className="text-fire" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog mb-1">Location</p>
                    <p className="font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase text-chalk">
                      {event.location || 'TBA'}
                    </p>
                  </div>
                </Card.Body>
              </Card>

              <Card>
                <Card.Body className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-fire/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Ticket size={20} className="text-fire" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog mb-1">Price</p>
                    <p className="font-bebas text-2xl text-fire letter-spacing-tighter">
                      KES {event.price}
                    </p>
                  </div>
                </Card.Body>
              </Card>

              <Card>
                <Card.Body className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-fire/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users size={20} className="text-fire" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog mb-1">Capacity</p>
                    <p className="font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase text-chalk">
                      {event.capacity} Slots
                    </p>
                    <div className="w-full h-2 bg-smoke rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-fire to-ember transition-all duration-500"
                        style={{ width: `${capacityPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-fog mt-1">{capacityPercent}% booked</p>
                  </div>
                </Card.Body>
              </Card>
            </div>
          </div>

          {/* Booking Panel */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <Card.Body>
                <h3 className="font-bebas text-2xl text-chalk mb-6 letter-spacing-tighter">
                  GET <span className="text-fire">TICKETS</span>
                </h3>

                {/* Quantity Selector */}
                <div className="mb-6">
                  <label className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog mb-3 block">
                    Number of Tickets
                  </label>
                  <div className="flex items-center gap-3 bg-smoke border border-white/10 p-2 rounded-sm">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="flex-shrink-0 w-10 h-10 flex items-center justify-center hover:bg-white/10 transition-colors rounded-sm font-bold text-fire"
                    >
                      −
                    </button>
                    <span className="flex-1 text-center font-bebas text-2xl text-chalk">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="flex-shrink-0 w-10 h-10 flex items-center justify-center hover:bg-white/10 transition-colors rounded-sm font-bold text-fire"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="space-y-2 mb-6 pb-6 border-b border-white/10 text-sm">
                  <div className="flex justify-between text-fog">
                    <span>Price per ticket</span>
                    <span>KES {event.price}</span>
                  </div>
                  <div className="flex justify-between text-fog">
                    <span>Quantity</span>
                    <span>×{quantity}</span>
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-baseline mb-8">
                  <span className="font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase text-fog">Total</span>
                  <span className="font-bebas text-3xl text-fire letter-spacing-tighter">
                    {(event.price * quantity).toFixed(0)}
                  </span>
                </div>

                {/* Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={handleAddToCart}
                    variant="primary"
                    size="lg"
                    fullWidth
                  >
                    Add to Cart
                  </Button>
                  <Button
                    onClick={handleAddToCart}
                    variant="secondary"
                    size="lg"
                    fullWidth
                  >
                    Book Now
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
