import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { getEventById, buyEventTickets } from '../api/events'
import { initiateTicketPayment } from '../api/payments'
import PaymentStatusModal from '../components/PaymentStatusModal'
import { AlertCircle, Loader, ArrowLeft } from 'lucide-react'

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
  const location = useLocation()
  const initialQty = (location.state as { quantity?: number })?.quantity || 1

  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    defaultValues: { quantity: initialQty, phone: '' },
  })

  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [checkoutRequestId, setCheckoutRequestId] = useState('')
  const [phone, setPhone] = useState('')
  const [ticketMeta, setTicketMeta] = useState<{ eventTitle: string; quantity: number; totalPrice: number } | null>(null)

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

  const onSubmit = async (data: { quantity: number; phone: string }) => {
    try {
      setSubmitting(true)
      setError('')
      setPhone(data.phone)

      const ticketResult = await buyEventTickets(eventId!, {
        quantity: Number(data.quantity),
        phone: data.phone,
      })

      const paymentResponse = await initiateTicketPayment({
        phone: data.phone,
        amount: Math.round(ticketResult.totalPrice),
        ticketId: ticketResult.ticketIds[0],
      })

      if (paymentResponse.checkoutRequestId) {
        setCheckoutRequestId(paymentResponse.checkoutRequestId)
        setTicketMeta({
          eventTitle: ticketResult.eventTitle,
          quantity: ticketResult.quantity,
          totalPrice: ticketResult.totalPrice,
        })
        setShowPaymentModal(true)
      } else {
        setError('Failed to initiate payment. Please try again.')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.customerMessage || 'Payment initiation failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleModalClose = () => {
    setShowPaymentModal(false)
    navigate(`/ticket-confirmation/${checkoutRequestId}`, {
      state: { ...ticketMeta, phone, eventTitle: ticketMeta?.eventTitle || event?.title },
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-night text-chalk flex items-center justify-center">
        <Loader className="w-12 h-12 animate-spin text-fire" />
      </div>
    )
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-night text-chalk py-16 px-6">
        <div className="max-w-2xl mx-auto bg-red-500/10 border border-red-500/20 p-6 flex gap-4">
          <AlertCircle className="w-6 h-6 text-red-400" />
          <div>
            <p className="text-red-300 mb-4">{error}</p>
            <button onClick={() => navigate('/events')} className="bg-fire text-white px-4 py-2 clip-angled-sm">Back to Events</button>
          </div>
        </div>
      </div>
    )
  }

  if (!event) return null

  return (
    <div className="min-h-screen bg-night text-chalk font-barlow">
      <section className="bg-ink border-b border-white/5 px-[6%] pt-14 pb-8">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => navigate(`/events/${eventId}`)} className="inline-flex items-center gap-2 text-fire text-sm mb-4 bg-transparent border-0 cursor-pointer hover:underline">
            <ArrowLeft size={14} /> Back to Event
          </button>
          <h1 className="font-bebas text-4xl">BUY <span className="text-fire">TICKETS</span></h1>
          <p className="text-fog mt-1">{event.title}</p>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-[6%] py-10 pb-20 grid grid-cols-1 md:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit(onSubmit)} className="md:col-span-2 bg-ash border border-white/5 p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Number of Tickets</label>
            <select
              {...register('quantity', { required: true, min: 1, max: 10, valueAsNumber: true })}
              className="w-full bg-smoke border border-white/10 px-4 py-2 text-chalk focus:outline-none focus:border-fire"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>{n} {n === 1 ? 'Ticket' : 'Tickets'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Phone (254XXXXXXXXX)</label>
            <input
              {...register('phone', {
                required: 'Phone is required',
                pattern: { value: /^254\d{9}$/, message: 'Format: 254XXXXXXXXX' },
              })}
              placeholder="254712345678"
              className="w-full bg-smoke border border-white/10 px-4 py-2 text-chalk focus:outline-none focus:border-fire"
            />
            {errors.phone && <p className="text-red-400 text-sm mt-1">{errors.phone.message}</p>}
          </div>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-300 flex gap-2">
              <AlertCircle size={16} className="flex-shrink-0" /> {error}
            </div>
          )}
          <button type="submit" disabled={submitting} className="w-full bg-fire text-white py-3 clip-angled font-barlow-condensed font-black text-sm letter-spacing-widest text-transform-uppercase hover:bg-ember disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting ? <><Loader className="w-4 h-4 animate-spin" /> Processing…</> : 'Complete Purchase'}
          </button>
        </form>

        <div className="bg-ash border border-white/5 p-6 sticky top-20 h-fit">
          <h3 className="font-barlow-condensed font-bold text-fire letter-spacing-widest text-transform-uppercase mb-4">Summary</h3>
          <p className="text-sm text-fog mb-2">{quantity} ticket(s)</p>
          <p className="font-bebas text-3xl text-fire">KES {totalPrice.toLocaleString()}</p>
          <p className="text-xs text-fog mt-4">M-Pesa prompt will appear on your phone after checkout.</p>
        </div>
      </div>

      <PaymentStatusModal
        isOpen={showPaymentModal}
        checkoutRequestId={checkoutRequestId}
        phone={phone}
        onClose={handleModalClose}
      />
    </div>
  )
}
