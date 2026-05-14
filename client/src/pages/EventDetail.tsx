import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { getEventById } from '../api/events'
import { useCart } from '../store/cartStore'
import { Event } from '../types'

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
    return <div className="min-h-screen py-12 text-center text-gray-600">Loading...</div>
  if (!event || error)
    return (
      <div className="min-h-screen py-12 text-center">
        {error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <div className="text-gray-600">Event not found</div>
        )}
      </div>
    )

  const eventDate = event.event_date ? new Date(event.event_date) : null
  const formattedDate = eventDate
    ? eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
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

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <img
          src={event.image_url || 'https://via.placeholder.com/600'}
          alt={event.title}
          className="w-full h-96 object-cover rounded-2xl mb-8"
        />

        <h1 className="text-4xl font-bold mb-4">{event.title}</h1>
        <p className="text-gray-600 mb-8">{event.description}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-light rounded-lg p-6">
            <p className="text-gray-600 text-sm mb-2">Location</p>
            <p className="font-semibold text-lg">{event.location}</p>
          </div>
          <div className="bg-light rounded-lg p-6">
            <p className="text-gray-600 text-sm mb-2">Date & Time</p>
            <p className="font-semibold text-lg">{formattedDate}</p>
            {formattedTime && <p className="text-gray-600">{formattedTime}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-light rounded-lg p-6">
            <p className="text-gray-600 text-sm mb-2">Price per Ticket</p>
            <p className="font-bold text-3xl text-primary">KES {event.price}</p>
          </div>
          <div className="bg-light rounded-lg p-6">
            <p className="text-gray-600 text-sm mb-2">Capacity</p>
            <p className="font-semibold text-lg">{event.capacity} tickets available</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2">Number of Tickets</label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-semibold"
              >
                -
              </button>
              <span className="text-2xl font-bold w-12 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-semibold"
              >
                +
              </button>
            </div>
          </div>

          <div className="mb-6 text-lg">
            <span className="text-gray-600">Total: </span>
            <span className="font-bold text-2xl text-primary">
              KES {(event.price * quantity).toFixed(2)}
            </span>
          </div>

          <button
            onClick={handleAddToCart}
            className="w-full bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition flex items-center justify-center gap-2 mb-4"
          >
            <ShoppingCart size={20} />
            Add {quantity} Ticket{quantity > 1 ? 's' : ''} to Cart
          </button>

          <button className="w-full bg-gray-800 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-700 transition">
            Pay with M-Pesa
          </button>
        </div>
      </div>
    </div>
  )
}
