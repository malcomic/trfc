import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getOrderById } from '../api/orders'
import { pollPaymentStatus } from '../api/payments'
import { AlertCircle, CheckCircle, Clock } from 'lucide-react'

interface OrderItem {
  product_id: string
  quantity: number
  unit_price: number
}

interface Order {
  id: string
  items?: OrderItem[]
  total_amount: number
  payment_status: string
  mpesa_receipt: string | null
  phone: string
  delivery_address: string
  created_at: string
}

export default function OrderConfirmation() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'failed'>(
    'pending'
  )

  useEffect(() => {
    const fetchOrderAndPollPayment = async () => {
      try {
        setLoading(true)
        setError('')

        if (!orderId) {
          setError('Order ID not found')
          setLoading(false)
          return
        }

        const orderData = await getOrderById(orderId)
        setOrder(orderData)

        if (orderData.payment_status === 'paid') {
          setPaymentStatus('paid')
        } else {
          setPaymentStatus('pending')
        }

        if (orderData.checkout_request_id && orderData.payment_status === 'pending') {
          try {
            await pollPaymentStatus(orderData.checkout_request_id)
            const updatedOrder = await getOrderById(orderId)
            setOrder(updatedOrder)
            setPaymentStatus('paid')
          } catch (err) {
            console.log('Payment polling completed or timed out')
          }
        }
      } catch (err: any) {
        console.error('Error fetching order:', err)
        setError(err.response?.data?.error || 'Failed to load order')
      } finally {
        setLoading(false)
      }
    }

    fetchOrderAndPollPayment()
  }, [orderId])

  if (loading) {
    return (
      <div className="min-h-screen py-12 px-4 flex items-center justify-center bg-white dark:bg-[#1C1C1C]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your order...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen py-12 px-4 bg-white dark:bg-[#1C1C1C]">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 flex gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">Error</h3>
              <p className="text-red-700 dark:text-red-400 mb-4">{error || 'Order not found'}</p>
              <button
                onClick={() => navigate('/shop')}
                className="bg-red-600 dark:bg-red-700 text-white px-4 py-2 rounded hover:bg-red-700 dark:hover:bg-red-800"
              >
                Back to Shop
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-4 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto">
        {/* Status Card */}
        <div
          className={`rounded-lg p-6 mb-6 text-white ${
            paymentStatus === 'paid' ? 'bg-green-600 dark:bg-green-700' : 'bg-blue-600 dark:bg-blue-700'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            {paymentStatus === 'paid' ? (
              <CheckCircle className="w-6 h-6" />
            ) : (
              <Clock className="w-6 h-6" />
            )}
            <h1 className="text-2xl font-bold">
              {paymentStatus === 'paid' ? 'Order Confirmed!' : 'Payment Pending'}
            </h1>
          </div>
          <p className="text-sm opacity-90">
            {paymentStatus === 'paid'
              ? 'Your payment has been received and your order is being processed.'
              : 'Your order has been created. Please complete the M-Pesa payment on your phone.'}
          </p>
        </div>

        {/* Order Details */}
        <div className="bg-white dark:bg-[#1C1C1C] rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Order Details</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Order ID:</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-white">{order.id.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Date:</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(order.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  paymentStatus === 'paid'
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                    : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                }`}
              >
                {paymentStatus === 'paid' ? 'PAID' : 'PENDING'}
              </span>
            </div>
            {order.mpesa_receipt && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">M-Pesa Receipt:</span>
                <span className="font-mono text-sm text-gray-900 dark:text-white">{order.mpesa_receipt}</span>
              </div>
            )}
          </div>
        </div>

        {/* Delivery Information */}
        <div className="bg-white dark:bg-[#1C1C1C] rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Delivery Information</h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-1">Phone Number:</p>
              <p className="font-semibold text-gray-900 dark:text-white">{order.phone}</p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-1">Delivery Address:</p>
              <p className="font-semibold text-gray-900 dark:text-white">{order.delivery_address}</p>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white dark:bg-[#1C1C1C] rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Order Summary</h2>
          <div className="space-y-2 text-sm mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
              <span className="text-gray-900 dark:text-white">KES {order.total_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Delivery:</span>
              <span className="text-gray-900 dark:text-white">Free</span>
            </div>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span className="text-gray-900 dark:text-white">Total Amount:</span>
            <span className="text-primary">KES {order.total_amount.toFixed(2)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {paymentStatus === 'paid' && (
            <button
              onClick={() => navigate('/shop')}
              className="flex-1 bg-primary text-white py-3 rounded-lg hover:bg-opacity-90 font-semibold"
            >
              Continue Shopping
            </button>
          )}
          {paymentStatus === 'pending' && (
            <>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-primary text-white py-3 rounded-lg hover:bg-opacity-90 font-semibold"
              >
                Refresh Status
              </button>
              <button
                onClick={() => navigate('/shop')}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white py-3 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold"
              >
                Back to Shop
              </button>
            </>
          )}
        </div>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
          You will receive an SMS confirmation once your payment is received and your order
          is shipped.
        </p>
      </div>
    </div>
  )
}
