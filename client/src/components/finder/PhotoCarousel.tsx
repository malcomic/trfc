import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { FINDER_BODY_SLOTS, type SiteImage } from '../../api/siteImages'

export default function PhotoCarousel({
  sex,
  images,
  value,
  onChange,
  minIndex = 1,
}: {
  sex: 'women' | 'men'
  images: Partial<Record<string, SiteImage>>
  value?: number
  onChange: (index: number) => void
  /** Only show photos at or leaner than this 1-based index (for G2). */
  minIndex?: number
}) {
  const slots = useMemo(
    () => FINDER_BODY_SLOTS.filter((slot) => slot.includes(`_${sex}_`)).slice(minIndex - 1),
    [sex, minIndex]
  )
  const initialCursor = value && value >= minIndex ? Math.min(slots.length - 1, value - minIndex) : 0
  const [cursor, setCursor] = useState(Math.max(0, initialCursor))
  const currentSlot = slots[cursor]
  const current = currentSlot ? images[currentSlot] : undefined
  const index = minIndex + cursor

  const pick = (nextCursor: number) => {
    setCursor(nextCursor)
    onChange(minIndex + nextCursor)
  }

  useEffect(() => {
    if (slots.length) onChange(minIndex + cursor)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once when carousel mounts
  }, [])

  return (
    <div className="w-full flex flex-col items-center gap-3">
      <div className="relative w-full max-w-[280px] aspect-[3/4] rounded-xl bg-black/[0.06] overflow-hidden flex items-center justify-center">
        {current?.image_url ? (
          <img src={current.image_url} alt={current.alt_text || current.label || `Body type ${index}`} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <span className="text-sm text-fog px-4 text-center">Body photo {index} — upload in Admin › Site Images</span>
        )}
        <button
          type="button"
          aria-label="Previous photo"
          disabled={cursor === 0}
          onClick={() => pick(Math.max(0, cursor - 1))}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 border-0 shadow flex items-center justify-center disabled:opacity-30 cursor-pointer"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          aria-label="Next photo"
          disabled={cursor >= slots.length - 1}
          onClick={() => pick(Math.min(slots.length - 1, cursor + 1))}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 border-0 shadow flex items-center justify-center disabled:opacity-30 cursor-pointer"
        >
          <ChevronRight size={20} />
        </button>
      </div>
      <p className="m-0 text-sm font-medium text-night">
        {current?.label || current?.alt_text || `Type ${index}`}
      </p>
      <div className="flex gap-1.5">
        {slots.map((_, i) => (
          <button
            key={slots[i]}
            type="button"
            aria-label={`Photo ${minIndex + i}`}
            onClick={() => pick(i)}
            className={`w-2 h-2 rounded-full border-0 cursor-pointer ${i === cursor ? 'bg-cta' : 'bg-black/20'}`}
          />
        ))}
      </div>
    </div>
  )
}
