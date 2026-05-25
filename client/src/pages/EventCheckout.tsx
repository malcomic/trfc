import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { getEventById } from '../api/events'
import { initiateTicketPayment } from '../api/payments'
import { AlertCircle, Loader } from 'lucide-react'

interface Event {
  id: string
  title: string
  description: string
  event_date: string
  price: number
  location: string
  capacity: number
}

export default function EventCheckout() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    defaultValues: {
      quantity: 1,
      phone: '',
    },
  })

  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const quantity = watch('quantity')
  const totalPrice = event ? Number(event.price) * Number(quantity) : 0

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true)
        if (!eventId) {
          setError('Event ID not found')
          return
        }
        const data = await getEventById(eventId)
        setEvent(data)
      } catch (err: any) {
        console.error('Error fetching event:', err)
        setError(err.response?.data?.error || 'Failed to load event')
      } finally {
        setLoading(false)
      }
    }
    fetchEvent()
  }, [eventId])

  const onSubmit = async (data: any) => {
    try {
      setSubmitting(true)
      setError('')

      const paymentData = {
        phone: data.phone,
        amount: Math.round(totalPrice),
        ticketId: eventId!,
      }

      const response = await initiateTicketPayment(paymentData)

      if (response.checkoutRequestId) {
        alert('M-Pesa prompt sent to your phone. Enter your PIN to complete payment.')
        navigate(`/ticket-confirmation/${response.checkoutRequestId}`, {
          state: {
            eventId,
            quantity,
            totalPrice,
            phone: data.phone,
          },
        })
      } else {
        setError('Failed to initiate payment. Please try again.')
      }
    } catch (err: any) {
      console.error('Payment failed:', err)
      setError(
        err.response?.data?.error ||
          err.response?.data?.customerMessage ||
          'Payment initiation failed. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen py-12 px-4 flex items-center justify-center bg-white dark:bg-[#1C1C1C]">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading event...</p>
        </div>
      </div>
    )
  }

  if (error && !event) {
    return (
      <div className="min-h-screen py-12 px-4 bg-white dark:bg-[#1C1C1C]">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 flex gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">Error</h3>
              <p className="text-red-700 dark:text-red-400 mb-4">{error}</p>
              <button
                onClick={() => navigate('/events')}
                className="bg-red-600 dark:bg-red-700 text-white px-4 py-2 rounded hover:bg-red-700 dark:hover:bg-red-800"
              >
                Back to Events
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen py-12 px-4 bg-white dark:bg-[#1C1C1C]">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-gray-600 dark:text-gray-400">Event not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-4 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate(`/events/${eventId}`)}
            className="text-primary hover:underline text-sm mb-4"
          >
            ← Back to Event
          </button>
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">Buy Tickets</h1>
          <p className="text-gray-600 dark:text-gray-400">{event.title}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Event Summary */}
          <div className="md:col-span-2">
            <div className="bg-white dark:bg-[#1C1C1C] rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Event Details</h2>
              <div className="space-y-3 text-sm mb-6">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Date & Time</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {new Date(event.event_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Location</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{event.location}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Price per Ticket</p>
                  <p className="font-semibold text-lg text-primary">
                    KES {Number(event.price).toFixed(2)}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{event.description}</p>
            </div>

            {/* Ticket Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-[#1C1C1C] rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Your Information</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-white">
                    Number of Tickets
                  </label>
                  <select
                    {...register('quantity', {
                      required: 'Quantity is required',
                      min: { value: 1, message: 'At least 1 ticket required' },
                      max: { value: 10, message: 'Maximum 10 tickets per order' },
                    })}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded px-4 py-2 bg-white dark:bg-[#2A2A2A] text-gray-900 dark:text-white focus:outline-none focus:border-primary"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? 'Ticket' : 'Tickets'}
                      </option>
                    ))}
                  </select>
                  {errors.quantity && (
                    <p className="text-red-600 text-sm mt-1">{errors.quantity.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-white">
                    Phone Number (254XXXXXXXXX)
                  </label>
                  <input
                    {...register('phone', {
                      required: 'Phone number is required',
                      pattern: {
                        value: /^254\d{9}$/,
                        message: 'Phone must be in format 254XXXXXXXXX',
                      },
                    })}
                    type="text"
                    placeholder="254712345678"
                    className="w-full border border-gray-300 dark:border-gray-700 rounded px-4 py-2 bg-white dark:bg-[#2A2A2A] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-primary"
                  />
                  {errors.phone && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.phone.message}</p>
                  )}
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary text-white py-3 rounded-lg hover:bg-opacity-90 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Complete Purchase'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Order Summary Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white dark:bg-[#1C1C1C] rounded-lg shadow p-6 sticky top-4">
              <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Order Summary</h3>
              <div className="space-y-2 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{quantity} ticket(s)</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    KES {(Number(event.price) * Number(quantity)).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">Convenience Fee</span>
                  <span className="text-gray-700 dark:text-gray-300">Free</span>
                </div>
              </div>
              <div className="flex justify-between text-lg font-bold mb-6">
                <span className="text-gray-900 dark:text-white">Total</span>
                <span className="text-primary">KES {totalPrice.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded">
                ℹ️ After clicking "Complete Purchase", an M-Pesa prompt will appear on your
                phone. Enter your M-Pesa PIN to complete the payment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
