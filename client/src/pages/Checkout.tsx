import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import { createOrder } from '../api/orders'
import { initiateSTKPush } from '../api/payments'
import { useCart } from '../store/cartStore'
import { getGrandTotal, getShipping } from '../utils/shipping'
import PaymentStatusModal from '../components/PaymentStatusModal'
import { AlertCircle, ShoppingCart, Truck, ArrowLeft } from 'lucide-react'
import { Button, FormInput, Card } from '../components/ui'

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
    <div className="min-h-screen bg-night text-chalk font-barlow">
      {/* ── Hero ── */}
      <section className="bg-gradient-to-r from-ink via-ash to-ink border-b border-white/5 px-[6%] py-12">
        <div className="max-w-5xl mx-auto relative z-10">
          <Link to="/cart" className="inline-flex items-center gap-2 text-accent light:text-accent-light text-sm mb-4 no-underline hover:underline font-barlow-condensed font-bold">
            <ArrowLeft size={14} /> Back to Cart
          </Link>
          <div className="inline-flex items-center gap-2 font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-accent light:text-accent-light mb-3 before:block before:w-5 before:h-0.5 before:bg-accent light:before:bg-accent-light">
            Complete Your Order
          </div>
          <h1 className="font-bebas text-4xl text-chalk letter-spacing-tighter">
            SECURE <span className="text-accent light:text-accent-light">CHECKOUT</span>
          </h1>
        </div>
      </section>

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
                    DELIVERY <span className="text-accent light:text-accent-light">INFO</span>
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
                        className="w-full bg-smoke border border-white/10 text-chalk font-barlow text-base px-4 py-3 outline-none transition-all duration-200 focus:border-accent/50 light:focus:border-accent-light/50 resize-none"
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
                    {shipping === 0 ? 'Free Delivery' : `Delivery — KES ${shipping}`}
                  </p>
                  <p className="text-chalk/70">Orders over KES 3,000 qualify for free delivery. Delivered within 2-3 business days after payment confirmation.</p>
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
                  ORDER <span className="text-accent light:text-accent-light">SUMMARY</span>
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
                      <p className="font-bebas text-lg text-accent light:text-accent-light flex-shrink-0">
                        {(Number(item.product.price) * item.quantity).toFixed(0)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Pricing */}
                <div className="space-y-3 mb-6 pb-6 border-b border-white/10 text-sm">
                  <div className="flex justify-between text-fog">
                    <span>Subtotal</span>
                    <span>KES {subtotal.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-fog">
                    <span>Delivery</span>
                    <span className={shipping === 0 ? 'font-barlow-condensed font-bold text-success-green' : 'text-chalk'}>
                      {shipping === 0 ? 'FREE' : `KES ${shipping}`}
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-baseline mb-6">
                  <span className="font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase text-fog">Total</span>
                  <span className="font-bebas text-4xl text-accent light:text-accent-light letter-spacing-tighter">
                    {grandTotal.toFixed(0)}
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
                <h4 className="font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase text-chalk mb-2">
                  {badge.title}
                </h4>
                <p className="text-xs text-fog">{badge.desc}</p>
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
