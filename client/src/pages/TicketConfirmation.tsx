import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { pollPaymentStatus } from '../api/payments'
import { AlertCircle, CheckCircle, Clock, Ticket } from 'lucide-react'

export default function TicketConfirmation() {
  const { checkoutRequestId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state || {}) as {
    eventTitle?: string
    quantity?: number
    totalPrice?: number
    phone?: string
  }
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>('pending')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!checkoutRequestId) {
      setLoading(false)
      return
    }

    const poll = async () => {
      try {
        await pollPaymentStatus(checkoutRequestId)
        setPaymentStatus('paid')
      } catch {
        /* timeout — user can refresh */
      } finally {
        setLoading(false)
      }
    }
    poll()
  }, [checkoutRequestId])

  return (
    <div className="min-h-screen bg-night text-chalk font-barlow py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <div className={`p-6 mb-6 border-l-4 ${paymentStatus === 'paid' ? 'bg-green-500/10 border-green-500' : 'bg-fire/10 border-fire'}`}>
          <div className="flex items-center gap-3 mb-2">
            {loading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-fire" />
            ) : paymentStatus === 'paid' ? (
              <CheckCircle className="w-6 h-6 text-green-400" />
            ) : (
              <Clock className="w-6 h-6 text-fire" />
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
          <div className="flex items-center gap-2 text-fire mb-4">
            <Ticket size={18} />
            <h2 className="font-barlow-condensed font-bold letter-spacing-widest text-transform-uppercase">Ticket Details</h2>
          </div>
          {state.eventTitle && <p><span className="text-fog">Event: </span>{state.eventTitle}</p>}
          {state.quantity && <p><span className="text-fog">Tickets: </span>{state.quantity}</p>}
          {state.totalPrice != null && <p><span className="text-fog">Total: </span>KES {state.totalPrice.toLocaleString()}</p>}
          {state.phone && <p><span className="text-fog">Phone: </span>{state.phone}</p>}
          {checkoutRequestId && (
            <p className="text-xs text-fog font-mono break-all">Ref: {checkoutRequestId}</p>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={() => navigate('/events')} className="flex-1 bg-fire text-white py-3 clip-angled font-barlow-condensed font-black text-sm letter-spacing-widest text-transform-uppercase hover:bg-ember">
            Back to Events
          </button>
          {paymentStatus === 'pending' && !loading && (
            <button onClick={() => window.location.reload()} className="flex-1 bg-smoke border border-white/10 py-3 font-barlow-condensed font-bold text-sm hover:border-fire">
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
