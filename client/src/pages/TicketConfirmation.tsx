import { useEffect, useState } from 'react'
<<<<<<< HEAD
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { pollPaymentStatus } from '../api/payments'
import { getUserTickets } from '../api/tickets'
import { AlertCircle, CheckCircle, Loader } from 'lucide-react'
import TicketDownloadButton from '../components/TicketDownloadButton'

interface PaymentState {
  eventId: string
  quantity: number
  totalPrice: number
  phone: string
=======
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { pollPaymentStatus } from '../api/payments'
import { getTicketsByCheckoutRequestId } from '../api/events'
import { AlertCircle, CheckCircle, Clock, Ticket } from 'lucide-react'

interface TicketDetails {
  eventTitle?: string
  quantity?: number
  totalPrice?: number
  phone?: string
>>>>>>> ae707d8c0a73e5527b29afbb8289c6a4bfcd1793
}

export default function TicketConfirmation() {
  const { checkoutRequestId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
<<<<<<< HEAD
  const [paymentStatus, setPaymentStatus] = useState<string>('checking')
  const [error, setError] = useState('')
  const [ticketIds, setTicketIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const state = location.state as PaymentState | undefined

  useEffect(() => {
    const checkPayment = async () => {
      if (!checkoutRequestId) {
        setError('Payment reference not found')
        setLoading(false)
        return
      }

      try {
        // Poll for payment status
        await pollPaymentStatus(checkoutRequestId, {
          interval: 3000,
          timeout: 120000, // 2 minutes timeout
        })

        setPaymentStatus('paid')

        // Fetch user's tickets to get the ticket IDs
        const tickets = await getUserTickets()
        const recentTickets = tickets
          .filter((t) => t.payment_status === 'paid')
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          .slice(0, state?.quantity || 1)

        setTicketIds(recentTickets.map((t) => t.id))
      } catch (err: any) {
        console.error('Payment check error:', err)
        if (err.message.includes('timeout')) {
          setError(
            'Payment verification timed out. Please check your payment history.'
          )
        } else {
          setError(
            err.message ||
              'Failed to verify payment. Please check your payment history.'
          )
        }
        setPaymentStatus('failed')
=======
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
>>>>>>> ae707d8c0a73e5527b29afbb8289c6a4bfcd1793
      } finally {
        setLoading(false)
      }
    }
<<<<<<< HEAD

    checkPayment()
  }, [checkoutRequestId, state?.quantity])

  if (loading) {
    return (
      <div className="min-h-screen py-12 px-4 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md">
          <Loader className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
            Verifying Payment
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Please wait while we confirm your payment with M-Pesa...
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            This may take a few moments. Do not refresh the page.
          </p>
=======
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
>>>>>>> ae707d8c0a73e5527b29afbb8289c6a4bfcd1793
        </div>
      </div>
    )
  }

<<<<<<< HEAD
  if (paymentStatus === 'paid') {
    return (
      <div className="min-h-screen py-12 px-4 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-2xl mx-auto">
          {/* Success Message */}
          <div className="bg-white dark:bg-[#1C1C1C] rounded-lg shadow-lg p-8 mb-8">
            <div className="flex items-center justify-center mb-6">
              <CheckCircle className="w-16 h-16 text-green-600" />
            </div>

            <h1 className="text-3xl font-bold text-center mb-2 text-gray-900 dark:text-white">
              Payment Successful! 🎉
            </h1>

            <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
              Your ticket purchase has been confirmed.
            </p>

            {/* Ticket Details */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
              <h2 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">
                What's Next?
              </h2>
              <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">📧</span>
                  <span>
                    Check your email - Your ticket with QR code has been sent to you
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">📥</span>
                  <span>
                    Download your PDF ticket below (keep it handy for event entry)
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">🎫</span>
                  <span>
                    Present the QR code at the event entrance for verification
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">⏰</span>
                  <span>Arrive 15 minutes before the event starts</span>
                </li>
              </ul>
            </div>

            {/* Download Buttons */}
            {ticketIds.length > 0 && (
              <div className="mb-8">
                <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">
                  Download Your Tickets:
                </h3>
                <div className="space-y-3">
                  {ticketIds.map((ticketId, index) => (
                    <div key={ticketId} className="flex items-center gap-4">
                      <span className="text-gray-600 dark:text-gray-400 font-medium">
                        Ticket {index + 1}:
                      </span>
                      <TicketDownloadButton
                        ticketId={ticketId}
                        paymentStatus="paid"
                        eventTitle={`Ticket ${index + 1}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transaction Details */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-8">
              <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">
                Transaction Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Reference ID:
                  </span>
                  <span className="font-mono font-semibold text-gray-900 dark:text-white">
                    {checkoutRequestId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Number of Tickets:
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {state?.quantity || 1}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400 font-semibold">
                    Total Amount Paid:
                  </span>
                  <span className="text-lg font-bold text-primary">
                    KES {(state?.totalPrice || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/payment-history')}
                className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-opacity-90 font-semibold"
              >
                View Payment History
              </button>
              <button
                onClick={() => navigate('/events')}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white px-6 py-3 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold"
              >
                Back to Events
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Payment Failed or Error
  return (
    <div className="min-h-screen py-12 px-4 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-[#1C1C1C] rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-center mb-6">
            <AlertCircle className="w-16 h-16 text-red-600" />
          </div>

          <h1 className="text-3xl font-bold text-center mb-2 text-gray-900 dark:text-white">
            Payment Verification Failed
          </h1>

          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            {error ||
              'We were unable to verify your payment. Please try again or contact support.'}
          </p>

          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-8">
            <h3 className="font-bold text-lg mb-3 text-red-800 dark:text-red-300">
              What to do next?
            </h3>
            <ul className="space-y-2 text-sm text-red-700 dark:text-red-400">
              <li>
                • Check your M-Pesa app to confirm if the payment went through
              </li>
              <li>
                • Visit your Payment History to check the status of your payment
              </li>
              <li>
                • If the payment was deducted but tickets not received, contact
                support
              </li>
              <li>• Try the purchase again if no payment was made</li>
            </ul>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => navigate('/payment-history')}
              className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-opacity-90 font-semibold"
            >
              Check Payment History
            </button>
            <button
              onClick={() => navigate('/events')}
              className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white px-6 py-3 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold"
            >
              Back to Events
            </button>
          </div>

          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
            Need help?{' '}
            <a
              href="mailto:support@trfc.com"
              className="text-primary hover:underline font-semibold"
            >
              Contact Support
            </a>
          </p>
        </div>
=======
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
>>>>>>> ae707d8c0a73e5527b29afbb8289c6a4bfcd1793
      </div>
    </div>
  )
}
