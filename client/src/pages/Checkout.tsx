import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { createOrder } from '../api/orders'
import { initiateSTKPush } from '../api/payments'
import { useCart } from '../store/cartStore'
import { AlertCircle, Loader, ShoppingCart, Truck } from 'lucide-react'

export default function Checkout() {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const navigate = useNavigate()
  const { items, getTotal, clearCart } = useCart()
  const total = getTotal()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (items.length === 0) {
    return (
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-4">Checkout</h1>
          <p className="text-gray-600 mb-6">Your cart is empty</p>
          <button
            onClick={() => navigate('/shop')}
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-opacity-90 font-semibold"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    )
  }

  const onSubmit = async (data: any) => {
    try {
      setLoading(true)
      setError('')

      // Format items for API
      const orderItems = items.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
      }))

      // Create order
      const order = {
        items: orderItems,
        total_amount: total,
        phone: data.phone,
        delivery_address: data.address,
      }

      const createdOrder = await createOrder(order)

      // Initiate M-Pesa payment
      const paymentResponse = await initiateSTKPush({
        phone: data.phone,
        amount: Math.round(total),
        orderId: createdOrder.id,
      })

      if (paymentResponse.checkoutRequestId) {
        // Payment initiated successfully
        clearCart()
        alert('M-Pesa prompt sent to your phone. Enter your PIN to complete payment.')
        navigate(`/order-confirmation/${createdOrder.id}`)
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

  return (
    <div className="min-h-screen py-12 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Checkout</h1>
          <p className="text-gray-600">Complete your purchase securely with M-Pesa</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg shadow-lg p-8 space-y-6">
              <h2 className="text-2xl font-bold mb-6">Delivery Information</h2>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-800 font-semibold">Payment Error</p>
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Phone Number <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    {...register('phone', {
                      required: 'Phone number is required',
                      pattern: {
                        value: /^254\d{9}$/,
                        message: 'Phone must be in format 254XXXXXXXXX',
                      },
                    })}
                    placeholder="254712345678"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                {errors.phone && (
                  <p className="text-red-600 text-sm mt-1">{errors.phone.message as string}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Format: 254712345678 (Kenya number)</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Delivery Address <span className="text-red-600">*</span>
                </label>
                <textarea
                  {...register('address', { required: 'Delivery address is required' })}
                  placeholder="E.g., 123 Main Street, Nairobi, Kenya"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 h-24 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                ></textarea>
                {errors.address && (
                  <p className="text-red-600 text-sm mt-1">{errors.address.message as string}</p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <Truck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Free Delivery</p>
                  <p>We will deliver your order to the address you provide within 2-3 business days after payment.</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Proceed to Payment'
                )}
              </button>

              <p className="text-xs text-gray-600 text-center">
                💡 After clicking "Proceed to Payment", an M-Pesa prompt will appear on your phone. Enter your M-Pesa PIN to complete the transaction.
              </p>
            </form>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-4">
              <h3 className="text-xl font-bold mb-6">Order Summary</h3>

              {/* Items List */}
              <div className="space-y-3 mb-6 pb-6 border-b">
                {items.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{item.product.name}</p>
                      <p className="text-gray-600 text-xs">
                        KES {(Number(item.product.price)).toFixed(2)} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold text-gray-800">
                      KES {(Number(item.product.price) * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Pricing Breakdown */}
              <div className="space-y-2 mb-6 pb-6 border-b text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>KES {total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery</span>
                  <span className="font-semibold text-green-600">Free</span>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between text-lg font-bold mb-6">
                <span>Total</span>
                <span className="text-primary text-2xl">KES {total.toFixed(2)}</span>
              </div>

              {/* Info Box */}
              <div className="bg-gray-50 p-4 rounded-lg text-xs text-gray-600 space-y-2">
                <p>
                  <strong>📍 Items:</strong> {items.length} item(s)
                </p>
                <p>
                  <strong>⏱️ Delivery:</strong> 2-3 business days
                </p>
                <p>
                  <strong>🔒 Secure:</strong> Powered by M-Pesa
                </p>
              </div>

              {/* Product List */}
              <div className="mt-6 pt-6 border-t">
                <p className="text-xs font-semibold text-gray-600 mb-3">ITEMS IN ORDER</p>
                <div className="space-y-2 text-xs">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-1">
                      <span className="text-gray-600">{idx + 1}. {item.product.name}</span>
                      <span className="font-mono text-gray-700">×{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Trust Badges */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="bg-white rounded-lg p-6">
            <div className="text-3xl mb-2">🔒</div>
            <h4 className="font-semibold mb-1">Secure Payment</h4>
            <p className="text-sm text-gray-600">M-Pesa encryption protects your data</p>
          </div>
          <div className="bg-white rounded-lg p-6">
            <div className="text-3xl mb-2">✓</div>
            <h4 className="font-semibold mb-1">Money-Back Guarantee</h4>
            <p className="text-sm text-gray-600">Unsatisfied? We'll refund you</p>
          </div>
          <div className="bg-white rounded-lg p-6">
            <div className="text-3xl mb-2">🚚</div>
            <h4 className="font-semibold mb-1">Fast Delivery</h4>
            <p className="text-sm text-gray-600">Free delivery within 2-3 business days</p>
          </div>
        </div>
      </div>
    </div>
  )
}
