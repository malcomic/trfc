import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom'
import { pollPaymentStatus } from '../api/payments'
import {
  getMedalPurchasesByCheckoutRequestId,
  MedalConfirmationDetails,
} from '../api/medals'
import { AlertCircle, CheckCircle, Clock, Award } from 'lucide-react'
import { pageRoot, cardSurface, inputField } from '../utils/themeClasses'

interface NavState {
  tierName?: string
  distanceKm?: number
  quantity?: number
  totalPrice?: number
  phone?: string
  email?: string
}

export default function MedalConfirmation() {
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
  const [details, setDetails] = useState<MedalConfirmationDetails | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>('pending')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDetails = async (verifyEmail?: string, verifyPhone?: string) => {
    if (!checkoutRequestId) return null
    const data = await getMedalPurchasesByCheckoutRequestId(checkoutRequestId, {
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
        setError(err.response?.data?.error || 'Failed to load medal purchase details')
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
      setError(err.response?.data?.error || 'Could not verify medal purchase')
    } finally {
      setLoading(false)
    }
  }

  if (!checkoutRequestId) {
    return (
      <div className={`${pageRoot} py-16 px-6`}>
        <p className="text-center text-fog">Invalid confirmation link.</p>
        <div className="text-center mt-4">
          <button onClick={() => navigate('/medals')} className="text-accent">
            Back to Medals
          </button>
        </div>
      </div>
    )
  }

  if (gatePrompt) {
    return (
      <div className={`${pageRoot} py-16 px-6`}>
        <form
          onSubmit={handleGateVerify}
          className={`max-w-md mx-auto ${cardSurface} p-6 space-y-4`}
        >
          <h1 className="font-bebas text-3xl">Verify Purchase</h1>
          <p className="text-sm text-fog light:text-fog-light">
            Enter the email or M-Pesa phone used at checkout.
          </p>
          {error && (
            <div className="text-red-300 text-sm flex gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full px-4 py-2 ${inputField}`}
          />
          <input
            type="tel"
            placeholder="2547XXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={`w-full px-4 py-2 ${inputField}`}
          />
          <button
            type="submit"
            className="w-full bg-accent light:bg-accent-light text-black light:text-white py-3 font-barlow-condensed font-bold tracking-widest uppercase"
          >
            Verify
          </button>
        </form>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`${pageRoot} flex items-center justify-center py-24`}>
        <Clock className="w-10 h-10 animate-spin text-accent light:text-accent-light" />
      </div>
    )
  }

  if (error && !details) {
    return (
      <div className={`${pageRoot} py-16 px-6`}>
        <div className="max-w-lg mx-auto bg-red-500/10 border border-red-500/20 p-6 flex gap-4">
          <AlertCircle className="text-red-400" />
          <div>
            <p className="text-red-300 mb-4">{error}</p>
            <button onClick={() => navigate('/medals')} className="text-accent underline">
              Back to Medals
            </button>
          </div>
        </div>
      </div>
    )
  }

  const paid = paymentStatus === 'paid' || details?.payment_status === 'paid'

  return (
    <div className={pageRoot}>
      <section className="bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-14 pb-11">
        <div className="max-w-2xl mx-auto text-center">
          {paid ? (
            <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-4" />
          ) : (
            <Clock className="w-14 h-14 text-yellow-400 mx-auto mb-4" />
          )}
          <h1 className="font-bebas text-5xl text-chalk light:text-chalk-light">
            {paid ? (
              <>
                MEDAL <span className="text-accent light:text-accent-light">CONFIRMED</span>
              </>
            ) : (
              <>
                PAYMENT <span className="text-yellow-400">PENDING</span>
              </>
            )}
          </h1>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-[6%] py-10 pb-20 space-y-6">
        <div className={`${cardSurface} p-6`}>
          <div className="flex items-start gap-4 mb-6">
            <Award className="text-accent light:text-accent-light flex-shrink-0" size={28} />
            <div>
              <h2 className="font-bebas text-3xl">
                {details?.tier_name || state.tierName || 'Medal'}
              </h2>
              <p className="text-fog light:text-fog-light">
                {(details?.distance_km ?? state.distanceKm) != null
                  ? `${details?.distance_km ?? state.distanceKm} km`
                  : '—'}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-fog light:text-fog-light uppercase tracking-widest text-xs mb-1">
                Buyer
              </dt>
              <dd className="font-semibold">{details?.buyer_name || '—'}</dd>
            </div>
            <div>
              <dt className="text-fog light:text-fog-light uppercase tracking-widest text-xs mb-1">
                Quantity
              </dt>
              <dd className="font-semibold">{details?.quantity ?? state.quantity ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-fog light:text-fog-light uppercase tracking-widest text-xs mb-1">
                Total
              </dt>
              <dd className="font-bebas text-2xl text-accent light:text-accent-light">
                KES{' '}
                {Number(details?.total_price ?? state.totalPrice ?? 0).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-fog light:text-fog-light uppercase tracking-widest text-xs mb-1">
                M-Pesa Receipt
              </dt>
              <dd className="font-semibold">{details?.mpesa_receipt || '—'}</dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/medals"
            className="bg-accent light:bg-accent-light text-black light:text-white px-6 py-3 font-barlow-condensed font-bold tracking-widest uppercase no-underline clip-angled-sm"
          >
            Browse Medals
          </Link>
          <Link
            to="/account/medals"
            className="border border-white/20 light:border-black/20 px-6 py-3 font-barlow-condensed font-bold tracking-widest uppercase no-underline text-chalk light:text-chalk-light"
          >
            My Medals
          </Link>
        </div>
      </div>
    </div>
  )
}
