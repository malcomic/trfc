import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { createOrder } from '../api/orders'
import { initiateSTKPush } from '../api/payments'
import { useCart } from '../store/cartStore'
<<<<<<< HEAD
import { AlertCircle, ShoppingCart, Truck } from 'lucide-react'
import { Button, FormInput, Card } from '../components/ui'
=======
import { getGrandTotal, getShipping } from '../utils/shipping'
import PaymentStatusModal from '../components/PaymentStatusModal'
import { AlertCircle, Loader, ShoppingCart, Truck, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { pageRoot, cardSurface, inputField } from '../utils/themeClasses'
>>>>>>> ae707d8c0a73e5527b29afbb8289c6a4bfcd1793

export default function Checkout() {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const navigate = useNavigate()
  const { items, getTotal, clearCart } = useCart()
  const subtotal = getTotal()
  const shipping = getShipping(subtotal)
  const grandTotal = getGrandTotal(subtotal)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [checkoutRequestId, setCheckoutRequestId] = useState('')
  const [phone, setPhone] = useState('')
  const [orderId, setOrderId] = useState('')

  if (items.length === 0) {
    return (
<<<<<<< HEAD
      <div className="min-h-screen bg-night text-chalk font-barlow flex items-center justify-center px-[6%] py-12">
        <div className="max-w-2xl w-full text-center">
          <div className="w-20 h-20 bg-ash rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10">
            <ShoppingCart size={40} className="text-fog" />
          </div>
          <h1 className="font-bebas text-5xl text-chalk mb-3 letter-spacing-tighter">
            CART EMPTY
          </h1>
          <p className="text-lg text-fog mb-8">
            Your shopping cart is empty. Browse our products and start adding items to your order.
          </p>
          <Button
            onClick={() => navigate('/shop')}
            variant="primary"
            size="lg"
          >
            Continue Shopping
          </Button>
=======
      <div className={pageRoot}>
        <div className="max-w-2xl mx-auto text-center px-6 py-24">
          <ShoppingCart className="w-16 h-16 text-fog light:text-fog-light mx-auto mb-4" />
          <h1 className="font-bebas text-5xl mb-4 text-chalk light:text-chalk-light">CHECKOUT</h1>
          <p className="text-fog light:text-fog-light mb-6">Your cart is empty</p>
          <Link to="/shop" className="inline-flex bg-accent light:bg-accent-light text-black light:text-white px-6 py-3 clip-angled font-barlow-condensed font-black text-sm tracking-widest uppercase no-underline hover:bg-accent/90 light:hover:bg-accent-light/90">
            Continue Shopping
          </Link>
>>>>>>> ae707d8c0a73e5527b29afbb8289c6a4bfcd1793
        </div>
      </div>
    )
  }

  const onSubmit = async (data: Record<string, string>) => {
    try {
      setLoading(true)
      setError('')
      setPhone(data.phone)

      const orderItems = items.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
      }))

      const createdOrder = await createOrder({
        items: orderItems,
        total_amount: grandTotal,
        phone: data.phone,
        delivery_address: data.address,
      })

      setOrderId(createdOrder.id)

      const paymentResponse = await initiateSTKPush({
        phone: data.phone,
        amount: Math.round(grandTotal),
        orderId: createdOrder.id,
      })

      if (paymentResponse.checkoutRequestId) {
        setCheckoutRequestId(paymentResponse.checkoutRequestId)
        setShowPaymentModal(true)
        clearCart()
      } else {
        setError('Failed to initiate payment. Please try again.')
      }
    } catch (err: any) {
      console.error('Checkout failed:', err)
      setError(err.response?.data?.error || err.response?.data?.customerMessage || 'Checkout failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentModalClose = () => {
    setShowPaymentModal(false)
    if (orderId) {
      navigate(`/order-confirmation/${orderId}`, { state: { phone } })
    }
  }

  return (
<<<<<<< HEAD
    <div className="min-h-screen bg-night text-chalk font-barlow">
      {/* ── Hero ── */}
      <section className="bg-gradient-to-r from-ink via-ash to-ink border-b border-white/5 px-[6%] py-12">
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire mb-3 before:block before:w-5 before:h-0.5 before:bg-fire">
            Complete Your Order
          </div>
          <h1 className="font-bebas text-4xl text-chalk letter-spacing-tighter">
            SECURE <span className="text-fire">CHECKOUT</span>
          </h1>
=======
    <div className={pageRoot}>
      <section className="bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-14 pb-11">
        <div className="max-w-5xl mx-auto">
          <Link to="/cart" className="inline-flex items-center gap-2 text-accent light:text-accent-light text-sm mb-4 no-underline hover:underline font-barlow-condensed font-bold">
            <ArrowLeft size={14} /> Back to Cart
          </Link>
          <h1 className="font-bebas text-5xl text-chalk light:text-chalk-light leading-tight">CHECK<span className="text-accent light:text-accent-light">OUT</span></h1>
          <p className="text-fog light:text-fog-light mt-2">Complete your purchase securely with M-Pesa</p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-[6%] py-10 pb-20 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className={`${cardSurface} p-8 space-y-6`}>
            <h2 className="font-barlow-condensed font-bold text-xl tracking-widest uppercase text-accent light:text-accent-light">Delivery Information</h2>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 border-l-4 border-l-red-500 px-4 py-3 flex gap-3 text-sm">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-300">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-2">Phone Number <span className="text-accent light:text-accent-light">*</span></label>
              <input
                type="tel"
                {...register('phone', {
                  required: 'Phone number is required',
                  pattern: { value: /^254\d{9}$/, message: 'Phone must be in format 254XXXXXXXXX' },
                })}
                placeholder="254712345678"
                className={`w-full rounded-none px-4 py-3 placeholder-fog light:placeholder-fog-light ${inputField}`}
              />
              {errors.phone && <p className="text-red-400 text-sm mt-1">{errors.phone.message as string}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Delivery Address <span className="text-accent light:text-accent-light">*</span></label>
              <textarea
                {...register('address', { required: 'Delivery address is required' })}
                placeholder="E.g., 123 Main Street, Nairobi, Kenya"
                className={`w-full rounded-none px-4 py-3 h-24 resize-none placeholder-fog light:placeholder-fog-light ${inputField}`}
              />
              {errors.address && <p className="text-red-400 text-sm mt-1">{errors.address.message as string}</p>}
            </div>

            <div className="bg-accent/10 light:bg-accent-light/10 border border-accent/15 light:border-accent-light/15 p-4 flex gap-3 text-sm text-fog light:text-fog-light">
              <Truck className="w-5 h-5 text-accent light:text-accent-light flex-shrink-0" />
              <div>
                <p className="font-semibold text-chalk light:text-chalk-light mb-1">{shipping === 0 ? 'Free Delivery' : `Delivery — KES ${shipping}`}</p>
                <p>Orders over KES 3,000 qualify for free delivery. Delivered within 2–3 business days after payment.</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent light:bg-accent-light text-black light:text-white py-3 font-barlow-condensed font-black text-sm tracking-widest uppercase clip-angled hover:bg-accent/90 light:hover:bg-accent-light/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (<><Loader className="w-4 h-4 animate-spin" /> Processing...</>) : 'Proceed to Payment'}
            </button>
          </form>
>>>>>>> ae707d8c0a73e5527b29afbb8289c6a4bfcd1793
        </div>
      </section>

<<<<<<< HEAD
      {/* ── Main Content ── */}
      <div className="max-w-5xl mx-auto px-[6%] py-12 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-8">
              {/* Error Alert */}
              {error && (
                <div className="flex items-start gap-3 bg-danger-red/10 border border-danger-red/30 p-5 rounded-sm">
                  <AlertCircle size={20} className="text-danger-red flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase text-danger-red">Payment Error</p>
                    <p className="text-sm text-chalk/70 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {/* Delivery Section */}
              <Card>
                <Card.Body>
                  <h2 className="font-bebas text-2xl text-chalk mb-6 letter-spacing-tighter">
                    DELIVERY <span className="text-fire">INFO</span>
                  </h2>
                  <div className="space-y-5">
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
                      <label className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-chalk/40 mb-2.5 block" htmlFor="checkout-address">
                        Delivery Address
                      </label>
                      <textarea
                        id="checkout-address"
                        rows={4}
                        className="w-full bg-smoke border border-white/10 text-chalk font-barlow text-base px-4 py-3 outline-none transition-all duration-200 focus:border-fire/50 resize-none"
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
                  <p className="font-barlow-condensed font-bold letter-spacing-widest text-transform-uppercase text-info-blue mb-1">Free Delivery</p>
                  <p className="text-chalk/70">Orders delivered within 2-3 business days after payment confirmation.</p>
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

              <p className="text-xs text-fog text-center">
                💡 After clicking proceed, an M-Pesa prompt will appear on your phone. Enter your PIN to complete payment.
              </p>
            </form>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <Card.Body>
                <h3 className="font-bebas text-2xl text-chalk mb-6 letter-spacing-tighter">
                  ORDER <span className="text-fire">SUMMARY</span>
                </h3>

                {/* Items */}
                <div className="space-y-3 mb-6 pb-6 border-b border-white/10">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase text-chalk truncate">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-fog mt-1">
                          KES {Number(item.product.price).toFixed(0)} × {item.quantity}
                        </p>
                      </div>
                      <p className="font-bebas text-lg text-fire flex-shrink-0">
                        {(Number(item.product.price) * item.quantity).toFixed(0)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Pricing */}
                <div className="space-y-3 mb-6 pb-6 border-b border-white/10 text-sm">
                  <div className="flex justify-between text-fog">
                    <span>Subtotal</span>
                    <span>KES {total.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-fog">
                    <span>Delivery</span>
                    <span className="font-barlow-condensed font-bold text-success-green">FREE</span>
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-baseline mb-6">
                  <span className="font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase text-fog">Total</span>
                  <span className="font-bebas text-4xl text-fire letter-spacing-tighter">
                    {total.toFixed(0)}
                  </span>
                </div>

                {/* Info */}
                <div className="bg-ash p-4 space-y-2 text-xs text-fog">
                  <div className="flex justify-between">
                    <span>📦 Items</span>
                    <span className="font-bold text-chalk">{items.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>⏱️ Delivery</span>
                    <span className="font-bold text-chalk">2-3 days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🔒 Secure</span>
                    <span className="font-bold text-fire">M-Pesa</span>
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
                <h4 className="font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase text-chalk mb-2">
                  {badge.title}
                </h4>
                <p className="text-xs text-fog">{badge.desc}</p>
              </Card.Body>
            </Card>
          ))}
        </div>
=======
        <div className="lg:col-span-1">
          <div className={`${cardSurface} p-6 sticky top-20`}>
            <h3 className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light mb-6">Order Summary</h3>
            <div className="space-y-3 mb-6 pb-6 border-b border-white/5 light:border-black/8 text-sm">
              {items.map((item) => (
                <div key={item.product.id} className="flex justify-between">
                  <span className="text-fog light:text-fog-light">{item.product.name} × {item.quantity}</span>
                  <span className="text-chalk light:text-chalk-light">KES {(Number(item.product.price) * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 mb-6 text-sm">
              <div className="flex justify-between text-fog light:text-fog-light"><span>Subtotal</span><span>KES {subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between text-fog light:text-fog-light">
                <span>Delivery</span>
                <span className={shipping === 0 ? 'text-green-400' : 'text-chalk light:text-chalk-light'}>{shipping === 0 ? 'FREE' : `KES ${shipping}`}</span>
              </div>
            </div>
            <div className="flex justify-between font-bebas text-3xl text-accent light:text-accent-light">
              <span>Total</span>
              <span>KES {grandTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
>>>>>>> ae707d8c0a73e5527b29afbb8289c6a4bfcd1793
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
