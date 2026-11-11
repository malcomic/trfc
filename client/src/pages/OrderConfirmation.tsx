import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { getOrderById, formatDeliveryDate, DELIVERY_RULE, downloadOrderReceipt, receiptNumberFor } from '../api/orders'
import { pollPaymentStatus } from '../api/payments'
import { AlertCircle, CheckCircle, Clock, Download, Printer } from 'lucide-react'
import { pageRoot, cardSurface, inputField } from '../utils/themeClasses'
import { MPESA_PHONE_ERROR, MPESA_PHONE_PLACEHOLDER, toKenyanMsisdn } from '../utils/phone'
import { identifyTikTokUser, trackCompletePayment } from '../utils/tiktokPixel'
import { trackMetaPurchase } from '../utils/metaPixel'
import { formatSelectedOptions } from '../utils/productOptions'
import GuestSignupCard from '../components/guest/GuestSignupCard'

interface Order {
  id: string
  items?: {
    product_id: string
    product_name?: string
    quantity: number
    unit_price: number
    size?: string | null
    distance?: string | null
  }[]
  total_amount: number
  payment_status: string
  status?: string
  mpesa_receipt: string | null
  phone?: string
  email?: string | null
  delivery_address?: string
  delivery_date?: string | null
  checkout_request_id?: string
  created_at: string
  receipt_qr?: string
  receipt_url?: string
}

