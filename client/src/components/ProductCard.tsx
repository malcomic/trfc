import { Product } from '../types'
import { Tag, Package } from 'lucide-react'

export default function ProductCard({ product, variant = 'full' }: { product: Product; variant?: 'full' | 'compact' }) {
  const prod = product as any
  const isNew = prod.created_at
    ? Date.now() - new Date(prod.created_at).getTime() < 1000 * 60 * 60 * 24 * 14
    : false
  const isSoldOut = prod.stock === 0

  if (variant === 'compact') {
    return (
      <>
        <h3 className="font-barlow-condensed font-bold text-[17px] tracking-wide text-chalk light:text-chalk-light leading-snug">{prod.name}</h3>
        {prod.description && (
          <p className="text-xs text-fog light:text-fog-light leading-relaxed line-clamp-2">{prod.description}</p>
        )}
        {typeof prod.stock === 'number' && prod.stock > 0 && prod.stock <= 5 && (
          <p className="font-barlow-condensed font-bold text-[10px] tracking-wider uppercase text-accent light:text-accent-light">Only {prod.stock} left</p>
        )}
      </>
    )
  }

  return (
    <div className="group relative flex flex-col h-full bg-ash light:bg-white border border-white/10 light:border-black/10 hover:border-accent/30 light:hover:border-accent-light/30 transition-all duration-300 hover:-translate-y-1">

      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent light:bg-accent-light scale-y-0 group-hover:scale-y-100 origin-bottom transition-transform duration-300 ease-out z-10" />

      <div className="relative overflow-hidden aspect-square bg-smoke light:bg-gray-100 flex-shrink-0">
        {prod.image_url ? (
          <img
            src={prod.image_url}
            alt={prod.name}
            className="w-full h-full object-cover brightness-[0.82] saturate-[0.85] group-hover:scale-[1.06] group-hover:brightness-100 group-hover:saturate-100 transition-all duration-500 ease-out"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={40} className="text-accent/15 light:text-accent-light/15" />
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

        {isNew && !isSoldOut && (
          <span className="absolute top-3 left-3 bg-accent light:bg-accent-light text-black light:text-white font-barlow-condensed font-black text-[10px] tracking-[2px] uppercase px-2.5 py-1 z-10">
            New
          </span>
        )}

        {isSoldOut && (
          <span className="absolute top-3 left-3 bg-smoke light:bg-gray-200 text-fog light:text-fog-light font-barlow-condensed font-black text-[10px] tracking-[2px] uppercase px-2.5 py-1 border border-white/10 light:border-black/10 z-10">
            Sold Out
          </span>
        )}

        {prod.category && (
          <span className="absolute top-3 right-3 flex items-center gap-1 bg-black/70 light:bg-black/80 backdrop-blur-sm text-fog light:text-gray-300 font-barlow-condensed font-bold text-[9px] tracking-[2px] uppercase px-2 py-1 border border-white/10 z-10">
            <Tag size={8} className="text-accent light:text-accent-light" />
            {prod.category}
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 px-4 pt-4 pb-5 border-t border-white/10 light:border-black/10 gap-1.5">

        <h3 className="font-barlow-condensed font-bold text-[17px] tracking-[0.3px] text-chalk light:text-chalk-light leading-snug">
          {prod.name}
        </h3>

        {prod.description && (
          <p className="text-[12px] text-fog light:text-fog-light leading-relaxed line-clamp-2 mt-0.5">
            {prod.description}
          </p>
        )}

        {typeof prod.stock === 'number' && prod.stock > 0 && prod.stock <= 5 && (
          <p className="font-barlow-condensed font-bold text-[10px] tracking-[2px] uppercase text-accent light:text-accent-light mt-1">
            Only {prod.stock} left
          </p>
        )}

        <div className="flex-1" />

        <div className="flex items-end justify-between pt-3 border-t border-white/10 light:border-black/10 mt-2">
          <div>
            <p className="font-bebas text-[28px] text-accent light:text-accent-light leading-none tracking-wide">
              KES {Number(prod.price).toLocaleString()}
            </p>
            {prod.original_price && prod.original_price > prod.price && (
              <p className="text-[11px] text-fog light:text-fog-light line-through leading-none mt-0.5">
                KES {Number(prod.original_price).toLocaleString()}
              </p>
            )}
          </div>

          {prod.original_price && prod.original_price > prod.price && (
            <span className="font-barlow-condensed font-black text-[11px] tracking-[1px] uppercase bg-accent/10 light:bg-accent-light/10 border border-accent/25 light:border-accent-light/25 text-accent light:text-accent-light px-2 py-1">
              -{Math.round(((prod.original_price - prod.price) / prod.original_price) * 100)}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
