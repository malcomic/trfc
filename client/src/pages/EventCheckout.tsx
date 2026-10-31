import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { getEventById, buyEventTickets, joinEventWaitlist } from '../api/events'
import { initiateTicketPayment } from '../api/payments'
import { getZones, type Zone } from '../api/zones'
import {
  TICKET_VALUE_NOTE,
  createPlan,
  formatCreditDate,
  getPendingMove,
  getPlans,
  getWallet,
  movePlan,
  payPlan,
  setPendingMove,
  payWithCredit,
  previewPlanSchedule,
  type PlanPreview,
} from '../api/wallet'
import PaymentStatusModal from '../components/PaymentStatusModal'
import TicketRulesBox from '../components/wallet/TicketRulesBox'
import { formatDate, formatKes } from '../utils/captainDisplay'
import { AlertCircle, Loader, ArrowLeft, Plus, X } from 'lucide-react'
import { pageRoot, cardSurface, inputField } from '../utils/themeClasses'
import { useAuth } from '../context/AuthContext'
import { trackInitiateCheckout } from '../utils/tiktokPixel'
import type { Event, EventTicketType } from '../types'

type CheckoutForm = {
  quantity: number
  attendeeName: string
  email: string
  phone: string
  zoneId: string
}

type PaymentMethod = 'full' | 'installments'

/** A booking created on this page that still needs paying, reused on retry instead of booking again. */
type PendingBooking = { batchId: string; ticketTypeId: string; quantity: number; totalPrice: number; eventTitle: string }

const ZONE_STORAGE_KEY = 'trfc_zone'
const MAX_LATER_PAYMENTS = 4

