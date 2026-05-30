import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { createOrder } from '../api/orders'
import { initiateSTKPush } from '../api/payments'
import { useCart } from '../store/cartStore'
import { getGrandTotal, getShipping } from '../utils/shipping'
import PaymentStatusModal from '../components/PaymentStatusModal'
import { AlertCircle, Loader, ShoppingCart, Truck, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

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
      <div className="min-h-screen bg-night text-chalk font-barlow">
        <div className="max-w-2xl mx-auto text-center px-6 py-24">
          <ShoppingCart className="w-16 h-16 text-fog mx-auto mb-4" />
          <h1 className="font-bebas text-5xl mb-4">CHECKOUT</h1>
          <p className="text-fog mb-6">Your cart is empty</p>
          <Link to="/shop" className="inline-flex bg-fire text-white px-6 py-3 clip-angled font-barlow-condensed font-black text-sm letter-spacing-widest text-transform-uppercase no-underline hover:bg-ember">
            Continue Shopping
          </Link>
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
      <section className="bg-ink border-b border-white/5 px-[6%] pt-14 pb-11">
        <div className="max-w-5xl mx-auto">
          <Link to="/cart" className="inline-flex items-center gap-2 text-fire text-sm mb-4 no-underline hover:underline font-barlow-condensed font-bold">
            <ArrowLeft size={14} /> Back to Cart
          </Link>
          <h1 className="font-bebas text-5xl text-chalk leading-tight">CHECK<span className="text-fire">OUT</span></h1>
          <p className="text-fog mt-2">Complete your purchase securely with M-Pesa</p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-[6%] py-10 pb-20 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="bg-ash border border-white/5 p-8 space-y-6">
            <h2 className="font-barlow-condensed font-bold text-xl letter-spacing-widest text-transform-uppercase text-fire">Delivery Information</h2>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 border-l-4 border-l-red-500 px-4 py-3 flex gap-3 text-sm">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-300">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold mb-2">Phone Number <span className="text-fire">*</span></label>
              <input
                type="tel"
                {...register('phone', {
                  required: 'Phone number is required',
                  pattern: { value: /^254\d{9}$/, message: 'Phone must be in format 254XXXXXXXXX' },
                })}
                placeholder="254712345678"
                className="w-full border border-white/10 rounded-none px-4 py-3 bg-smoke text-chalk placeholder-fog focus:outline-none focus:border-fire"
              />
              {errors.phone && <p className="text-red-400 text-sm mt-1">{errors.phone.message as string}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Delivery Address <span className="text-fire">*</span></label>
              <textarea
                {...register('address', { required: 'Delivery address is required' })}
                placeholder="E.g., 123 Main Street, Nairobi, Kenya"
                className="w-full border border-white/10 rounded-none px-4 py-3 h-24 bg-smoke text-chalk placeholder-fog focus:outline-none focus:border-fire resize-none"
              />
              {errors.address && <p className="text-red-400 text-sm mt-1">{errors.address.message as string}</p>}
            </div>

            <div className="bg-fire/10 border border-fire/15 p-4 flex gap-3 text-sm text-fog">
              <Truck className="w-5 h-5 text-fire flex-shrink-0" />
              <div>
                <p className="font-semibold text-chalk mb-1">{shipping === 0 ? 'Free Delivery' : `Delivery — KES ${shipping}`}</p>
                <p>Orders over KES 3,000 qualify for free delivery. Delivered within 2–3 business days after payment.</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-fire text-white py-3 font-barlow-condensed font-black text-sm letter-spacing-widest text-transform-uppercase clip-angled hover:bg-ember transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (<><Loader className="w-4 h-4 animate-spin" /> Processing...</>) : 'Proceed to Payment'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-ash border border-white/5 p-6 sticky top-20">
            <h3 className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire mb-6">Order Summary</h3>
            <div className="space-y-3 mb-6 pb-6 border-b border-white/5 text-sm">
              {items.map((item) => (
                <div key={item.product.id} className="flex justify-between">
                  <span className="text-fog">{item.product.name} × {item.quantity}</span>
                  <span className="text-chalk">KES {(Number(item.product.price) * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 mb-6 text-sm">
              <div className="flex justify-between text-fog"><span>Subtotal</span><span>KES {subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between text-fog">
                <span>Delivery</span>
                <span className={shipping === 0 ? 'text-green-400' : 'text-chalk'}>{shipping === 0 ? 'FREE' : `KES ${shipping}`}</span>
              </div>
            </div>
            <div className="flex justify-between font-bebas text-3xl text-fire">
              <span>Total</span>
              <span>KES {grandTotal.toLocaleString()}</span>
            </div>
          </div>
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
