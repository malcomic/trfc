import { Product } from '../types'
import { Tag, Package } from 'lucide-react'

export default function ProductCard({ product }: { product: Product }) {
  const prod = product as any
  const isNew = prod.created_at
    ? Date.now() - new Date(prod.created_at).getTime() < 1000 * 60 * 60 * 24 * 14
    : false
  const isSoldOut = prod.stock === 0

  return (
    <div className="group relative flex flex-col h-full bg-white dark:bg-[#1C1C1C] border border-gray-200 dark:border-gray-800 hover:border-[rgba(255,69,0,0.3)] dark:hover:border-[rgba(255,69,0,0.3)] transition-all duration-300 hover:-translate-y-1">

      {/* Left fire accent line */}
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#FF4500] scale-y-0 group-hover:scale-y-100 origin-bottom transition-transform duration-300 ease-out z-10" />

      {/* ── Image ── */}
      <div className="relative overflow-hidden aspect-square bg-gray-100 dark:bg-[#2A2A2A] flex-shrink-0">
        {prod.image_url ? (
          <img
            src={prod.image_url}
            alt={prod.name}
            className="w-full h-full object-cover brightness-[0.82] saturate-[0.85] group-hover:scale-[1.06] group-hover:brightness-100 group-hover:saturate-100 transition-all duration-500 ease-out"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={40} className="text-[rgba(255,69,0,0.15)]" />
          </div>
        )}

        {/* Image bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

        {/* New badge */}
        {isNew && !isSoldOut && (
          <span className="absolute top-3 left-3 bg-[#FF4500] text-white font-['Barlow_Condensed'] font-black text-[10px] tracking-[2px] uppercase px-2.5 py-1 z-10">
            New
          </span>
        )}

        {/* Sold out badge */}
        {isSoldOut && (
          <span className="absolute top-3 left-3 bg-[#2A2A2A] text-[#6B6B6B] font-['Barlow_Condensed'] font-black text-[10px] tracking-[2px] uppercase px-2.5 py-1 border border-white/10 z-10">
            Sold Out
          </span>
        )}

        {/* Category tag top-right */}
        {prod.category && (
          <span className="absolute top-3 right-3 flex items-center gap-1 bg-black/70 backdrop-blur-sm text-[#6B6B6B] font-['Barlow_Condensed'] font-bold text-[9px] tracking-[2px] uppercase px-2 py-1 border border-white/08 z-10">
            <Tag size={8} className="text-[#FF4500]" />
            {prod.category}
          </span>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col flex-1 px-4 pt-4 pb-5 border-t border-gray-200 dark:border-gray-700 gap-1.5">

        {/* Name */}
        <h3 className="font-['Barlow_Condensed'] font-bold text-[17px] tracking-[0.3px] text-gray-900 dark:text-[#F5F2EE] leading-snug">
          {prod.name}
        </h3>

        {/* Description */}
        {prod.description && (
          <p className="text-[12px] text-gray-600 dark:text-[#6B6B6B] leading-relaxed line-clamp-2 mt-0.5">
            {prod.description}
          </p>
        )}

        {/* Stock indicator */}
        {typeof prod.stock === 'number' && prod.stock > 0 && prod.stock <= 5 && (
          <p className="font-['Barlow_Condensed'] font-bold text-[10px] tracking-[2px] uppercase text-[#FF4500] mt-1">
            Only {prod.stock} left
          </p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Price row */}
        <div className="flex items-end justify-between pt-3 border-t border-gray-200 dark:border-gray-700 mt-2">
          <div>
            <p className="font-['Bebas_Neue'] text-[28px] text-[#FF4500] leading-none tracking-wide">
              KES {Number(prod.price).toLocaleString()}
            </p>
            {prod.original_price && prod.original_price > prod.price && (
              <p className="text-[11px] text-[#6B6B6B] line-through leading-none mt-0.5">
                KES {Number(prod.original_price).toLocaleString()}
              </p>
            )}
          </div>

          {/* Discount badge */}
          {prod.original_price && prod.original_price > prod.price && (
            <span className="font-['Barlow_Condensed'] font-black text-[11px] tracking-[1px] uppercase bg-[rgba(255,69,0,0.12)] border border-[rgba(255,69,0,0.25)] text-[#FF4500] px-2 py-1">
              -{Math.round(((prod.original_price - prod.price) / prod.original_price) * 100)}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}