function readStoredZone(): string {
  try {
    return localStorage.getItem(ZONE_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

function storeZone(zoneId: string) {
  try {
    localStorage.setItem(ZONE_STORAGE_KEY, zoneId)
  } catch {
    /* storage unavailable */
  }
}

/** 'YYYY-MM-DD' for a date in Nairobi. */
function nairobiDay(date: Date): string {
  return new Date(date.getTime() + 3 * 3600_000).toISOString().slice(0, 10)
}

export default function EventCheckout() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const locationState = location.state as { quantity?: number; ticketTypeId?: string } | null
  const initialQty = locationState?.quantity || 1
  const initialTypeId = locationState?.ticketTypeId

  const { register, handleSubmit, formState: { errors }, watch, setValue, getValues } = useForm<CheckoutForm>({
    defaultValues: {
      quantity: initialQty,
      attendeeName: '',
      email: '',
      phone: '',
      zoneId: '',
    },
  })
  const [zones, setZones] = useState<Zone[]>([])

  const [event, setEvent] = useState<Event | null>(null)
  const [selectedType, setSelectedType] = useState<EventTicketType | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [canWaitlist, setCanWaitlist] = useState(false)
  const [waitlistMessage, setWaitlistMessage] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [checkoutRequestId, setCheckoutRequestId] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [ticketMeta, setTicketMeta] = useState<{
    eventTitle: string
    quantity: number
    totalPrice: number
    ticketTypeName?: string
    zoneName?: string
  } | null>(null)

  const [termsAccepted, setTermsAccepted] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('full')
  const [ticketValue, setTicketValue] = useState(0)
  const [useCredit, setUseCredit] = useState(true)
  const [planDates, setPlanDates] = useState<string[]>([])
  const [preview, setPreview] = useState<PlanPreview | null>(null)
  const [previewError, setPreviewError] = useState('')
  const [depositSource, setDepositSource] = useState<'credit' | 'mpesa'>('mpesa')
  const [pendingBooking, setPendingBooking] = useState<PendingBooking | null>(null)
  const [afterPaymentPath, setAfterPaymentPath] = useState<string | null>(null)
  const [pendingMove, setPendingMoveState] = useState(() => getPendingMove())

  const quantity = watch('quantity')
  const unitPrice = selectedType ? Number(selectedType.price) : 0
  const totalPrice = unitPrice * Number(quantity || 0)
  const moving = Boolean(user && pendingMove && pendingMove.eventId !== eventId && totalPrice > 0)
  const plansAllowed = Number(event?.installments_allowed ?? 0) > 0 && !moving
  const creditApplied = moving
    ? Math.min(ticketValue + (pendingMove?.amountPaid ?? 0), totalPrice)
    : user && paymentMethod === 'full' && useCredit
      ? Math.min(ticketValue, totalPrice)
      : 0
  const mpesaDue = Math.max(0, totalPrice - creditApplied)

  const refreshWallet = useCallback(() => {
    if (!user) return
    getWallet()
      .then((w) => {
        setTicketValue(w.ticketValue)
        if (w.ticketValue > 0) setDepositSource('credit')
      })
      .catch(() => setTicketValue(0))
  }, [user])

  useEffect(() => {
    refreshWallet()
  }, [refreshWallet])

  const datesKey = planDates.filter(Boolean).join(',')
  useEffect(() => {
    if (paymentMethod !== 'installments' || !eventId || totalPrice <= 0) {
      setPreview(null)
      setPreviewError('')
      return
    }
    let cancelled = false
    previewPlanSchedule({ eventId, total: totalPrice, dates: datesKey ? datesKey.split(',') : [] })
      .then((data) => {
        if (cancelled) return
        setPreview(data)
        setPreviewError('')
      })
      .catch((err: any) => {
        if (cancelled) return
        setPreview(null)
        setPreviewError(err.response?.data?.error || 'Paying in parts is not available for this event')
      })
    return () => {
      cancelled = true
    }
  }, [paymentMethod, eventId, totalPrice, datesKey])

  const seatLimit = event?.seats_available ?? null
  const maxQty = Math.max(
    0,
    Math.min(10, selectedType?.remaining != null ? selectedType.remaining : 10, seatLimit != null ? seatLimit : 10)
  )

  useEffect(() => {
    if (user?.name) setValue('attendeeName', user.name)
    if (user?.email) setValue('email', user.email)
    if (user?.phone && /^254\d{9}$/.test(user.phone)) setValue('phone', user.phone)
  }, [user, setValue])

  useEffect(() => {
    getZones()
      .then((list) => {
        setZones(list)
        const stored = readStoredZone()
        if (stored && list.some((z) => z.id === stored)) setValue('zoneId', stored)
      })
      .catch(() => setZones([]))
  }, [setValue])

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true)
        if (!eventId) {
          setError('Event ID not found')
          return
        }
        const data: Event = await getEventById(eventId)
        setEvent(data)
        const types = (data.ticket_types || []).filter((t: EventTicketType) => t.is_active)
        const fromState = types.find((t: EventTicketType) => t.id === initialTypeId)
        const firstAvailable =
          (fromState && !fromState.is_sold_out ? fromState : null) ||
          types.find((t: EventTicketType) => !t.is_sold_out) ||
          null
        setSelectedType(firstAvailable)
        if (data.sold_out_for_you) {
          setError('No seats are open to you right now. Join the waiting list and we will tell you when one opens.')
          setCanWaitlist(true)
        } else if (!firstAvailable) {
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

  const bookTickets = async (data: CheckoutForm, normalizedEmail: string): Promise<PendingBooking> => {
    if (
      pendingBooking &&
      pendingBooking.ticketTypeId === selectedType!.id &&
      pendingBooking.quantity === Number(data.quantity)
    ) {
      return pendingBooking
    }
    const ticketResult = await buyEventTickets(eventId!, {
      ticketTypeId: selectedType!.id,
      quantity: Number(data.quantity),
      email: normalizedEmail,
      phone: data.phone,
      attendeeName: data.attendeeName.trim(),
      zoneId: data.zoneId,
      termsAccepted: true,
    })
    storeZone(data.zoneId)
    const booking: PendingBooking = {
      batchId: ticketResult.purchaseBatchId,
      ticketTypeId: selectedType!.id,
      quantity: ticketResult.quantity,
      totalPrice: ticketResult.totalPrice,
      eventTitle: ticketResult.eventTitle,
    }
    setPendingBooking(booking)
    return booking
  }

  const payInFull = async (booking: PendingBooking, contact: { phone: string; email: string }) => {
    const result = await payWithCredit({ purchaseBatchIds: [booking.batchId], useCredit, phone: contact.phone })
    setPendingBooking(null)
    if (result.status === 'paid') {
      const params = new URLSearchParams(contact)
      navigate(`/ticket-confirmation/${result.references[0]}?${params.toString()}`, {
        state: {
          eventTitle: booking.eventTitle,
          quantity: booking.quantity,
          totalPrice: booking.totalPrice,
          ...contact,
        },
      })
      return
    }
    setTicketMeta({ eventTitle: booking.eventTitle, quantity: booking.quantity, totalPrice: booking.totalPrice })
    setCheckoutRequestId(result.checkoutRequestId)
    setShowPaymentModal(true)
  }

  const cancelMove = () => {
    setPendingMove(null)
    setPendingMoveState(null)
  }

  const moveInto = async (booking: PendingBooking, contact: { phone: string; email: string }) => {
    try {
      const result = await movePlan(pendingMove!.planId, { purchaseBatchId: booking.batchId, phone: contact.phone })
      cancelMove()
      setPendingBooking(null)
      if (result.status === 'paid') {
        const params = new URLSearchParams(contact)
        navigate(`/ticket-confirmation/${result.references[0]}?${params.toString()}`, {
          state: { eventTitle: booking.eventTitle, quantity: booking.quantity, totalPrice: booking.totalPrice, ...contact },
        })
        return
      }
      setTicketMeta({ eventTitle: booking.eventTitle, quantity: booking.quantity, totalPrice: booking.totalPrice })
      setCheckoutRequestId(result.checkoutRequestId)
      setShowPaymentModal(true)
    } catch (err) {
      const plans = await getPlans().catch(() => [])
      if (!plans.some((p) => p.id === pendingMove!.planId && p.status === 'active')) {
        cancelMove()
        refreshWallet()
      }
      throw err
    }
  }

  const startPlan = async (booking: PendingBooking, contactPhone: string) => {
    const plan = await createPlan({ purchaseBatchId: booking.batchId, dates: planDates.filter(Boolean) })
    setPendingBooking(null)
    const plansPath = '/dashboard/wallet'
    // The ticket is reserved even if the first payment doesn't go through; it can be paid from the dashboard.
    try {
      const result = await payPlan(plan.id, { mode: 'next', source: depositSource, phone: contactPhone })
      if (result.source === 'mpesa' && result.checkoutRequestId) {
        setAfterPaymentPath(plansPath)
        setCheckoutRequestId(result.checkoutRequestId)
        setShowPaymentModal(true)
        return
      }
      navigate(plansPath)
    } catch (err: any) {
      navigate(plansPath, {
        state: { notice: err.response?.data?.error || 'Your seat is reserved, but the first payment was not made yet.' },
      })
    }
  }

  const onSubmit = async (data: CheckoutForm) => {
    if (!selectedType) {
      setError('Please select a ticket type')
      return
    }
    if (!termsAccepted) {
      setError('Please read and accept the ticket rules to continue')
      return
    }
    try {
      setSubmitting(true)
      setError('')
      setCanWaitlist(false)
      const normalizedEmail = data.email.trim().toLowerCase()
      setPhone(data.phone)
      setEmail(normalizedEmail)

      if (moving) {
        const booking = await bookTickets(data, normalizedEmail)
        await moveInto(booking, { phone: data.phone, email: normalizedEmail })
        return
      }

      if (user && totalPrice > 0 && paymentMethod === 'installments') {
        if (!preview) {
          setError(previewError || 'Paying in parts is not available for this booking')
          return
        }
        const booking = await bookTickets(data, normalizedEmail)
        await startPlan(booking, data.phone)
        return
      }

      if (user && totalPrice > 0) {
        const booking = await bookTickets(data, normalizedEmail)
        await payInFull(booking, { phone: data.phone, email: normalizedEmail })
        return
      }

      const ticketResult = await buyEventTickets(eventId!, {
        ticketTypeId: selectedType.id,
        quantity: Number(data.quantity),
        email: normalizedEmail,
        phone: data.phone,
        attendeeName: data.attendeeName.trim(),
        zoneId: data.zoneId,
        termsAccepted: true,
      })
      storeZone(data.zoneId)

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
          zoneName: ticketResult.zoneName,
        })
        setShowPaymentModal(true)
      } else {
        setError('Failed to initiate payment. Please try again.')
      }
    } catch (err: any) {
      setCanWaitlist(Boolean(err.response?.data?.waitlist))
      setError(
        err.response?.data?.error ||
          err.response?.data?.customerMessage ||
          'Payment initiation failed.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const joinWaitlist = async () => {
    const { attendeeName, email: formEmail, phone: formPhone } = getValues()
    if (!formEmail) {
      setWaitlistMessage('Enter your email above so we can tell you when a seat opens.')
      return
    }
    try {
      const result = await joinEventWaitlist(eventId!, { name: attendeeName, email: formEmail, phone: formPhone })
      setWaitlistMessage(`You're on the waiting list (number ${result.position}). We'll message you when a seat opens.`)
    } catch (err: any) {
      setWaitlistMessage(err.response?.data?.error || 'Could not join the waiting list. Please try again.')
    }
  }

  const handleModalClose = () => {
    setShowPaymentModal(false)
    if (afterPaymentPath) {
      navigate(afterPaymentPath)
      return
    }
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

  if (!event) {
    return (
      <div className={`${pageRoot} py-16 px-6`}>
        <div className="max-w-2xl mx-auto bg-red-500/10 border border-red-500/20 p-6 flex gap-4">
          <AlertCircle className="w-6 h-6 text-red-400" />
          <div>
            <p className="text-red-300 mb-4">{error || 'Event not found'}</p>
            <button onClick={() => navigate('/events')} className="bg-cta text-cta-ink px-4 py-2 clip-angled-sm">Back to Events</button>
          </div>
        </div>
      </div>
    )
  }

  const qtyOptions = Array.from({ length: Math.max(0, maxQty) }, (_, i) => i + 1)
  const method: PaymentMethod = user && totalPrice > 0 && !moving ? paymentMethod : 'full'
  const deadlineDay = preview ? nairobiDay(new Date(preview.deadline)) : undefined
  const tomorrow = nairobiDay(new Date(Date.now() + 86_400_000))
  const submitLabel = moving
    ? mpesaDue > 0
      ? `Move & pay ${formatKes(mpesaDue)} with M-Pesa`
      : 'Move my payments here'
    : method === 'installments'
      ? `Reserve & pay ${preview ? formatKes(preview.deposit) : 'first part'}`
      : user && totalPrice > 0 && mpesaDue === 0
        ? `Use ${formatKes(creditApplied)} ticket value`
        : `Pay ${formatKes(mpesaDue)} with M-Pesa`
  const summaryNote = moving
    ? `The ${formatKes(pendingMove!.amountPaid)} you paid for ${pendingMove!.eventTitle} is released from that event and used here, with any other ticket value (oldest first).`
    : method === 'installments'
      ? 'Your seat is reserved while you pay. The QR ticket is issued once everything is paid.'
      : creditApplied > 0
        ? mpesaDue > 0
          ? `${formatKes(creditApplied)} comes from your ticket value (oldest first). Pay the rest by M-Pesa.`
          : 'Paid from your ticket value (oldest first). Your tickets are issued immediately.'
        : 'An M-Pesa prompt will appear on your phone after checkout. Enter your PIN to complete payment.'

  return (
    <div className={pageRoot}>
      <section className="bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-14 pb-8">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => navigate(`/events/${eventId}`)} className="inline-flex items-center gap-2 text-accent light:text-accent-light text-sm mb-4 bg-transparent border-0 cursor-pointer hover:underline">
            <ArrowLeft size={14} /> Back to Event
          </button>
          <h1 className="font-bebas text-4xl text-chalk light:text-chalk-light">BUY <span className="text-accent light:text-accent-light">TICKETS</span></h1>
          <p className="text-fog light:text-fog-light mt-1">{event.title}</p>
          {event.priority_note && <p className="text-sm text-fog light:text-fog-light mt-1">{event.priority_note}</p>}
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
            <p className="text-xs text-fog light:text-fog-light mt-1">
              Ticket PDF(s) will be sent to this email. Typed it wrong? You can still get your tickets later at{' '}
              <Link to="/find-tickets" className="text-accent light:text-accent-light">Find My Tickets</Link> with your
              M-Pesa code.
            </p>
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
          <div>
            <label className="block text-sm font-semibold mb-2">Your zone</label>
            <select
              {...register('zoneId', { required: 'Please choose your zone' })}
              className={`w-full px-4 py-2 ${inputField}`}
            >
              <option value="">Select your zone</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
            {errors.zoneId && <p className="text-red-400 text-sm mt-1">{errors.zoneId.message}</p>}
            <p className="text-xs text-fog light:text-fog-light mt-1">We use this to show flash deals available in your area.</p>
          </div>
          {moving && pendingMove && (
            <div className="border border-accent/40 light:border-accent-light/40 bg-accent/10 light:bg-accent-light/10 p-3 text-sm space-y-1">
              <p>
                Moving the <strong>{formatKes(pendingMove.amountPaid)}</strong> you paid for{' '}
                <strong>{pendingMove.eventTitle}</strong> to this event. Your seat there is released.
              </p>
              <button type="button" onClick={cancelMove} className="text-xs text-accent light:text-accent-light hover:underline">
                Don't move, keep my ticket for {pendingMove.eventTitle}
              </button>
            </div>
          )}
          {user && totalPrice > 0 && !moving && (
            <div>
              <label className="block text-sm font-semibold mb-2">How do you want to pay?</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {([
                  { id: 'full', label: 'Pay in full', hint: ticketValue > 0 ? `Ticket value ${formatKes(ticketValue)} + M-Pesa` : 'M-Pesa' },
                  ...(plansAllowed
                    ? [{ id: 'installments', label: 'Pay in parts', hint: `${event.payment_rules?.deposit_pct ?? 30}% now, the rest later` }]
                    : []),
                ] as { id: PaymentMethod; label: string; hint: string }[]).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPaymentMethod(opt.id)}
                    className={`text-left px-3 py-2 border transition-colors ${
                      paymentMethod === opt.id
                        ? 'border-accent light:border-accent-light bg-accent/10 light:bg-accent-light/10'
                        : 'border-white/10 light:border-black/10 hover:border-white/30 light:hover:border-black/30'
                    }`}
                  >
                    <span className="block font-semibold text-sm">{opt.label}</span>
                    <span className="block text-xs text-fog light:text-fog-light">{opt.hint}</span>
                  </button>
                ))}
              </div>

              {paymentMethod === 'full' && ticketValue > 0 && (
                <label className="flex items-start gap-2 text-sm mt-3">
                  <input type="checkbox" className="mt-1" checked={useCredit} onChange={(e) => setUseCredit(e.target.checked)} />
                  <span>
                    Use my ticket value ({formatKes(ticketValue)})
                    <span className="block text-xs text-fog light:text-fog-light">
                      The oldest value is used first. {TICKET_VALUE_NOTE}
                    </span>
                  </span>
                </label>
              )}

              {paymentMethod === 'installments' && (
                <div className="mt-3 space-y-3">
                  {previewError && <p className="text-sm text-red-300">{previewError}</p>}
                  {preview && (
                    <>
                      <p className="text-xs text-fog light:text-fog-light">
                        Everything must be paid by <strong>{formatCreditDate(preview.deadline)}, 11:59 pm</strong> (
                        {preview.deadlineDays} day{preview.deadlineDays === 1 ? '' : 's'} before the event).
                      </p>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold">When will you pay the rest?</p>
                        {planDates.map((day, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <input
                              type="date"
                              value={day}
                              min={tomorrow}
                              max={deadlineDay}
                              onChange={(e) =>
                                setPlanDates((list) => list.map((d, j) => (j === i ? e.target.value : d)))
                              }
                              className={`px-3 py-1.5 text-sm ${inputField}`}
                            />
                            <button
                              type="button"
                              onClick={() => setPlanDates((list) => list.filter((_, j) => j !== i))}
                              className="text-fog light:text-fog-light hover:text-red-400"
                              aria-label="Remove date"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                        {planDates.length < MAX_LATER_PAYMENTS && (
                          <button
                            type="button"
                            onClick={() => setPlanDates((list) => [...list, ''])}
                            className="inline-flex items-center gap-1 text-xs text-accent light:text-accent-light hover:underline"
                          >
                            <Plus size={12} /> Add a payment date
                          </button>
                        )}
                        {planDates.length === 0 && (
                          <p className="text-xs text-fog light:text-fog-light">
                            No dates picked: the rest is due by the deadline. You can always pay early.
                          </p>
                        )}
                      </div>
                      <ul className="text-sm divide-y divide-white/5 light:divide-black/5 border border-white/10 light:border-black/10">
                        {preview.schedule.map((s) => (
                          <li key={s.seq} className="flex justify-between px-3 py-2">
                            <span>{s.seq === 1 ? 'Today' : `Payment ${s.seq} · by ${formatDate(s.due_at)}`}</span>
                            <span className="font-semibold">{formatKes(s.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  <div>
                    <p className="text-xs font-semibold mb-1">Pay today's part with</p>
                    <div className="flex gap-4 text-sm">
                      <label className="flex items-center gap-2">
                        <input type="radio" checked={depositSource === 'mpesa'} onChange={() => setDepositSource('mpesa')} />
                        M-Pesa
                      </label>
                      {ticketValue > 0 && (
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={depositSource === 'credit'}
                            onChange={() => setDepositSource('credit')}
                          />
                          Ticket value ({formatKes(ticketValue)})
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <TicketRulesBox
            rules={event.payment_rules}
            accepted={termsAccepted}
            onChange={setTermsAccepted}
            showPlanRules={method === 'installments'}
          />

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-300 flex gap-2">
              <AlertCircle size={16} className="flex-shrink-0" /> {error}
            </div>
          )}
          {canWaitlist && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={joinWaitlist}
                className="w-full border border-accent light:border-accent-light text-accent light:text-accent-light py-2 font-barlow-condensed font-bold text-sm tracking-widest uppercase"
              >
                Join the waiting list
              </button>
              {waitlistMessage && <p className="text-xs text-fog light:text-fog-light">{waitlistMessage}</p>}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting || !selectedType || qtyOptions.length === 0 || !termsAccepted}
            className="w-full bg-cta text-cta-ink py-3 clip-angled font-barlow-condensed font-black text-sm tracking-widest uppercase hover:bg-cta/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <><Loader className="w-4 h-4 animate-spin" /> Processing…</> : submitLabel}
          </button>
        </form>

        <div className={`${cardSurface} p-6 sticky top-20 h-fit`}>
          <h3 className="font-barlow-condensed font-bold text-accent light:text-accent-light tracking-widest uppercase mb-4">Summary</h3>
          <p className="text-sm text-fog light:text-fog-light mb-1">{selectedType?.name}</p>
          <p className="text-sm text-fog light:text-fog-light mb-2">{quantity} ticket(s)</p>
          <p className="font-bebas text-3xl text-accent light:text-accent-light">
            {totalPrice === 0 ? 'FREE' : `KES ${totalPrice.toLocaleString()}`}
          </p>
          {creditApplied > 0 && method === 'full' && (moving || useCredit) && (
            <div className="text-xs mt-2 space-y-1">
              <p className="flex justify-between"><span>Ticket value</span><span>−{formatKes(creditApplied)}</span></p>
              <p className="flex justify-between font-semibold"><span>M-Pesa</span><span>{formatKes(mpesaDue)}</span></p>
            </div>
          )}
          <p className="text-xs text-fog light:text-fog-light mt-4">{summaryNote}</p>
          {!user && (
            <p className="text-xs text-fog light:text-fog-light mt-2">
              <Link to="/login" className="text-accent light:text-accent-light">Log in</Link> to use ticket value or pay in parts.
            </p>
          )}
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
