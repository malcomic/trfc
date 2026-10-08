import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Zap, Clock } from 'lucide-react'
import { buildFlashLine, useCart } from '../store/cartStore'
import type { FlashSaleOffer, ProductSelection } from '../types'
import { ProductOptionsModal } from './ProductOptionsPicker'
import { allSizesSoldOut, optionsFromOffer, productHasOptions } from '../utils/productOptions'
import { formatTimeLeft } from '../utils/flashAccess'
import { getSafeImageUrl } from '../utils/imageUrl'

const PRODUCT_FALLBACK =
  'https://images.unsplash.com/photo-1556906781-9a412961a28d?w=500&q=80'

interface FlashSaleOffersProps {
  offers: FlashSaleOffer[]
  accessExpiresAt: string
  title?: string
  variant?: 'grid' | 'compact'
}

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}

function offerImage(offer: FlashSaleOffer) {
  const url = offer.product_image_url
  if (url && url.startsWith('data:')) return url
  return getSafeImageUrl(url, PRODUCT_FALLBACK)
}

export default function FlashSaleOffers({
  offers,
  accessExpiresAt,
  title = 'Ticket-holder exclusive',
  variant = 'grid',
}: FlashSaleOffersProps) {
  const compact = variant === 'compact'
  const navigate = useNavigate()
  const { setBuyNow } = useCart()
  const now = useNow()

  const expired = new Date(accessExpiresAt).getTime() <= now

  const [pickerOffer, setPickerOffer] = useState<FlashSaleOffer | null>(null)
  const closePicker = useCallback(() => setPickerOffer(null), [])

  const buyNow = (offer: FlashSaleOffer, quantity: number, selection?: ProductSelection) => {
    setBuyNow(buildFlashLine(offer, quantity, selection))
    setPickerOffer(null)
    navigate('/checkout?mode=buy-now')
  }

  const handleGet = (offer: FlashSaleOffer) => {
    if (expired || offer.sold_out) return
    if (productHasOptions(optionsFromOffer(offer))) {
      setPickerOffer(offer)
      return
    }
    buyNow(offer, 1)
  }

  return (
    <section>
      <div className={`flex items-end justify-between gap-4 flex-wrap ${compact ? 'mb-3' : 'mb-5'}`}>
        <div>
          <div className={`font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light flex items-center gap-2 ${compact ? 'mb-1' : 'mb-2'}`}>
            <Zap size={14} /> {title}
          </div>
          <h2 className={`font-bebas ${compact ? 'text-2xl' : 'text-4xl'} text-chalk light:text-chalk-light tracking-tight leading-none`}>
            2<sup className="text-[0.5em] align-super">ND</sup> EDITION{' '}
            <span className="text-accent light:text-accent-light">DROP</span>{' '}
            <span className={compact ? 'text-lg' : 'text-2xl'}>(Flash Sales)</span>
          </h2>
          <p className={`italic text-fog light:text-fog-light ${compact ? 'text-xs mt-1' : 'text-sm mt-2'}`}>
            Be the first to wear second edition before the official launch
          </p>
        </div>
        <p className={`flex items-center gap-2 font-barlow-condensed font-bold ${compact ? 'text-xs' : 'text-sm'} tracking-widest uppercase ${expired ? 'text-fog light:text-fog-light' : 'text-red-500 light:text-red-600'}`}>
          {expired ? (
            <>
              <Clock size={14} /> Access expired
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" aria-hidden="true" />
              LIVE Goes away after {formatTimeLeft(accessExpiresAt, now)}
            </>
          )}
        </p>
      </div>

      <div
        className={
          compact
            ? 'flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2'
            : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-0.5'
        }
      >
        {offers.map((offer) => {
          const regular = Number(offer.regular_price)
          const sale = Number(offer.sale_price)
          const pct = regular > sale ? Math.round(((regular - sale) / regular) * 100) : null
          const offerOptions = optionsFromOffer(offer)
          const sizesGone = allSizesSoldOut(offerOptions)
          const disabled = expired || offer.sold_out || sizesGone
          return (
            <div
              key={offer.id}
              className={`${compact ? 'w-40 flex-shrink-0 snap-start' : ''} bg-ash light:bg-ash-light border border-transparent hover:border-accent/30 light:hover:border-accent-light/30 transition-all duration-250`}
            >
              <div className={`relative ${compact ? 'aspect-[4/3]' : 'aspect-square'} overflow-hidden bg-smoke light:bg-smoke-light`}>
                <img
                  src={offerImage(offer)}
                  alt={offer.product_name}
                  className={`w-full h-full object-cover brightness-90 ${offer.sold_out ? 'grayscale opacity-60' : ''}`}
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src = PRODUCT_FALLBACK
                  }}
                />
                {pct != null && !offer.sold_out && (
                  <span className="absolute top-3 left-3 font-barlow-condensed font-black text-xs tracking-widest uppercase px-2.5 py-1 bg-accent light:bg-accent-light text-black light:text-white">
                    -{pct}%
                  </span>
                )}
                {offer.sold_out && (
                  <span className="absolute top-3 left-3 font-barlow-condensed font-black text-xs tracking-widest uppercase px-2.5 py-1 bg-smoke light:bg-smoke-light text-fog light:text-fog-light">
                    Sold out
                  </span>
                )}
              </div>
              <div className={`${compact ? 'px-3 py-3 gap-1' : 'px-4 py-4 gap-1.5'} flex flex-col border-t border-white/5 light:border-black/8`}>
                {offer.category_name && !compact && (
                  <p className="font-barlow-condensed font-bold text-[10px] tracking-widest uppercase text-fog light:text-fog-light">
                    {offer.category_name}
                  </p>
                )}
                <h3 className={`font-barlow-condensed font-bold ${compact ? 'text-sm line-clamp-1' : 'text-base line-clamp-2'} tracking-wide text-chalk light:text-chalk-light leading-snug`}>
                  {offer.product_name}
                </h3>
                <div className={`flex items-baseline ${compact ? 'gap-1.5 flex-wrap' : 'gap-2'}`}>
                  <span className={`font-bebas ${compact ? 'text-xl' : 'text-2xl'} text-accent light:text-accent-light tracking-wider`}>
                    KES {sale.toLocaleString()}
                  </span>
                  {regular > sale && (
                    <span className="text-xs text-fog light:text-fog-light line-through">KES {regular.toLocaleString()}</span>
                  )}
                </div>
                {offer.remaining != null && !offer.sold_out && (
                  <p className="text-xs text-fog light:text-fog-light">{offer.remaining} left at this price</p>
                )}
                <button
                  onClick={() => handleGet(offer)}
                  disabled={disabled}
                  className={`${compact ? 'mt-1 px-3 py-2' : 'mt-2 px-4 py-2.5'} flex items-center justify-center gap-2 font-barlow-condensed font-black text-xs tracking-widest uppercase clip-angled-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-accent light:bg-accent-light text-black light:text-white border border-accent light:border-accent-light hover:bg-accent/90 light:hover:bg-accent-light/90`}
                >
                  {offer.sold_out || sizesGone ? 'Sold out' : <><ShoppingCart size={14} /> Get my jersey</>}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <ProductOptionsModal
        open={pickerOffer != null}
        title={pickerOffer?.product_name ?? ''}
        priceLabel={pickerOffer ? `KES ${Number(pickerOffer.sale_price).toLocaleString()}` : undefined}
        source={pickerOffer ? optionsFromOffer(pickerOffer) : { variants: [], distanceOptions: [] }}
        productStock={Number(pickerOffer?.product_stock ?? 0)}
        maxQuantity={pickerOffer?.remaining ?? null}
        confirmLabel="Get my jersey"
        onClose={closePicker}
        onConfirm={(selection, quantity) => pickerOffer && buyNow(pickerOffer, quantity, selection)}
      />
    </section>
  )
}
