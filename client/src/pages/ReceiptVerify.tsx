import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle, PackageCheck } from 'lucide-react'
import { verifyOrderReceipt, PublicReceipt } from '../api/orders'
import { pageRoot, cardSurface } from '../utils/themeClasses'
import { formatSelectedOptions } from '../utils/productOptions'

type State =
  | { status: 'loading' }
  | { status: 'invalid' }
  | { status: 'ok'; valid: boolean; receipt: PublicReceipt }

const kes = (value: number) => `KES ${Number(value).toLocaleString('en-KE')}`

export default function ReceiptVerify() {
  const { orderId } = useParams()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('t') || ''
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    if (!orderId || !token) {
      setState({ status: 'invalid' })
      return
    }
    let cancelled = false
    verifyOrderReceipt(orderId, token)
      .then((data) => {
        if (!cancelled) setState({ status: 'ok', valid: data.valid, receipt: data.receipt })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'invalid' })
      })
    return () => {
      cancelled = true
    }
  }, [orderId, token])

  if (state.status === 'loading') {
    return (
      <div className={`${pageRoot} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent light:border-accent-light mx-auto mb-4" />
          <p className="text-fog light:text-fog-light">Verifying receipt...</p>
        </div>
      </div>
    )
  }

  if (state.status === 'invalid') {
    return (
      <div className={`${pageRoot} py-16 px-6`}>
        <div className="max-w-xl mx-auto bg-red-500/10 border-l-4 border-red-500 p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <h1 className="font-bebas text-3xl">Invalid Receipt</h1>
          </div>
          <p className="text-fog light:text-fog-light text-sm mb-4">
            This QR code does not match any TRFC receipt. If you think this is a mistake, contact TRFC support.
          </p>
          <Link to="/shop" className="inline-block bg-cta text-cta-ink px-4 py-2 clip-angled-sm font-barlow-condensed font-black text-xs tracking-widest uppercase">
            Visit the Shop
          </Link>
        </div>
      </div>
    )
  }

  const { receipt, valid } = state

  return (
    <div className={`${pageRoot} py-12 px-6`}>
      <div className="max-w-xl mx-auto">
        <div className={`p-6 mb-6 border-l-4 ${valid ? 'bg-green-500/10 border-green-500' : 'bg-accent/10 light:bg-accent-light/10 border-accent light:border-accent-light'}`}>
          <div className="flex items-center gap-3 mb-2">
            {valid ? <CheckCircle className="w-6 h-6 text-green-400" /> : <AlertCircle className="w-6 h-6 text-accent light:text-accent-light" />}
            <h1 className="font-bebas text-3xl">{valid ? 'Genuine TRFC Receipt' : 'Payment Not Confirmed'}</h1>
          </div>
          <p className="text-fog light:text-fog-light text-sm">
            {valid
              ? 'This receipt was issued by Thika Road Fitness Community for a paid order.'
              : `This order exists but its payment status is ${receipt.payment_status}.`}
          </p>
        </div>

        <div className={`${cardSurface} p-6 mb-6 space-y-3 text-sm`}>
          <div className="flex justify-between"><span className="text-fog light:text-fog-light">Receipt No.</span><span className="font-mono font-bold">{receipt.receipt_number}</span></div>
          <div className="flex justify-between"><span className="text-fog light:text-fog-light">Date</span><span>{new Date(receipt.created_at).toLocaleString('en-KE')}</span></div>
          <div className="flex justify-between"><span className="text-fog light:text-fog-light">Status</span><span className="font-bold uppercase">{receipt.payment_status}</span></div>
          {receipt.mpesa_receipt && (
            <div className="flex justify-between"><span className="text-fog light:text-fog-light">M-Pesa</span><span className="font-mono">{receipt.mpesa_receipt}</span></div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-fog light:text-fog-light">Collection</span>
            {receipt.collected_at ? (
              <span className="inline-flex items-center gap-1 text-green-400 font-bold">
                <PackageCheck className="w-4 h-4" />
                Collected {new Date(receipt.collected_at).toLocaleDateString('en-KE')}
              </span>
            ) : (
              <span>Not yet collected</span>
            )}
          </div>
        </div>

        <div className={`${cardSurface} p-6 mb-6 text-sm`}>
          <h2 className="font-barlow-condensed font-bold text-accent light:text-accent-light tracking-widest uppercase mb-4">Items</h2>
          {receipt.items.map((item, i) => (
            <div key={i} className="flex justify-between py-2 border-b border-white/5 light:border-black/8 last:border-0">
              <span>
                {item.name} × {item.quantity}
                {formatSelectedOptions(item) && (
                  <span className="block text-xs text-fog light:text-fog-light mt-0.5">{formatSelectedOptions(item)}</span>
                )}
              </span>
              <span>{kes(item.unit_price * item.quantity)}</span>
            </div>
          ))}
          <div className="pt-3 mt-2 space-y-1">
            {receipt.member_discount > 0 && (
              <div className="flex justify-between text-fog light:text-fog-light"><span>Member discount</span><span>- {kes(receipt.member_discount)}</span></div>
            )}
            <div className="flex justify-between text-fog light:text-fog-light"><span>Delivery</span><span>{receipt.delivery_fee > 0 ? kes(receipt.delivery_fee) : 'Free'}</span></div>
          </div>
        </div>

        <div className={`${cardSurface} p-6 flex justify-between font-bebas text-3xl text-accent light:text-accent-light`}>
          <span>Total</span>
          <span>{kes(receipt.total_amount)}</span>
        </div>
      </div>
    </div>
  )
}
