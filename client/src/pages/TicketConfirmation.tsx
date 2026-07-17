import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { pollPaymentStatus } from '../api/payments'
import {
  getTicketsByCheckoutRequestId,
  TicketConfirmationDetails,
} from '../api/events'
import { AlertCircle, CheckCircle, Clock, CalendarPlus } from 'lucide-react'
import TicketCard from '../components/TicketCard'
import { googleCalendarUrl, downloadIcs } from '../utils/calendar'
import { pageRoot } from '../utils/themeClasses'

interface NavState {
  eventTitle?: string
  quantity?: number
  totalPrice?: number
  phone?: string
  email?: string
}

export default function TicketConfirmation() {
  const { checkoutRequestId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const state = (location.state || {}) as NavState
  const emailFromUrl = searchParams.get('email') || ''
  const phoneFromUrl = searchParams.get('phone') || ''
  const [email, setEmail] = useState(emailFromUrl || state.email || '')
  const [phone, setPhone] = useState(phoneFromUrl || state.phone || '')
  const [gatePrompt, setGatePrompt] = useState(
    !emailFromUrl && !state.email && !phoneFromUrl && !state.phone
  )
  const [details, setDetails] = useState<TicketConfirmationDetails | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>('pending')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const verify = {
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
  }

  const loadDetails = async (verifyEmail?: string, verifyPhone?: string) => {
    if (!checkoutRequestId) return null
    const data = await getTicketsByCheckoutRequestId(checkoutRequestId, {
      email: verifyEmail || undefined,
      phone: verifyPhone || undefined,
    })
    setDetails(data)
    if (data.payment_status === 'paid') setPaymentStatus('paid')
    return data
  }

  useEffect(() => {
    if (!checkoutRequestId) {
      setLoading(false)
      return
    }
    if (gatePrompt) {
      setLoading(false)
      return
    }

    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const data = await loadDetails(email || undefined, phone || undefined)
        if (data?.payment_status !== 'paid') {
          try {
            await pollPaymentStatus(checkoutRequestId)
            setPaymentStatus('paid')
            await loadDetails(email || undefined, phone || undefined)
          } catch {
            /* still pending */
          }
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load ticket details')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [checkoutRequestId, email, phone, gatePrompt])

  const handleGateVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedPhone = phone.replace(/\s+/g, '')

    if (!normalizedEmail && !normalizedPhone) {
      setError('Enter the email or phone used at checkout')
      return
    }
    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address')
      return
    }
    if (normalizedPhone && !/^254\d{9}$/.test(normalizedPhone)) {
      setError('Enter a valid phone number (254XXXXXXXXX)')
      return
    }

    try {
      setLoading(true)
      setError('')
      setEmail(normalizedEmail)
      setPhone(normalizedPhone)
      const params: Record<string, string> = {}
      if (normalizedEmail) params.email = normalizedEmail
      if (normalizedPhone) params.phone = normalizedPhone
      setSearchParams(params)
      await loadDetails(normalizedEmail || undefined, normalizedPhone || undefined)
      setGatePrompt(false)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not verify ticket purchase')
    } finally {
      setLoading(false)
    }
  }

  if (gatePrompt) {
    return (
      <div className={`${pageRoot} py-16 px-6`}>
        <div className="max-w-md mx-auto bg-ash light:bg-ash-light border border-white/5 light:border-black/8 p-8">
          <h1 className="font-bebas text-4xl mb-2">
            TICKET <span className="text-accent light:text-accent-light">CONFIRMATION</span>
          </h1>
          <p className="text-fog light:text-fog-light text-sm mb-6">
            Enter the email or M-Pesa phone used at checkout to view your tickets.
          </p>
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <form onSubmit={handleGateVerify} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-smoke light:bg-smoke-light border border-white/10 light:border-black/10 px-4 py-3 text-chalk light:text-chalk-light focus:outline-none focus:border-accent light:focus:border-accent-light"
            />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="254712345678"
              className="w-full bg-smoke light:bg-smoke-light border border-white/10 light:border-black/10 px-4 py-3 text-chalk light:text-chalk-light focus:outline-none focus:border-accent light:focus:border-accent-light"
            />
            <button
              type="submit"
              className="w-full bg-accent light:bg-accent-light text-black light:text-white py-3 font-barlow-condensed font-black text-sm tracking-widest uppercase clip-angled hover:bg-accent/90 light:hover:bg-accent-light/90"
            >
              View Tickets
            </button>
          </form>
        </div>
      </div>
    )
  }

  const eventTitle = details?.event_title || state.eventTitle || 'Event'
  const calendarHref =
    details?.event_date &&
    googleCalendarUrl({
      title: `TRFC: ${eventTitle}`,
      start: details.event_date,
      location: details.location,
      details: `Your TRFC event ticket. Attendee: ${details.attendee_name}`,
    })

  return (
    <div className={`${pageRoot} py-12 px-6`}>
      <div className="max-w-2xl mx-auto">
        {error && (
          <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 border-l-4 border-l-red-500 px-4 py-3.5 mb-6 text-sm text-red-400 print:hidden">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.25" />
            <span>{error}</span>
          </div>
        )}

        <div
          className={`p-6 mb-6 border-l-4 print:hidden ${
            paymentStatus === 'paid'
              ? 'bg-green-500/10 border-green-500'
              : 'bg-accent/10 light:bg-accent-light/10 border-accent light:border-accent-light'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            {loading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent light:border-accent-light" />
            ) : paymentStatus === 'paid' ? (
              <CheckCircle className="w-6 h-6 text-green-400" />
            ) : (
              <Clock className="w-6 h-6 text-accent light:text-accent-light" />
            )}
            <h1 className="font-bebas text-3xl">
              {loading
                ? 'Confirming Payment…'
                : paymentStatus === 'paid'
                  ? 'Tickets Confirmed!'
                  : 'Payment Pending'}
            </h1>
          </div>
          <p className="text-fog light:text-fog-light text-sm">
            {paymentStatus === 'paid'
              ? details?.attendee_name
                ? `${details.attendee_name}, your tickets are ready below. We also emailed PDF copies — check spam if you don’t see them.`
                : 'Your tickets are ready below. We also emailed PDF copies — check spam if you don’t see them.'
              : 'Complete the M-Pesa payment on your phone to confirm your tickets.'}
          </p>
        </div>

        {paymentStatus === 'paid' && details?.tickets && details.tickets.length > 0 && (
          <div className="space-y-4 mb-8">
            {details.tickets.map((t, i) => (
              <TicketCard
                key={t.id}
                index={i}
                total={details.tickets.length}
                verify={verify}
                ticket={{
                  id: t.id,
                  shortCode: t.short_code,
                  attendeeName: t.attendee_name,
                  paymentStatus: t.payment_status,
                  qrDataUrl: t.qr_data_url,
                  eventTitle: details.event_title,
                  eventDate: details.event_date,
                  location: details.location,
                  unitPrice: details.unit_price,
                  mpesaReceipt: details.mpesa_receipt,
                  phone: details.phone,
                }}
              />
            ))}
          </div>
        )}

        <div className="bg-ash light:bg-ash-light border border-white/5 light:border-black/8 p-6 mb-6 space-y-3 print:hidden">
          <h2 className="font-barlow-condensed font-bold tracking-widest uppercase text-accent light:text-accent-light mb-2">
            Purchase summary
          </h2>
          {details?.attendee_name && (
            <p>
              <span className="text-fog light:text-fog-light">Name: </span>
              {details.attendee_name}
            </p>
          )}
          <p>
            <span className="text-fog light:text-fog-light">Event: </span>
            {eventTitle}
          </p>
          {details?.event_date && (
            <p>
              <span className="text-fog light:text-fog-light">When: </span>
              {new Date(details.event_date).toLocaleString('en-KE', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
          {details?.location && (
            <p>
              <span className="text-fog light:text-fog-light">Venue: </span>
              {details.location}
            </p>
          )}
          <p>
            <span className="text-fog light:text-fog-light">Tickets: </span>
            {details?.quantity ?? state.quantity ?? '—'}
          </p>
          {(details?.total_price != null || state.totalPrice != null) && (
            <p>
              <span className="text-fog light:text-fog-light">Total: </span>
              KES {(details?.total_price ?? state.totalPrice)!.toLocaleString()}
            </p>
          )}
          {(details?.email || email) && (
            <p>
              <span className="text-fog light:text-fog-light">Email: </span>
              {details?.email || email}
            </p>
          )}
          {(details?.phone || phone) && (
            <p>
              <span className="text-fog light:text-fog-light">Phone: </span>
              {details?.phone || phone}
            </p>
          )}
          {details?.mpesa_receipt && (
            <p>
              <span className="text-fog light:text-fog-light">M-Pesa: </span>
              {details.mpesa_receipt}
            </p>
          )}
          {checkoutRequestId && (
            <p className="text-xs text-fog font-mono break-all">Ref: {checkoutRequestId}</p>
          )}
        </div>

        {paymentStatus === 'paid' && details?.event_date && (
          <div className="flex flex-wrap gap-3 mb-6 print:hidden">
            {calendarHref && (
              <a
                href={calendarHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-smoke light:bg-smoke-light border border-white/10 light:border-black/10 font-barlow-condensed font-bold text-xs tracking-widest uppercase hover:border-accent light:hover:border-accent-light"
              >
                <CalendarPlus size={14} />
                Add to Google Calendar
              </a>
            )}
            <button
              type="button"
              onClick={() =>
                downloadIcs({
                  title: `TRFC: ${eventTitle}`,
                  start: details.event_date,
                  location: details.location,
                  details: `Attendee: ${details.attendee_name}`,
                  filename: `trfc-${eventTitle.replace(/\s+/g, '-').toLowerCase()}.ics`,
                })
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-smoke light:bg-smoke-light border border-white/10 light:border-black/10 font-barlow-condensed font-bold text-xs tracking-widest uppercase hover:border-accent light:hover:border-accent-light"
            >
              <CalendarPlus size={14} />
              Download .ics
            </button>
          </div>
        )}

        <div className="flex gap-3 print:hidden">
          <button
            onClick={() => navigate('/events')}
            className="flex-1 bg-accent light:bg-accent-light text-black light:text-white py-3 clip-angled font-barlow-condensed font-black text-sm tracking-widest uppercase hover:bg-accent/90 light:hover:bg-accent-light/90"
          >
            Back to Events
          </button>
          {paymentStatus === 'pending' && !loading && (
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-smoke border border-white/10 py-3 font-barlow-condensed font-bold text-sm hover:border-accent light:hover:border-accent-light"
            >
              Refresh
            </button>
          )}
        </div>

        {paymentStatus === 'pending' && !loading && (
          <div className="mt-6 flex gap-3 bg-red-500/10 border border-red-500/20 p-4 text-sm print:hidden">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-300">
              If payment was not received, return to the event page and try again.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
