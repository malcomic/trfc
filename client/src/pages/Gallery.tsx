import { useEffect, useState, useCallback } from 'react'
import { getGallery } from '../api/gallery'
import { AlertCircle, X, ChevronLeft, ChevronRight, ZoomIn, Image } from 'lucide-react'

interface GalleryItem {
  id: string
  media_url: string
  media_type?: string
  caption?: string
  uploaded_at: string
}

export default function Gallery() {
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [imgLoaded, setImgLoaded] = useState(false)

  useEffect(() => {
    fetchGallery()
  }, [])

  const fetchGallery = async () => {
    try {
      const data = await getGallery()
      setItems(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError('Failed to load gallery')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const openItem = (index: number) => {
    setImgLoaded(false)
    setSelectedIndex(index)
  }

  const closeModal = () => setSelectedIndex(null)

  const prev = useCallback(() => {
    if (selectedIndex === null) return
    setImgLoaded(false)
    setSelectedIndex((selectedIndex - 1 + items.length) % items.length)
  }, [selectedIndex, items.length])

  const next = useCallback(() => {
    if (selectedIndex === null) return
    setImgLoaded(false)
    setSelectedIndex((selectedIndex + 1) % items.length)
  }, [selectedIndex, items.length])

  useEffect(() => {
    if (selectedIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedIndex, prev, next])

  // Lock scroll when lightbox open
  useEffect(() => {
    document.body.style.overflow = selectedIndex !== null ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [selectedIndex])

  const selectedItem = selectedIndex !== null ? items[selectedIndex] : null

  // Assign grid spans for a masonry-feel layout
  const getSpan = (index: number): string => {
    const pattern = [
      'md:col-span-2 md:row-span-2', // large
      'md:col-span-1 md:row-span-1', // small
      'md:col-span-1 md:row-span-1', // small
      'md:col-span-1 md:row-span-1', // small
      'md:col-span-1 md:row-span-1', // small
      'md:col-span-2 md:row-span-1', // wide
    ]
    return pattern[index % pattern.length] || ''
  }

  return (
    <div className="min-h-screen bg-night text-chalk font-barlow">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-ink border-b border-white/5 px-[6%] pt-16 pb-12">
        {/* Watermark */}
        <p
          className="absolute right-[-1%] bottom-[-16px] font-bebas text-clamp-2xl text-fire/5 leading-none pointer-events-none select-none letter-spacing-tighter"
          aria-hidden="true"
        >
          GALLERY
        </p>

        <div className="max-w-5xl mx-auto relative z-10 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="flex items-center gap-2.5 font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire mb-3.5 before:block before:w-5 before:h-0.5 before:bg-fire">
              Community Moments
            </p>
            <h1 className="font-bebas text-clamp-lg leading-tight text-chalk letter-spacing-tighter">
              OUR<br />
              <span className="text-transparent" style={{ WebkitTextStroke: '2px #FF4500' }}>GALLERY</span>
            </h1>
          </div>
          <p className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog pb-0.5">
            {loading ? '—' : `${items.length} photo${items.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </section>

      {/* ── Ticker ── */}
      <div className="bg-fire overflow-hidden py-0.75 animated-gallery-ticker">
        <div
          className="flex whitespace-nowrap animate-galleryTicker"
        >
          {Array(4).fill(null).map((_, i) => (
            <span key={i} className="flex items-center">
              <span className="font-bebas text-xs letter-spacing-widest text-white px-9">TRFC COMMUNITY</span>
              <span className="font-bebas text-xs letter-spacing-widest text-white/40 px-9">✦</span>
              <span className="font-bebas text-xs letter-spacing-widest text-white px-9">SWEAT · RACE · CELEBRATE</span>
              <span className="font-bebas text-xs letter-spacing-widest text-white/40 px-9">✦</span>
              <span className="font-bebas text-xs letter-spacing-widest text-white px-9">NAIROBI RUNS</span>
              <span className="font-bebas text-xs letter-spacing-widest text-white/40 px-9">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Main ── */}
      <div className="max-w-5xl mx-auto px-[6%] py-10 pb-20">

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 border-l-4 border-l-red-500 px-4 py-3.5 mb-8 text-sm text-red-600 dark:text-red-400">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0.5">
            {Array(9).fill(null).map((_, i) => (
              <div
                key={i}
                className={`bg-ash relative overflow-hidden ${i === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}
                style={{ aspectRatio: '1' }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <p className="font-bebas text-clamp-2xl text-fire/5 leading-none mb-4 letter-spacing-tighter">
              COMING<br />SOON
            </p>
            <p className="font-barlow-condensed font-bold text-lg letter-spacing-widest text-transform-uppercase text-fog mb-2">
              Gallery is empty
            </p>
            <p className="text-sm text-mist">Photos from our events will appear here.</p>
          </div>
        )}

        {/* Gallery grid */}
        {!loading && !error && items.length > 0 && (
          <>
            <p className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog mb-6">
              Showing <span className="text-fire">{items.length}</span> photo{items.length !== 1 ? 's' : ''}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 auto-rows-56 gap-0.5">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className={`group relative overflow-hidden bg-ash cursor-pointer border border-transparent hover:border-fire/30 transition-all duration-300 hover:z-10 ${getSpan(index)}`}
                  onClick={() => openItem(index)}
                >
                  {/* Image */}
                  <img
                    src={item.media_url}
                    alt={item.caption || 'TRFC Gallery'}
                    className="w-full h-full object-cover brightness-75 saturate-85 group-hover:scale-106 group-hover:brightness-90 group-hover:saturate-100 transition-all duration-500 ease-out"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />

                  {/* Bottom gradient */}
                  <div className="absolute bottom-0 left-0 right-0 h-2/5 bg-gradient-to-t from-black/75 to-transparent pointer-events-none" />

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="w-12 h-12 bg-fire flex items-center justify-center translate-y-3 group-hover:translate-y-0 transition-transform duration-300 ease-out clip-angled"
                    >
                      <ZoomIn size={18} className="text-white" />
                    </div>
                  </div>

                  {/* Caption overlay */}
                  {item.caption && (
                    <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-0.5 group-hover:translate-y-0">
                      <p className="text-xs text-chalk italic leading-tight line-clamp-2">{item.caption}</p>
                    </div>
                  )}

                  {/* Index number — top right */}
                  <span className="absolute top-3 right-3 font-bebas text-xs letter-spacing-tighter text-white/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Lightbox ── */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          {/* Panel */}
          <div
            className="relative w-full max-w-4xl flex flex-col bg-ink border border-white/10 overflow-hidden clip-angled"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
              <p className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire flex items-center gap-2 before:block before:w-4 before:h-0.5 before:bg-fire">
                {selectedIndex !== null ? `${selectedIndex + 1} / ${items.length}` : ''}
              </p>
              <button
                onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center border border-white/10 text-fog hover:border-fire hover:text-fire transition-colors duration-200 clip-angled-sm"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            {/* Image area */}
            <div className="relative bg-night flex items-center justify-center" style={{ minHeight: '420px', maxHeight: '65vh' }}>
              {!imgLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Image size={32} className="text-fire/15" />
                </div>
              )}
              <img
                key={selectedItem.media_url}
                src={selectedItem.media_url}
                alt={selectedItem.caption || 'TRFC Gallery'}
                className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                style={{ maxHeight: '65vh' }}
                onLoad={() => setImgLoaded(true)}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x600?text=Image+not+found'
                  setImgLoaded(true)
                }}
              />

              {/* Prev / Next arrows */}
              {items.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); prev() }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/60 border border-white/10 text-fog hover:border-fire hover:text-fire transition-all duration-200 clip-angled-sm"
                    aria-label="Previous"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); next() }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/60 border border-white/10 text-fog hover:border-fire hover:text-fire transition-all duration-200 clip-angled-sm"
                    aria-label="Next"
                  >
                    <ChevronRight size={16} />
                  </button>
                </>
              )}
            </div>

            {/* Caption + meta */}
            {(selectedItem.caption || selectedItem.uploaded_at) && (
              <div className="px-6 py-4 border-t border-white/5 flex items-start justify-between gap-4 flex-wrap">
                {selectedItem.caption && (
                  <p className="text-sm text-chalk/60 italic leading-relaxed flex-1">
                    {selectedItem.caption}
                  </p>
                )}
                {selectedItem.uploaded_at && (
                  <p className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog white-space-nowrap self-end">
                    {new Date(selectedItem.uploaded_at).toLocaleDateString('en-KE', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </p>
                )}
              </div>
            )}

            {/* Thumbnail strip */}
            {items.length > 1 && (
              <div className="border-t border-white/5 px-4 py-3 flex gap-1.5 overflow-x-auto">
                {items.map((thumb, i) => (
                  <button
                    key={thumb.id}
                    onClick={() => openItem(i)}
                    className={`flex-shrink-0 w-12 h-12 overflow-hidden border transition-all duration-200 clip-angled-sm ${
                      i === selectedIndex
                        ? 'border-fire brightness-100'
                        : 'border-transparent brightness-50 hover:brightness-75'
                    }`}
                    aria-label={`View photo ${i + 1}`}
                  >
                    <img
                      src={thumb.media_url}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ticker keyframe */}
      <style>{`
        @keyframes galleryTicker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .animate-galleryTicker {
          animation: galleryTicker 22s linear infinite;
        }
      `}</style>
    </div>
  )
}
