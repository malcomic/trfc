import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { getEventById, buyEventTickets } from '../api/events'
import { initiateTicketPayment } from '../api/payments'
import PaymentStatusModal from '../components/PaymentStatusModal'
import { AlertCircle, Loader, ArrowLeft } from 'lucide-react'
import { pageRoot, cardSurface, inputField } from '../utils/themeClasses'
import { useAuth } from '../context/AuthContext'
import { trackInitiateCheckout } from '../utils/tiktokPixel'
import type { Event, EventTicketType } from '../types'

type CheckoutForm = {
  quantity: number
  attendeeName: string
  email: string
  phone: string
}

export default function EventCheckout() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const locationState = location.state as { quantity?: number; ticketTypeId?: string } | null
  const initialQty = locationState?.quantity || 1
  const initialTypeId = locationState?.ticketTypeId

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<CheckoutForm>({
    defaultValues: {
      quantity: initialQty,
      attendeeName: '',
      email: '',
      phone: '',
    },
  })

  const [event, setEvent] = useState<Event | null>(null)
  const [selectedType, setSelectedType] = useState<EventTicketType | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [checkoutRequestId, setCheckoutRequestId] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [ticketMeta, setTicketMeta] = useState<{
    eventTitle: string
    quantity: number
    totalPrice: number
    ticketTypeName?: string
  } | null>(null)

  const quantity = watch('quantity')
  const unitPrice = selectedType ? Number(selectedType.price) : 0
  const totalPrice = unitPrice * Number(quantity || 0)
  const maxQty =
    selectedType?.remaining != null
      ? Math.min(10, selectedType.remaining)
      : 10

  useEffect(() => {
    if (user?.name) setValue('attendeeName', user.name)
    if (user?.email) setValue('email', user.email)
    if (user?.phone && /^254\d{9}$/.test(user.phone)) setValue('phone', user.phone)
  }, [user, setValue])

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
        const types = (data.ticket_types || []).filter((t: EventTicketType) => t.is_active)
        const fromState = types.find((t: EventTicketType) => t.id === initialTypeId)
        const firstAvailable =
          (fromState && !fromState.is_sold_out ? fromState : null) ||
          types.find((t: EventTicketType) => !t.is_sold_out) ||
          null
        setSelectedType(firstAvailable)
        if (!firstAvailable) {
          setError('No available ticket types for this event')
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load event')
      } finally {
        setLoading(false)
      }
    }
    fetchEvent()
  }, [eventId, initialTypeId])

  useEffect(() => {
    if (!event || !selectedType) return
    const qty = Number(initialQty) || 1
    trackInitiateCheckout(`event_${event.id}`, {
      contents: [{
        content_id: String(event.id),
        content_type: 'event',
        content_name: `${event.title} — ${selectedType.name}`,
        quantity: qty,
      }],
      value: Number(selectedType.price) * qty,
    })
  }, [event, selectedType, initialQty])

  const onSubmit = async (data: CheckoutForm) => {
    if (!selectedType) {
      setError('Please select a ticket type')
      return
    }
    try {
      setSubmitting(true)
      setError('')
      const normalizedEmail = data.email.trim().toLowerCase()
      const normalizedName = data.attendeeName.trim()
      setPhone(data.phone)
      setEmail(normalizedEmail)

      const ticketResult = await buyEventTickets(eventId!, {
        ticketTypeId: selectedType.id,
        quantity: Number(data.quantity),
        email: normalizedEmail,
        phone: data.phone,
        attendeeName: normalizedName,
      })

      const paymentResponse = await initiateTicketPayment({
        phone: data.phone,
        amount: Math.round(ticketResult.totalPrice),
        ticketBatchId: ticketResult.purchaseBatchId,
      })

      if (paymentResponse.checkoutRequestId) {
        setCheckoutRequestId(paymentResponse.checkoutRequestId)
        setTicketMeta({
          eventTitle: ticketResult.eventTitle,
          quantity: ticketResult.quantity,
          totalPrice: ticketResult.totalPrice,
          ticketTypeName: ticketResult.ticketTypeName,
        })
        setShowPaymentModal(true)
      } else {
        setError('Failed to initiate payment. Please try again.')
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.customerMessage ||
          'Payment initiation failed.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleModalClose = () => {
    setShowPaymentModal(false)
    const params = new URLSearchParams({ phone, email })
    navigate(`/ticket-confirmation/${checkoutRequestId}?${params.toString()}`, {
      state: {
        ...ticketMeta,
        phone,
        email,
        eventTitle: ticketMeta?.eventTitle || event?.title,
      },
    })
  }

  if (loading) {
    return (
      <div className={`${pageRoot} flex items-center justify-center`}>
        <Loader className="w-12 h-12 animate-spin text-accent light:text-accent-light" />
      </div>
    )
  }

  if ((error && !event) || !event) {
    return (
      <div className={`${pageRoot} py-16 px-6`}>
        <div className="max-w-2xl mx-auto bg-red-500/10 border border-red-500/20 p-6 flex gap-4">
          <AlertCircle className="w-6 h-6 text-red-400" />
          <div>
            <p className="text-red-300 mb-4">{error || 'Event not found'}</p>
            <button onClick={() => navigate('/events')} className="bg-accent light:bg-accent-light text-black light:text-white px-4 py-2 clip-angled-sm">Back to Events</button>
          </div>
        </div>
      </div>
    )
  }

  const qtyOptions = Array.from({ length: Math.max(0, maxQty) }, (_, i) => i + 1)

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
            <label className="block text-sm font-semibold mb-2">Ticket type</label>
            <p className="font-bebas text-2xl text-accent light:text-accent-light">
              {selectedType?.name || 'Unavailable'}
            </p>
            {selectedType && (
              <p className="text-sm text-fog light:text-fog-light mt-1">
                {Number(selectedType.price) === 0
                  ? 'FREE'
                  : `KES ${Number(selectedType.price).toLocaleString()} each`}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Number of Tickets</label>
            <select
              {...register('quantity', { required: true, min: 1, max: maxQty, valueAsNumber: true })}
              className={`w-full px-4 py-2 ${inputField}`}
              disabled={qtyOptions.length === 0}
            >
              {qtyOptions.map((n) => (
                <option key={n} value={n}>{n} {n === 1 ? 'Ticket' : 'Tickets'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Full name</label>
            <input
              type="text"
              {...register('attendeeName', {
                required: 'Name is required',
                minLength: { value: 2, message: 'Enter your full name' },
                maxLength: { value: 150, message: 'Name is too long' },
              })}
              placeholder="Jane Wanjiku"
              className={`w-full px-4 py-2 ${inputField}`}
              autoComplete="name"
            />
            {errors.attendeeName && (
              <p className="text-red-400 text-sm mt-1">{errors.attendeeName.message}</p>
            )}
            <p className="text-xs text-fog light:text-fog-light mt-1">Shown on your ticket at entry.</p>
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
            <p className="text-xs text-fog light:text-fog-light mt-1">Ticket PDF(s) will be sent to this email.</p>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">M-Pesa Phone (254XXXXXXXXX)</label>
            <input
              {...register('phone', {
                required: 'Phone is required',
                pattern: { value: /^254\d{9}$/, message: 'Format: 254XXXXXXXXX' },
              })}
              placeholder="254712345678"
              className={`w-full px-4 py-2 ${inputField}`}
            />
            {errors.phone && <p className="text-red-400 text-sm mt-1">{errors.phone.message}</p>}
          </div>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-300 flex gap-2">
              <AlertCircle size={16} className="flex-shrink-0" /> {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting || !selectedType || qtyOptions.length === 0}
            className="w-full bg-accent light:bg-accent-light text-black light:text-white py-3 clip-angled font-barlow-condensed font-black text-sm tracking-widest uppercase hover:bg-accent/90 light:hover:bg-accent-light/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <><Loader className="w-4 h-4 animate-spin" /> Processing…</> : 'Pay with M-Pesa'}
          </button>
        </form>

        <div className={`${cardSurface} p-6 sticky top-20 h-fit`}>
          <h3 className="font-barlow-condensed font-bold text-accent light:text-accent-light tracking-widest uppercase mb-4">Summary</h3>
          <p className="text-sm text-fog light:text-fog-light mb-1">{selectedType?.name}</p>
          <p className="text-sm text-fog light:text-fog-light mb-2">{quantity} ticket(s)</p>
          <p className="font-bebas text-3xl text-accent light:text-accent-light">
            {totalPrice === 0 ? 'FREE' : `KES ${totalPrice.toLocaleString()}`}
          </p>
          <p className="text-xs text-fog light:text-fog-light mt-4">An M-Pesa prompt will appear on your phone after checkout. Enter your PIN to complete payment.</p>
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
