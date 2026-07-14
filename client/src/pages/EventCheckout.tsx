import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import PaystackPop from '@paystack/inline-js'
import { getEventById, buyEventTickets } from '../api/events'
import { initializePaystackPayment, verifyPaystackPayment } from '../api/payments'
import { AlertCircle, Loader, ArrowLeft } from 'lucide-react'
import { pageRoot, cardSurface, inputField } from '../utils/themeClasses'

interface Event {
  id: string
  title: string
  description: string
  event_date: string
  price: number
  location: string
  capacity: number
}

type CheckoutForm = {
  quantity: number
  email: string
  phone?: string
}

export default function EventCheckout() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const initialQty = (location.state as { quantity?: number })?.quantity || 1

  const { register, handleSubmit, formState: { errors }, watch } = useForm<CheckoutForm>({
    defaultValues: { quantity: initialQty, email: '', phone: '' },
  })

  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [confirming, setConfirming] = useState(false)
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
        setError(err.response?.data?.error || 'Failed to load event')
      } finally {
        setLoading(false)
      }
    }
    fetchEvent()
  }, [eventId])

  const onSubmit = async (data: CheckoutForm) => {
    try {
      setSubmitting(true)
      setError('')

      const phone = data.phone?.trim() || undefined
      const email = data.email.trim().toLowerCase()

      const ticketResult = await buyEventTickets(eventId!, {
        quantity: Number(data.quantity),
        email,
        phone,
      })

      const payment = await initializePaystackPayment({
        email,
        amount: Math.round(ticketResult.totalPrice),
        ticketBatchId: ticketResult.purchaseBatchId,
      })

      const popup = new PaystackPop()
      popup.resumeTransaction(payment.accessCode, {
        onSuccess: async (transaction: { reference?: string }) => {
          const reference = transaction.reference || payment.reference
          try {
            setConfirming(true)
            await verifyPaystackPayment(reference)
            navigate(`/ticket-confirmation/${reference}?email=${encodeURIComponent(email)}`, {
              state: {
                eventTitle: ticketResult.eventTitle,
                quantity: ticketResult.quantity,
                totalPrice: ticketResult.totalPrice,
                email,
                phone,
              },
            })
          } catch (err: any) {
            setError(
              err.response?.data?.error ||
                'Payment received but confirmation failed. Check your email or refresh the confirmation page.'
            )
            navigate(`/ticket-confirmation/${reference}?email=${encodeURIComponent(email)}`, {
              state: {
                eventTitle: ticketResult.eventTitle,
                quantity: ticketResult.quantity,
                totalPrice: ticketResult.totalPrice,
                email,
                phone,
              },
            })
          } finally {
            setConfirming(false)
            setSubmitting(false)
          }
        },
        onCancel: () => {
          setError('Payment was cancelled. You can try again when ready.')
          setSubmitting(false)
        },
      })
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.customerMessage ||
          'Payment initiation failed.'
      )
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className={`${pageRoot} flex items-center justify-center`}>
        <Loader className="w-12 h-12 animate-spin text-accent light:text-accent-light" />
      </div>
    )
  }

  if (error && !event) {
    return (
      <div className={`${pageRoot} py-16 px-6`}>
        <div className="max-w-2xl mx-auto bg-red-500/10 border border-red-500/20 p-6 flex gap-4">
          <AlertCircle className="w-6 h-6 text-red-400" />
          <div>
            <p className="text-red-300 mb-4">{error}</p>
            <button onClick={() => navigate('/events')} className="bg-accent light:bg-accent-light text-black light:text-white px-4 py-2 clip-angled-sm">Back to Events</button>
          </div>
        </div>
      </div>
    )
  }

  if (!event) return null

  return (
    <div className={pageRoot}>
      <section className="bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-14 pb-8">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => navigate(`/events/${eventId}`)} className="inline-flex items-center gap-2 text-accent light:text-accent-light text-sm mb-4 bg-transparent border-0 cursor-pointer hover:underline">
            <ArrowLeft size={14} /> Back to Event
          </button>
          <h1 className="font-bebas text-4xl text-chalk light:text-chalk-light">BUY <span className="text-accent light:text-accent-light">TICKETS</span></h1>
          <p className="text-fog light:text-fog-light mt-1">{event.title}</p>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-[6%] py-10 pb-20 grid grid-cols-1 md:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit(onSubmit)} className={`md:col-span-2 ${cardSurface} p-6 space-y-4`}>
          <div>
            <label className="block text-sm font-semibold mb-2">Number of Tickets</label>
            <select
              {...register('quantity', { required: true, min: 1, max: 10, valueAsNumber: true })}
              className={`w-full px-4 py-2 ${inputField}`}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>{n} {n === 1 ? 'Ticket' : 'Tickets'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Email</label>
            <input
              type="email"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Enter a valid email address',
                },
              })}
              placeholder="you@example.com"
              className={`w-full px-4 py-2 ${inputField}`}
            />
            {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Phone (optional)</label>
            <input
              {...register('phone', {
                validate: (value) =>
                  !value ||
                  /^254\d{9}$/.test(value) ||
                  'Format: 254XXXXXXXXX',
              })}
              placeholder="254712345678"
              className={`w-full px-4 py-2 ${inputField}`}
            />
            {errors.phone && <p className="text-red-400 text-sm mt-1">{errors.phone.message as string}</p>}
          </div>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-300 flex gap-2">
              <AlertCircle size={16} className="flex-shrink-0" /> {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting || confirming}
            className="w-full bg-accent light:bg-accent-light text-black light:text-white py-3 clip-angled font-barlow-condensed font-black text-sm tracking-widest uppercase hover:bg-accent/90 light:hover:bg-accent-light/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {confirming ? (
              <><Loader className="w-4 h-4 animate-spin" /> Confirming payment…</>
            ) : submitting ? (
              <><Loader className="w-4 h-4 animate-spin" /> Opening Paystack…</>
            ) : (
              'Complete Purchase'
            )}
          </button>
        </form>

        <div className={`${cardSurface} p-6 sticky top-20 h-fit`}>
          <h3 className="font-barlow-condensed font-bold text-accent light:text-accent-light tracking-widest uppercase mb-4">Summary</h3>
          <p className="text-sm text-fog light:text-fog-light mb-2">{quantity} ticket(s)</p>
          <p className="font-bebas text-3xl text-accent light:text-accent-light">KES {totalPrice.toLocaleString()}</p>
          <p className="text-xs text-fog light:text-fog-light mt-4">
            You will complete payment securely with Paystack (card or mobile money).
          </p>
        </div>
      </div>
    </div>
  )
}
