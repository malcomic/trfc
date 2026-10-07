import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { createOrder } from '../api/orders'
import { initiateSTKPush } from '../api/payments'
import { useCart, cartLineKey, cartLinePrice } from '../store/cartStore'
import type { CartItem } from '../types'
import { getGrandTotal } from '../utils/shipping'
import { loadFlashAccess } from '../utils/flashAccess'
import { formatSelectedOptions } from '../utils/productOptions'
import PaymentStatusModal from '../components/PaymentStatusModal'
import { AlertCircle, ShoppingCart, Truck, ArrowLeft } from 'lucide-react'
import { Button, FormInput, Card } from '../components/ui'
import { pageRoot, inputField } from '../utils/themeClasses'
import { trackInitiateCheckout } from '../utils/tiktokPixel'
import { useAuth } from '../context/AuthContext'

export default function Checkout() {
  const { user } = useAuth()
  const { register, handleSubmit, setValue, getValues, formState: { errors } } = useForm({
    defaultValues: { email: user?.email ?? '', phone: '', address: '' },
  })

  useEffect(() => {
    if (user?.email && !getValues('email')) setValue('email', user.email)
  }, [user?.email, getValues, setValue])
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isBuyNow = searchParams.get('mode') === 'buy-now'
  const { items: cartItems, buyNowItem, clearBuyNow, clearCart, removeItem } = useCart()
  // Snapshot of what was submitted, so the page and payment modal stay up after the items are cleared.
  const [submittedItems, setSubmittedItems] = useState<CartItem[] | null>(null)
  const liveItems = useMemo(
    () => (isBuyNow ? (buyNowItem ? [buyNowItem] : []) : cartItems),
    [isBuyNow, buyNowItem, cartItems]
  )
  const items = submittedItems ?? liveItems
  const grandTotal = getGrandTotal(items.reduce((sum, item) => sum + cartLinePrice(item) * item.quantity, 0))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [flashRejected, setFlashRejected] = useState(false)
  const hasFlashItems = items.some((item) => item.flashSaleId)

  const removeFlashItems = () => {
    if (isBuyNow) {
      clearBuyNow()
      navigate('/flash-sales')
      return
    }
    items.filter((item) => item.flashSaleId).forEach((item) => removeItem(cartLineKey(item)))
    setFlashRejected(false)
    setError('')
  }
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [checkoutRequestId, setCheckoutRequestId] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [orderId, setOrderId] = useState('')

  useEffect(() => {
    if (items.length === 0) return
    trackInitiateCheckout('shop', {
      contents: items.map((item) => ({
        content_id: String(item.product.id),
        content_type: 'product' as const,
        content_name: item.product.name,
        quantity: item.quantity,
      })),
      value: grandTotal,
    })
  }, [items, grandTotal])

  if (items.length === 0) {
    return (
      <div className={`${pageRoot} font-barlow flex items-center justify-center px-[6%] py-12`}>
        <div className="max-w-2xl w-full text-center">
          <div className="w-20 h-20 bg-ash light:bg-ash-light rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10 light:border-black/10">
            <ShoppingCart size={40} className="text-fog light:text-fog-light" />
          </div>
          <h1 className="font-bebas text-5xl text-chalk light:text-chalk-light mb-3 letter-spacing-tighter">
            {isBuyNow ? 'NO DEAL SELECTED' : 'CART EMPTY'}
          </h1>
          <p className="text-lg text-fog light:text-fog-light mb-8">
            {isBuyNow
              ? 'This flash deal is no longer selected. Head back to the flash deals to pick your jersey.'
              : 'Your shopping cart is empty. Browse our products and start adding items to your order.'}
          </p>
          <Button
            onClick={() => navigate(isBuyNow ? '/flash-sales' : '/shop')}
            variant="primary"
            size="lg"
          >
            {isBuyNow ? 'Back to Flash Deals' : 'Continue Shopping'}
          </Button>
        </div>
      </div>
    )
  }

  const onSubmit = async (data: Record<string, string>) => {
    try {
      setLoading(true)
      setError('')
      setFlashRejected(false)
      setPhone(data.phone)
      const normalizedEmail = data.email.trim().toLowerCase()
      setEmail(normalizedEmail)

      const orderItems = items.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: cartLinePrice(item),
        ...(item.flashSaleId ? { flash_sale_id: item.flashSaleId } : {}),
        ...(item.variantId ? { variant_id: item.variantId } : {}),
        ...(item.distance ? { distance: item.distance } : {}),
      }))

      const createdOrder = await createOrder({
        items: orderItems,
        total_amount: grandTotal,
        phone: data.phone,
        email: normalizedEmail,
        delivery_address: data.address,
        ...(hasFlashItems ? { flash_token: loadFlashAccess()?.token } : {}),
      })

      setOrderId(createdOrder.id)

      const paymentResponse = await initiateSTKPush({
        phone: data.phone,
        amount: Math.round(grandTotal),
        orderId: createdOrder.id,
      })

      if (paymentResponse.checkoutRequestId) {
        setCheckoutRequestId(paymentResponse.checkoutRequestId)
        setSubmittedItems(items)
        setShowPaymentModal(true)
        if (isBuyNow) clearBuyNow()
        else clearCart()
      } else {
        setError('Failed to initiate payment. Please try again.')
      }
    } catch (err: any) {
      console.error('Checkout failed:', err)
      const status = err.response?.status
      const message: string =
        err.response?.data?.error || err.response?.data?.customerMessage || 'Checkout failed. Please try again.'
      setFlashRejected(hasFlashItems && (status === 403 || (status === 409 && /flash/i.test(message))))
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentModalClose = () => {
    setShowPaymentModal(false)
    if (orderId) {
      navigate(`/order-confirmation/${orderId}`, { state: { phone, email } })
    }
  }

  return (
    <div className={`${pageRoot} font-barlow`}>
      {/* ── Hero ── */}
      <section className="bg-gradient-to-r from-ink via-ash to-ink light:from-ink-light light:via-ash-light light:to-ink-light border-b border-white/5 light:border-black/5 px-[6%] py-12">
        <div className="max-w-5xl mx-auto relative z-10">
          <Link to={isBuyNow ? '/flash-sales' : '/cart'} className="inline-flex items-center gap-2 text-accent light:text-accent-light text-sm mb-4 no-underline hover:underline font-barlow-condensed font-bold">
            <ArrowLeft size={14} /> {isBuyNow ? 'Back to flash deals' : 'Back to Cart'}
          </Link>
          <div className="inline-flex items-center gap-2 font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-accent light:text-accent-light mb-3 before:block before:w-5 before:h-0.5 before:bg-accent light:before:bg-accent-light">
            Complete Your Order
          </div>
          <h1 className="font-bebas text-4xl text-chalk light:text-chalk-light letter-spacing-tighter">
            SECURE <span className="text-accent light:text-accent-light">CHECKOUT</span>
          </h1>
        </div>
      </section>

      {/* ── Main Content ── */}
      <div className="max-w-5xl mx-auto px-[6%] py-12 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
              {/* Error Alert */}
              {error && (
                <div className="flex items-start gap-3 bg-danger-red/10 border border-danger-red/30 p-5 rounded-sm">
                  <AlertCircle size={20} className="text-danger-red flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase text-danger-red">Payment Error</p>
                    <p className="text-sm text-chalk/70 light:text-chalk-light/70 mt-1">{error}</p>
                    {flashRejected && (
                      <button
                        type="button"
                        onClick={removeFlashItems}
                        className="mt-3 font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light underline bg-transparent border-0 cursor-pointer p-0"
                      >
                        Remove flash items and continue
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Delivery Section */}
              <Card>
                <Card.Body>
                  <h2 className="font-bebas text-2xl text-chalk light:text-chalk-light mb-6 letter-spacing-tighter">
                    CONTACT <span className="text-accent light:text-accent-light">AND DELIVERY</span>
                  </h2>
                  <div className="space-y-5">
                    <FormInput
                      label="Email Address"
                      id="checkout-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      helperText="We'll send your order confirmation here"
                      error={errors.email ? (errors.email.message as string) : undefined}
                      {...register('email', {
                        required: 'Email is required for your order confirmation',
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: 'Enter a valid email address',
                        },
                      })}
                    />

                    <FormInput
                      label="Phone Number"
                      id="checkout-phone"
                      type="tel"
                      placeholder="254712345678"
                      error={errors.phone ? (errors.phone.message as string) : undefined}
                      {...register('phone', {
                        required: 'Phone number is required',
                        pattern: {
                          value: /^254\d{9}$/,
                          message: 'Format: 254XXXXXXXXX (Kenya)',
                        },
                      })}
                    />

                    <div>
                      <label className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-chalk/60 light:text-chalk-light/60 mb-2.5 block" htmlFor="checkout-address">
                        Delivery Address
                      </label>
                      <textarea
                        id="checkout-address"
                        rows={4}
                        className={`w-full font-barlow text-base px-4 py-3 transition-all duration-200 resize-none ${inputField}`}
                        placeholder="E.g., 123 Main Street, Nairobi, Kenya"
                        {...register('address', { required: 'Delivery address is required' })}
                      />
                      {errors.address && (
                        <p className="text-xs text-danger-red mt-1.5">{errors.address.message as string}</p>
                      )}
                    </div>
                  </div>
                </Card.Body>
              </Card>

              {/* Shipping Info */}
              <div className="flex items-start gap-4 bg-info-blue/10 border border-info-blue/30 p-5">
                <Truck size={20} className="text-info-blue flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-barlow-condensed font-bold letter-spacing-widest text-transform-uppercase text-info-blue mb-1">
                    Delivery
                  </p>
                  <p className="text-chalk/70 light:text-chalk-light/70">Delivered within 2-3 business days after payment confirmation.</p>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                isLoading={loading}
                variant="primary"
                size="lg"
                fullWidth
                className="h-13"
              >
                {loading ? 'Processing...' : 'Proceed to Payment'}
              </Button>

              <p className="text-xs text-fog light:text-fog-light text-center">
                💡 After clicking proceed, an M-Pesa prompt will appear on your phone. Enter your PIN to complete payment.
              </p>
            </form>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <Card className="sticky top-4">
              <Card.Body>
                <h3 className="font-bebas text-2xl text-chalk light:text-chalk-light mb-6 letter-spacing-tighter">
                  ORDER <span className="text-accent light:text-accent-light">SUMMARY</span>
                </h3>

                {/* Items */}
                <div className="space-y-3 mb-6 pb-6 border-b border-white/10 light:border-black/10">
                  {items.map((item) => (
                    <div key={cartLineKey(item)} className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase text-chalk light:text-chalk-light truncate">
                          {item.product.name}
                        </p>
                        {formatSelectedOptions(item) && (
                          <p className="text-xs text-chalk/80 light:text-chalk-light/80 mt-0.5">{formatSelectedOptions(item)}</p>
                        )}
                        <p className="text-xs text-fog light:text-fog-light mt-1">
                          KES {cartLinePrice(item).toFixed(0)} × {item.quantity}
                          {item.flashSaleId && <span className="ml-2 text-accent light:text-accent-light font-bold">Flash</span>}
                        </p>
                      </div>
                      <p className="font-bebas text-lg text-accent light:text-accent-light flex-shrink-0">
                        {(cartLinePrice(item) * item.quantity).toFixed(0)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="flex justify-between items-baseline mb-6 pb-6 border-b border-white/10 light:border-black/10">
                  <span className="font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase text-fog light:text-fog-light">Total</span>
                  <span className="font-bebas text-4xl text-accent light:text-accent-light letter-spacing-tighter">
                    {grandTotal.toFixed(0)}
                  </span>
                </div>

                {/* Info */}
                <div className="bg-ash light:bg-smoke-light p-4 space-y-2 text-xs text-fog light:text-fog-light">
                  <div className="flex justify-between">
                    <span>📦 Items</span>
                    <span className="font-bold text-chalk light:text-chalk-light">{items.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>⏱️ Delivery</span>
                    <span className="font-bold text-chalk light:text-chalk-light">2-3 days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🔒 Secure</span>
                    <span className="font-bold text-accent light:text-accent-light">M-Pesa</span>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: '🔒', title: 'Secure Payment', desc: 'M-Pesa encryption protects your data' },
            { icon: '✓', title: 'Satisfaction Guaranteed', desc: 'Not satisfied? We offer full refunds' },
            { icon: '⚡', title: 'Fast Processing', desc: 'Orders processed within hours' }
          ].map((badge, idx) => (
            <Card key={idx}>
              <Card.Body className="text-center">
                <div className="text-4xl mb-3">{badge.icon}</div>
                <h4 className="font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase text-chalk light:text-chalk-light mb-2">
                  {badge.title}
                </h4>
                <p className="text-xs text-fog light:text-fog-light">{badge.desc}</p>
              </Card.Body>
            </Card>
          ))}
        </div>
      </div>

      <PaymentStatusModal
        isOpen={showPaymentModal}
        checkoutRequestId={checkoutRequestId}
        phone={phone}
        onClose={handlePaymentModalClose}
      />
    </div>
  )
}
