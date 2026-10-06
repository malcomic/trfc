import { useEffect, useRef, useState } from 'react'
import { Check, ShoppingCart, Zap, Clock } from 'lucide-react'
import { useCart } from '../store/cartStore'
import type { FlashSaleOffer } from '../types'
import { formatTimeLeft } from '../utils/flashAccess'
import { getSafeImageUrl } from '../utils/imageUrl'
import { cardSurface } from '../utils/themeClasses'

const PRODUCT_FALLBACK =
  'https://images.unsplash.com/photo-1556906781-9a412961a28d?w=500&q=80'

interface FlashSaleOffersProps {
  offers: FlashSaleOffer[]
  accessExpiresAt: string
  title?: string
  variant?: 'grid' | 'compact'
}

interface Toast { id: number; name: string }

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
  const { addFlashItem } = useCart()
  const now = useNow()
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)

  const expired = new Date(accessExpiresAt).getTime() <= now

  const handleAdd = (offer: FlashSaleOffer) => {
    if (expired || offer.sold_out) return
    addFlashItem(offer, 1)

    setAddedIds((prev) => new Set(prev).add(offer.id))
    window.setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev)
        next.delete(offer.id)
        return next
      })
    }, 1500)

    const id = ++toastId.current
    setToasts((prev) => [...prev, { id, name: offer.product_name }])
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000)
  }

  return (
    <section>
      <div className={`flex items-end justify-between gap-4 flex-wrap ${compact ? 'mb-3' : 'mb-5'}`}>
        <div>
          <div className={`font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light flex items-center gap-2 ${compact ? 'mb-1' : 'mb-2'}`}>
            <Zap size={14} /> {title}
          </div>
          <h2 className={`font-bebas ${compact ? 'text-2xl' : 'text-4xl'} text-chalk light:text-chalk-light tracking-tight leading-none`}>
            FLASH <span className="text-accent light:text-accent-light">DEALS</span>
          </h2>
        </div>
        <p className={`flex items-center gap-2 font-barlow-condensed font-bold ${compact ? 'text-xs' : 'text-sm'} tracking-widest uppercase text-fog light:text-fog-light`}>
          <Clock size={14} />
          {expired ? 'Access expired' : `Ends in ${formatTimeLeft(accessExpiresAt, now)}`}
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
          const added = addedIds.has(offer.id)
          const disabled = expired || offer.sold_out
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
                  onClick={() => handleAdd(offer)}
                  disabled={disabled}
                  className={`${compact ? 'mt-1 px-3 py-2' : 'mt-2 px-4 py-2.5'} flex items-center justify-center gap-2 font-barlow-condensed font-black text-xs tracking-widest uppercase clip-angled-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    added
                      ? 'bg-green-900/40 text-green-400 border border-green-600/50'
                      : 'bg-accent light:bg-accent-light text-black light:text-white border border-accent light:border-accent-light hover:bg-accent/90 light:hover:bg-accent-light/90'
                  }`}
                >
                  {added ? <><Check size={14} /> Added!</> : offer.sold_out ? 'Sold out' : <><ShoppingCart size={14} /> Add to cart</>}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 flex flex-col gap-2.5 z-1000">
        {toasts.map((toast) => (
          <div key={toast.id} className={`${cardSurface} border-l-4 border-l-accent light:border-l-accent-light px-5 py-3.5 flex items-center gap-3 clip-angled-sm w-56 sm:w-64`}>
            <div className="w-7 h-7 bg-green-600/15 border border-green-600/25 rounded-full flex items-center justify-center text-green-400 flex-shrink-0">
              <Check size={13} />
            </div>
            <div className="font-barlow-condensed">
              <div className="font-bold text-base text-chalk light:text-chalk-light tracking-tighter">Added to cart</div>
              <div className="font-bold text-xs tracking-widest uppercase text-fog light:text-fog-light mt-0.25">{toast.name}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
