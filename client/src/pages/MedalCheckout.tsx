import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { getMedalBySlug, createMedalPurchases, MedalTier, MedalOption } from '../api/medals'
import { initiateMedalPayment } from '../api/payments'
import PaymentStatusModal from '../components/PaymentStatusModal'
import { AlertCircle, Loader, ArrowLeft } from 'lucide-react'
import { pageRoot, cardSurface, inputField } from '../utils/themeClasses'
import { useAuth } from '../context/AuthContext'

type CheckoutForm = {
  quantity: number
  buyerName: string
  email: string
  phone: string
}

export default function MedalCheckout() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const state = (location.state || {}) as { optionId?: string; quantity?: number }
  const initialQty = state.quantity || 1
  const initialOptionId = state.optionId

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<CheckoutForm>({
    defaultValues: {
      quantity: initialQty,
      buyerName: '',
      email: '',
      phone: '',
    },
  })

  const [tier, setTier] = useState<MedalTier | null>(null)
  const [option, setOption] = useState<MedalOption | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [checkoutRequestId, setCheckoutRequestId] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [purchaseMeta, setPurchaseMeta] = useState<{
    tierName: string
    distanceKm: number
    quantity: number
    totalPrice: number
  } | null>(null)

  const quantity = watch('quantity')
  const totalPrice = option ? Number(option.price) * Number(quantity) : 0

  useEffect(() => {
    if (user?.name) setValue('buyerName', user.name)
    if (user?.email) setValue('email', user.email)
    if (user?.phone && /^254\d{9}$/.test(user.phone)) setValue('phone', user.phone)
  }, [user, setValue])

  useEffect(() => {
    const fetchTier = async () => {
      try {
        setLoading(true)
        if (!slug) {
          setError('Medal not found')
          return
        }
        const data = await getMedalBySlug(slug)
        setTier(data)
        const selected =
          data.options.find((o) => o.id === initialOptionId) || data.options[0] || null
        setOption(selected)
        if (!selected) {
          setError('No distance options available for this medal')
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load medal')
      } finally {
        setLoading(false)
      }
    }
    fetchTier()
  }, [slug, initialOptionId])

  const onSubmit = async (data: CheckoutForm) => {
    if (!option || !slug) return
    try {
      setSubmitting(true)
      setError('')
      const normalizedEmail = data.email.trim().toLowerCase()
      const normalizedName = data.buyerName.trim()
      setPhone(data.phone)
      setEmail(normalizedEmail)

      const purchaseResult = await createMedalPurchases(slug, {
        optionId: option.id,
        quantity: Number(data.quantity),
        email: normalizedEmail,
        phone: data.phone,
        buyerName: normalizedName,
      })

      const paymentResponse = await initiateMedalPayment({
        phone: data.phone,
        amount: Math.round(purchaseResult.totalPrice),
        medalBatchId: purchaseResult.purchaseBatchId,
      })

      if (paymentResponse.checkoutRequestId) {
        setCheckoutRequestId(paymentResponse.checkoutRequestId)
        setPurchaseMeta({
          tierName: purchaseResult.tierName,
          distanceKm: purchaseResult.distanceKm,
          quantity: purchaseResult.quantity,
          totalPrice: purchaseResult.totalPrice,
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
    navigate(`/medal-confirmation/${checkoutRequestId}?${params.toString()}`, {
      state: {
        ...purchaseMeta,
        phone,
        email,
        tierName: purchaseMeta?.tierName || tier?.name,
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

  if (error && !tier) {
    return (
      <div className={`${pageRoot} py-16 px-6`}>
        <div className="max-w-2xl mx-auto bg-red-500/10 border border-red-500/20 p-6 flex gap-4">
          <AlertCircle className="w-6 h-6 text-red-400" />
          <div>
            <p className="text-red-300 mb-4">{error}</p>
            <button
              onClick={() => navigate('/shop?category=Medals')}
              className="bg-accent light:bg-accent-light text-black light:text-white px-4 py-2 clip-angled-sm"
            >
              Back to Medals
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!tier || !option) return null

  return (
    <div className={pageRoot}>
      <section className="bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-14 pb-8">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate(`/medals/${slug}`)}
            className="inline-flex items-center gap-2 text-accent light:text-accent-light text-sm mb-4 bg-transparent border-0 cursor-pointer hover:underline"
          >
            <ArrowLeft size={14} /> Back to {tier.name}
          </button>
          <h1 className="font-bebas text-4xl text-chalk light:text-chalk-light">
            CLAIM YOUR <span className="text-accent light:text-accent-light">MEDAL</span>
          </h1>
          <p className="text-fog light:text-fog-light mt-1">
            {tier.name} · {option.distance_km} km
          </p>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-[6%] py-10 pb-20 grid grid-cols-1 md:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit(onSubmit)} className={`md:col-span-2 ${cardSurface} p-6 space-y-4`}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-3 text-red-300 text-sm flex gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-2">Quantity</label>
            <select
              {...register('quantity', { required: true, min: 1, max: 10, valueAsNumber: true })}
              className={`w-full px-4 py-2 ${inputField}`}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Full name</label>
            <input
              type="text"
              {...register('buyerName', {
                required: 'Name is required',
                minLength: { value: 2, message: 'Enter your full name' },
                maxLength: { value: 150, message: 'Name is too long' },
              })}
              className={`w-full px-4 py-2 ${inputField}`}
            />
            {errors.buyerName && (
              <p className="text-red-400 text-xs mt-1">{errors.buyerName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Email</label>
            <input
              type="email"
              {...register('email', { required: 'Email is required' })}
              className={`w-full px-4 py-2 ${inputField}`}
            />
            {errors.email && (
              <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">M-Pesa Phone</label>
            <input
              type="tel"
              placeholder="2547XXXXXXXX"
              {...register('phone', {
                required: 'Phone is required',
                pattern: {
                  value: /^254\d{9}$/,
                  message: 'Format: 254XXXXXXXXX',
                },
              })}
              className={`w-full px-4 py-2 ${inputField}`}
            />
            {errors.phone && (
              <p className="text-red-400 text-xs mt-1">{errors.phone.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-accent light:bg-accent-light text-black light:text-white py-4 font-barlow-condensed font-black text-sm tracking-widest uppercase clip-angled disabled:opacity-60"
          >
            {submitting ? 'Processing…' : 'Pay with M-Pesa'}
          </button>
        </form>

        <div className={`${cardSurface} p-6 h-fit`}>
          <h2 className="font-barlow-condensed font-bold text-sm tracking-widest uppercase text-accent light:text-accent-light mb-4">
            Summary
          </h2>
          <p className="font-semibold mb-1">{tier.name}</p>
          <p className="text-sm text-fog light:text-fog-light mb-4">{option.distance_km} km</p>
          <p className="text-sm text-fog light:text-fog-light">
            KES {Number(option.price).toLocaleString()} × {quantity}
          </p>
          <p className="font-bebas text-3xl text-accent light:text-accent-light mt-2">
            KES {totalPrice.toLocaleString()}
          </p>
        </div>
      </div>

      {showPaymentModal && (
        <PaymentStatusModal
          isOpen={showPaymentModal}
          checkoutRequestId={checkoutRequestId}
          phone={phone}
          onClose={handleModalClose}
        />
      )}
    </div>
  )
}