export default function OrderConfirmation() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const navState = (location.state as { phone?: string; email?: string } | null) ?? {}
  const phoneFromState = navState.phone
  const [phone, setPhone] = useState(phoneFromState || '')
  const [phonePrompt, setPhonePrompt] = useState(!phoneFromState)
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'failed'>('pending')
  const [downloading, setDownloading] = useState(false)
  const [receiptError, setReceiptError] = useState('')

  const handleDownloadReceipt = async () => {
    if (!order) return
    try {
      setDownloading(true)
      setReceiptError('')
      await downloadOrderReceipt(order.id, phone || order.phone)
    } catch {
      setReceiptError('Could not download the receipt. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

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

  useEffect(() => {
    if (paymentStatus !== 'paid' || !order) return
    identifyTikTokUser({ email: order.email ?? navState.email, phone: order.phone || phone })
    trackCompletePayment(`order_${order.id}`, {
      contents: (order.items ?? []).map((item) => ({
        content_id: String(item.product_id),
        content_type: 'product' as const,
        content_name: item.product_name,
        quantity: item.quantity,
      })),
      value: Number(order.total_amount),
    })
    trackMetaPurchase(
      order.checkout_request_id || `order_${order.id}`,
      Number(order.total_amount),
      (order.items ?? []).map((item) => ({
        id: String(item.product_id),
        quantity: item.quantity,
        item_price: Number(item.unit_price),
      }))
    )
  }, [paymentStatus, order])

  const handlePhoneVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    const msisdn = toKenyanMsisdn(phone)
    if (!msisdn) {
      setError(MPESA_PHONE_ERROR)
      return
    }
    try {
      setLoading(true)
      setError('')
      setPhone(msisdn)
      await fetchOrder(msisdn)
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
              placeholder={MPESA_PHONE_PLACEHOLDER}
              className={`w-full px-4 py-3 ${inputField}`}
            />
            <button type="submit" className="w-full bg-cta text-cta-ink py-3 font-barlow-condensed font-black text-sm tracking-widest uppercase clip-angled hover:bg-cta/90">
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
            <button onClick={() => navigate('/shop')} className="bg-cta text-cta-ink px-4 py-2 clip-angled-sm">Back to Shop</button>
          </div>
        </div>
      </div>
    )
  }

  const confirmationEmail = order.email || navState.email

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
              ? confirmationEmail
                ? `Your payment has been received. A confirmation was sent to ${confirmationEmail}.`
                : 'Your payment has been received and your order is being processed.'
              : 'Complete the M-Pesa payment on your phone to confirm your order.'}
          </p>
        </div>

        <div className={`${cardSurface} p-6 mb-6 space-y-3 text-sm`}>
          <h2 className="font-barlow-condensed font-bold text-accent light:text-accent-light tracking-widest uppercase mb-4">Order Details</h2>
          <div className="flex justify-between"><span className="text-fog light:text-fog-light">Order ID</span><span className="font-mono">{order.id.slice(0, 8)}…</span></div>
          <div className="flex justify-between"><span className="text-fog light:text-fog-light">Date</span><span>{new Date(order.created_at).toLocaleDateString()}</span></div>
          <div className="flex justify-between"><span className="text-fog light:text-fog-light">Status</span><span className="text-accent light:text-accent-light font-bold uppercase">{paymentStatus}</span></div>
          {order.mpesa_receipt && <div className="flex justify-between"><span className="text-fog light:text-fog-light">M-Pesa Receipt</span><span className="font-mono">{order.mpesa_receipt}</span></div>}
          {order.delivery_date && (
            <div className="flex justify-between gap-4">
              <span className="text-fog light:text-fog-light">Delivery</span>
              <span className="text-right font-bold">{formatDeliveryDate(order.delivery_date)}</span>
            </div>
          )}
          <p className="text-xs text-fog light:text-fog-light">{DELIVERY_RULE}</p>
        </div>

        {order.delivery_address && (
          <div className={`${cardSurface} p-6 mb-6 text-sm`}>
            <h2 className="font-barlow-condensed font-bold text-accent light:text-accent-light tracking-widest uppercase mb-4">Delivery</h2>
            {order.phone && <p className="mb-2"><span className="text-fog light:text-fog-light">Phone: </span>{order.phone}</p>}
            {order.email && <p className="mb-2 break-all"><span className="text-fog light:text-fog-light">Email: </span>{order.email}</p>}
            <p><span className="text-fog light:text-fog-light">Address: </span>{order.delivery_address}</p>
          </div>
        )}

        {order.items && order.items.length > 0 && (
          <div className={`${cardSurface} p-6 mb-6 text-sm`}>
            <h2 className="font-barlow-condensed font-bold text-accent light:text-accent-light tracking-widest uppercase mb-4">Items</h2>
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-white/5 light:border-black/8 last:border-0">
                <span>
                  {item.product_name || 'Product'} × {item.quantity}
                  {formatSelectedOptions(item) && (
                    <span className="block text-xs text-fog light:text-fog-light mt-0.5">{formatSelectedOptions(item)}</span>
                  )}
                </span>
                <span>KES {(item.unit_price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        <div className={`${cardSurface} p-6 mb-6 flex justify-between font-bebas text-3xl text-accent light:text-accent-light`}>
          <span>Total</span>
          <span>KES {Number(order.total_amount).toLocaleString()}</span>
        </div>

        {paymentStatus === 'paid' && order.receipt_qr && (
          <div className={`${cardSurface} p-6 mb-6 text-sm print:shadow-none`}>
            <h2 className="font-barlow-condensed font-bold text-accent light:text-accent-light tracking-widest uppercase mb-4">Your Receipt</h2>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="bg-white p-2 shrink-0">
                <img src={order.receipt_qr} alt="Receipt QR code" className="w-36 h-36" />
              </div>
              <div className="flex-1 w-full">
                <p className="text-fog light:text-fog-light text-xs uppercase tracking-widest">Receipt No.</p>
                <p className="font-mono text-2xl font-bold mb-2">{receiptNumberFor(order.id)}</p>
                <p className="text-fog light:text-fog-light text-xs mb-4">
                  Scan the QR code to verify this receipt. Show it when collecting or receiving your order.
                </p>
                {receiptError && <p className="text-red-400 text-xs mb-3">{receiptError}</p>}
                <div className="flex gap-3 print:hidden">
                  <button
                    onClick={handleDownloadReceipt}
                    disabled={downloading}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-cta text-cta-ink py-2.5 clip-angled-sm font-barlow-condensed font-black text-xs tracking-widest uppercase hover:bg-cta/90 disabled:opacity-60"
                  >
                    <Download className="w-4 h-4" />
                    {downloading ? 'Preparing…' : 'Download PDF'}
                  </button>
                  <button
                    onClick={() => window.print()}
                    className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 font-barlow-condensed font-bold text-xs tracking-widest uppercase hover:border-accent light:hover:border-accent-light ${inputField}`}
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {paymentStatus === 'paid' && (
          <GuestSignupCard kind="order" email={confirmationEmail} phone={order.phone || phone} />
        )}

        <div className="flex gap-3 print:hidden">
          <button onClick={() => navigate('/shop')} className="flex-1 bg-cta text-cta-ink py-3 clip-angled font-barlow-condensed font-black text-sm tracking-widest uppercase hover:bg-cta/90">
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
