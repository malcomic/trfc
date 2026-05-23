import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Loader, Phone, MapPin, Package } from 'lucide-react'
import { CartItem } from '../types'
import { createOrder } from '../api/orders'
import { initiateSTKPush, pollPaymentStatus } from '../api/payments'
import PaymentStatusModal from '../components/PaymentStatusModal'

interface OrderData {
  items: CartItem[]
  total_amount: number
}

export default function ProductCheckout() {
  const navigate = useNavigate()
  const location = useLocation()
  const orderData = location.state as OrderData | undefined

  const items = orderData?.items || []
  const total = orderData?.total_amount || 0
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [checkoutRequestId, setCheckoutRequestId] = useState('')
  const [paymentLoading, setPaymentLoading] = useState(false)

  useEffect(() => {
    if (!items.length) {
      navigate('/products')
    }
  }, [items.length, navigate])

  const validatePhone = (value: string): boolean => {
    const kenyanPhoneRegex = /^254[0-9]{9}$/
    return kenyanPhoneRegex.test(value.replace(/\s+/g, ''))
  }

  const formatPhoneNumber = (value: string): string => {
    return value.replace(/\s+/g, '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!phone.trim()) {
      setError('Phone number is required')
      return
    }

    if (!validatePhone(phone)) {
      setError('Please enter a valid Kenyan phone number (254XXXXXXXXX)')
      return
    }

    if (!address.trim()) {
      setError('Delivery address is required')
      return
    }

    try {
      setLoading(true)

      const formattedPhone = formatPhoneNumber(phone)
      const orderPayload = {
        items: items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.price,
        })),
        total_amount: total,
        phone: formattedPhone,
        delivery_address: address,
      }

      const order = await createOrder(orderPayload)

      const paymentPayload = {
        phone: formattedPhone,
        amount: Math.round(total),
        orderId: order.id,
      }

      const paymentResponse = await initiateSTKPush(paymentPayload)
      setCheckoutRequestId(paymentResponse.checkoutRequestId)
      setShowPaymentModal(true)

      setPaymentLoading(true)
      try {
        await pollPaymentStatus(paymentResponse.checkoutRequestId)
        setPaymentLoading(false)
        setSuccess(true)

        setTimeout(() => {
          navigate('/payment-history')
        }, 2000)
      } catch (pollError: any) {
        setPaymentLoading(false)
        setError(
          pollError.message ||
            'Payment status check failed. Please verify in your payment history.'
        )
        setShowPaymentModal(false)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to initiate payment')
    } finally {
      setLoading(false)
    }
  }

  if (!items.length) {
    return null
  }

  return (
    <div className="min-h-screen py-12 px-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-primary hover:underline mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to shopping
          </button>
          <h1 className="text-4xl font-bold mb-2">Checkout</h1>
          <p className="text-gray-600">Review your order and complete payment</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Package className="w-6 h-6" />
                Order Summary
              </h2>

              <div className="space-y-4 mb-6 border-b pb-6">
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex justify-between items-start p-4 bg-gray-50 rounded"
                  >
                    <div>
                      <p className="font-semibold">{item.product.name}</p>
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-semibold">
                      KES {(item.product.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total Amount:</span>
                <span className="text-primary text-2xl">KES {total.toFixed(2)}</span>
              </div>
            </div>

            {/* Delivery Information */}
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-6">Delivery Information</h2>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-700 font-semibold mb-1">Error</p>
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex gap-3">
                  <Package className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-green-700 font-semibold">Payment Successful!</p>
                    <p className="text-green-600 text-sm">
                      Your order has been confirmed. Redirecting...
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4 mb-6">
                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Phone Number (M-Pesa)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="254XXXXXXXXX"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                      disabled={loading || paymentLoading}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Enter your M-Pesa phone number</p>
                </div>

                {/* Delivery Address */}
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Delivery Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter your delivery address"
                      rows={3}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary resize-none"
                      disabled={loading || paymentLoading}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || paymentLoading}
                className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-opacity-90 disabled:bg-gray-400 transition flex items-center justify-center gap-2"
              >
                {loading || paymentLoading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Pay with M-Pesa'
                )}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                You will be prompted to enter your M-Pesa PIN on your phone
              </p>
            </form>
          </div>

          {/* Order Info Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-20">
              <h3 className="font-bold mb-4">Order Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Items:</span>
                  <span className="font-semibold">{items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold">KES {total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="font-bold">Total:</span>
                  <span className="font-bold text-primary text-lg">
                    KES {total.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-4 mt-6 text-xs">
                <p className="font-semibold text-blue-900 mb-2">Secure Payment</p>
                <p className="text-blue-800">
                  Your payment is secured through M-Pesa. You will receive a confirmation
                  on your phone.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Status Modal */}
      <PaymentStatusModal
        isOpen={showPaymentModal}
        checkoutRequestId={checkoutRequestId}
        phone={phone}
        onClose={() => setShowPaymentModal(false)}
      />
    </div>
  )
}
