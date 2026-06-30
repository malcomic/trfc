import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { getOrderById } from '../api/orders'
import { pollPaymentStatus } from '../api/payments'
import { AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { pageRoot, cardSurface, inputField } from '../utils/themeClasses'

interface Order {
  id: string
  items?: { product_id: string; product_name?: string; quantity: number; unit_price: number }[]
  total_amount: number
  payment_status: string
  status?: string
  mpesa_receipt: string | null
  phone?: string
  delivery_address?: string
  checkout_request_id?: string
  created_at: string
}

export default function OrderConfirmation() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const phoneFromState = (location.state as { phone?: string })?.phone
  const [phone, setPhone] = useState(phoneFromState || '')
  const [phonePrompt, setPhonePrompt] = useState(!phoneFromState)
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'failed'>('pending')

  const fetchOrder = async (verifyPhone?: string) => {
    if (!orderId) return
    const data = await getOrderById(orderId, verifyPhone)
    setOrder(data)
    const status = data.payment_status || data.status
    setPaymentStatus(status === 'paid' ? 'paid' : 'pending')
    return data
  }

  useEffect(() => {
    if (!orderId || phonePrompt) {
      setLoading(false)
      return
    }

    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const orderData = await fetchOrder(phone)
        if (orderData?.checkout_request_id && orderData.payment_status === 'pending') {
          try {
            await pollPaymentStatus(orderData.checkout_request_id)
            await fetchOrder(phone)
            setPaymentStatus('paid')
          } catch {
            /* polling timeout is ok */
          }
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load order')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [orderId, phone, phonePrompt])

  const handlePhoneVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^254\d{9}$/.test(phone.replace(/\s+/g, ''))) {
      setError('Enter a valid phone number (254XXXXXXXXX)')
      return
    }
    try {
      setLoading(true)
      setError('')
      await fetchOrder(phone)
      setPhonePrompt(false)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not verify order')
    } finally {
      setLoading(false)
    }
  }

  if (phonePrompt && !phoneFromState) {
    return (
      <div className={`${pageRoot} py-16 px-6`}>
        <div className={`max-w-md mx-auto ${cardSurface} p-8`}>
          <h1 className="font-bebas text-4xl mb-2 text-chalk light:text-chalk-light">ORDER <span className="text-accent light:text-accent-light">CONFIRMATION</span></h1>
          <p className="text-fog light:text-fog-light text-sm mb-6">Enter the phone number used at checkout to view your order details.</p>
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <form onSubmit={handlePhoneVerify} className="space-y-4">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\s+/g, ''))}
              placeholder="254712345678"
              className={`w-full px-4 py-3 ${inputField}`}
            />
            <button type="submit" className="w-full bg-accent light:bg-accent-light text-black light:text-white py-3 font-barlow-condensed font-black text-sm tracking-widest uppercase clip-angled hover:bg-accent/90 light:hover:bg-accent-light/90">
              View Order
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`${pageRoot} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent light:border-accent-light mx-auto mb-4" />
          <p className="text-fog light:text-fog-light">Loading your order...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className={`${pageRoot} py-16 px-6`}>
        <div className="max-w-2xl mx-auto bg-red-500/10 border border-red-500/20 p-6 flex gap-4">
          <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-red-300 mb-4">{error || 'Order not found'}</p>
            <button onClick={() => navigate('/shop')} className="bg-accent light:bg-accent-light text-black light:text-white px-4 py-2 clip-angled-sm">Back to Shop</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${pageRoot} py-12 px-6`}>
      <div className="max-w-2xl mx-auto">
        <div className={`rounded-none p-6 mb-6 border-l-4 ${paymentStatus === 'paid' ? 'bg-green-500/10 border-green-500' : 'bg-accent/10 light:bg-accent-light/10 border-accent light:border-accent-light'}`}>
          <div className="flex items-center gap-3 mb-2">
            {paymentStatus === 'paid' ? <CheckCircle className="w-6 h-6 text-green-400" /> : <Clock className="w-6 h-6 text-accent light:text-accent-light" />}
            <h1 className="font-bebas text-3xl">{paymentStatus === 'paid' ? 'Order Confirmed!' : 'Payment Pending'}</h1>
          </div>
          <p className="text-fog light:text-fog-light text-sm">
            {paymentStatus === 'paid'
              ? 'Your payment has been received and your order is being processed.'
              : 'Complete the M-Pesa payment on your phone to confirm your order.'}
          </p>
        </div>

        <div className={`${cardSurface} p-6 mb-6 space-y-3 text-sm`}>
          <h2 className="font-barlow-condensed font-bold text-accent light:text-accent-light tracking-widest uppercase mb-4">Order Details</h2>
          <div className="flex justify-between"><span className="text-fog light:text-fog-light">Order ID</span><span className="font-mono">{order.id.slice(0, 8)}…</span></div>
          <div className="flex justify-between"><span className="text-fog light:text-fog-light">Date</span><span>{new Date(order.created_at).toLocaleDateString()}</span></div>
          <div className="flex justify-between"><span className="text-fog light:text-fog-light">Status</span><span className="text-accent light:text-accent-light font-bold uppercase">{paymentStatus}</span></div>
          {order.mpesa_receipt && <div className="flex justify-between"><span className="text-fog light:text-fog-light">M-Pesa Receipt</span><span className="font-mono">{order.mpesa_receipt}</span></div>}
        </div>

        {order.delivery_address && (
          <div className={`${cardSurface} p-6 mb-6 text-sm`}>
            <h2 className="font-barlow-condensed font-bold text-accent light:text-accent-light tracking-widest uppercase mb-4">Delivery</h2>
            {order.phone && <p className="mb-2"><span className="text-fog light:text-fog-light">Phone: </span>{order.phone}</p>}
            <p><span className="text-fog light:text-fog-light">Address: </span>{order.delivery_address}</p>
          </div>
        )}

        {order.items && order.items.length > 0 && (
          <div className={`${cardSurface} p-6 mb-6 text-sm`}>
            <h2 className="font-barlow-condensed font-bold text-accent light:text-accent-light tracking-widest uppercase mb-4">Items</h2>
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-white/5 light:border-black/8 last:border-0">
                <span>{item.product_name || 'Product'} × {item.quantity}</span>
                <span>KES {(item.unit_price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        <div className={`${cardSurface} p-6 mb-6 flex justify-between font-bebas text-3xl text-accent light:text-accent-light`}>
          <span>Total</span>
          <span>KES {Number(order.total_amount).toLocaleString()}</span>
        </div>

        <div className="flex gap-3">
          <button onClick={() => navigate('/shop')} className="flex-1 bg-accent light:bg-accent-light text-black light:text-white py-3 clip-angled font-barlow-condensed font-black text-sm tracking-widest uppercase hover:bg-accent/90 light:hover:bg-accent-light/90">
            {paymentStatus === 'paid' ? 'Continue Shopping' : 'Back to Shop'}
          </button>
          {paymentStatus === 'pending' && (
            <button onClick={() => window.location.reload()} className={`flex-1 py-3 font-barlow-condensed font-bold text-sm hover:border-accent light:hover:border-accent-light ${inputField}`}>
              Refresh Status
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
