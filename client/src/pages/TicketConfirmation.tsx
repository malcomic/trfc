import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { pollPaymentStatus } from '../api/payments'
import { getTicketsByCheckoutRequestId } from '../api/events'
import { AlertCircle, CheckCircle, Clock, Ticket } from 'lucide-react'

interface TicketDetails {
  eventTitle?: string
  quantity?: number
  totalPrice?: number
  phone?: string
}

export default function TicketConfirmation() {
  const { checkoutRequestId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const state = (location.state || {}) as TicketDetails
  const phoneFromUrl = searchParams.get('phone') || ''
  const [phone, setPhone] = useState(phoneFromUrl || state.phone || '')
  const [phonePrompt, setPhonePrompt] = useState(!phoneFromUrl && !state.phone)
  const [details, setDetails] = useState<TicketDetails>(state)
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>('pending')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDetails = async (verifyPhone: string) => {
    if (!checkoutRequestId) return null
    const data = await getTicketsByCheckoutRequestId(checkoutRequestId, verifyPhone)
    setDetails({
      eventTitle: data.event_title,
      quantity: data.quantity,
      totalPrice: data.total_price,
      phone: data.phone,
    })
    if (data.payment_status === 'paid') setPaymentStatus('paid')
    return data
  }

  useEffect(() => {
    if (!checkoutRequestId) {
      setLoading(false)
      return
    }
    if (phonePrompt) {
      setLoading(false)
      return
    }

    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const data = await loadDetails(phone)
        if (data?.payment_status !== 'paid') {
          try {
            await pollPaymentStatus(checkoutRequestId)
            setPaymentStatus('paid')
            await loadDetails(phone)
          } catch {
            /* polling timeout */
          }
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load ticket details')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [checkoutRequestId, phone, phonePrompt])

  const handlePhoneVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    const normalized = phone.replace(/\s+/g, '')
    if (!/^254\d{9}$/.test(normalized)) {
      setError('Enter a valid phone number (254XXXXXXXXX)')
      return
    }
    try {
      setLoading(true)
      setError('')
      setPhone(normalized)
      setSearchParams({ phone: normalized })
      await loadDetails(normalized)
      setPhonePrompt(false)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not verify ticket purchase')
    } finally {
      setLoading(false)
    }
  }

  if (phonePrompt) {
    return (
      <div className="min-h-screen bg-night text-chalk font-barlow py-16 px-6">
        <div className="max-w-md mx-auto bg-ash border border-white/5 p-8">
          <h1 className="font-bebas text-4xl mb-2">TICKET <span className="text-accent light:text-accent-light">CONFIRMATION</span></h1>
          <p className="text-fog text-sm mb-6">Enter the phone number used at checkout to view your tickets.</p>
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <form onSubmit={handlePhoneVerify} className="space-y-4">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\s+/g, ''))}
              placeholder="254712345678"
              className="w-full bg-smoke border border-white/10 px-4 py-3 text-chalk focus:outline-none focus:border-accent light:focus:border-accent-light"
            />
            <button type="submit" className="w-full bg-accent light:bg-accent-light text-black light:text-white py-3 font-barlow-condensed font-black text-sm tracking-widest uppercase clip-angled hover:bg-accent/90 light:hover:bg-accent-light/90">
              View Tickets
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-night text-chalk font-barlow py-12 px-6">
      <div className="max-w-2xl mx-auto">
        {error && (
          <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 border-l-4 border-l-red-500 px-4 py-3.5 mb-6 text-sm text-red-400">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.25" />
            <span>{error}</span>
          </div>
        )}

        <div className={`p-6 mb-6 border-l-4 ${paymentStatus === 'paid' ? 'bg-green-500/10 border-green-500' : 'bg-accent/10 light:bg-accent-light/10 border-accent light:border-accent-light'}`}>
          <div className="flex items-center gap-3 mb-2">
            {loading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent light:border-accent-light" />
            ) : paymentStatus === 'paid' ? (
              <CheckCircle className="w-6 h-6 text-green-400" />
            ) : (
              <Clock className="w-6 h-6 text-accent light:text-accent-light" />
            )}
            <h1 className="font-bebas text-3xl">
              {loading ? 'Confirming Payment…' : paymentStatus === 'paid' ? 'Tickets Confirmed!' : 'Payment Pending'}
            </h1>
          </div>
          <p className="text-fog text-sm">
            {paymentStatus === 'paid'
              ? 'Your ticket payment was successful. See you at the event!'
              : 'Complete the M-Pesa payment on your phone to confirm your tickets.'}
          </p>
        </div>

        <div className="bg-ash border border-white/5 p-6 mb-6 space-y-3">
          <div className="flex items-center gap-2 text-accent light:text-accent-light mb-4">
            <Ticket size={18} />
            <h2 className="font-barlow-condensed font-bold tracking-widest uppercase">Ticket Details</h2>
          </div>
          {details.eventTitle && <p><span className="text-fog">Event: </span>{details.eventTitle}</p>}
          {details.quantity && <p><span className="text-fog">Tickets: </span>{details.quantity}</p>}
          {details.totalPrice != null && <p><span className="text-fog">Total: </span>KES {details.totalPrice.toLocaleString()}</p>}
          {phone && <p><span className="text-fog">Phone: </span>{phone}</p>}
          {checkoutRequestId && (
            <p className="text-xs text-fog font-mono break-all">Ref: {checkoutRequestId}</p>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={() => navigate('/events')} className="flex-1 bg-accent light:bg-accent-light text-black light:text-white py-3 clip-angled font-barlow-condensed font-black text-sm tracking-widest uppercase hover:bg-accent/90 light:hover:bg-accent-light/90">
            Back to Events
          </button>
          {paymentStatus === 'pending' && !loading && (
            <button onClick={() => window.location.reload()} className="flex-1 bg-smoke border border-white/10 py-3 font-barlow-condensed font-bold text-sm hover:border-accent light:hover:border-accent-light">
              Refresh
            </button>
          )}
        </div>

        {paymentStatus === 'pending' && !loading && (
          <div className="mt-6 flex gap-3 bg-red-500/10 border border-red-500/20 p-4 text-sm">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-300">If payment was not received, return to the event page and try again.</p>
          </div>
        )}
      </div>
    </div>
  )
}
