import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../store/cartStore'
import { getProducts } from '../api/products'
import ProductCard from '../components/ProductCard'
import { Product } from '../types'
import { ShoppingCart, AlertCircle, SlidersHorizontal, Check, ChevronDown } from 'lucide-react'
import { pageRoot, cardSurface } from '../utils/themeClasses'

interface Toast { id: number; name: string }

const CATEGORIES = ['All', 'Apparel', 'Accessories', 'Footwear', 'Gear']
const SORT_OPTIONS = ['Featured', 'Price: Low to High', 'Price: High to Low', 'Newest']

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [sortBy, setSortBy] = useState('Featured')
  const [showSort, setShowSort] = useState(false)
  const [addedIds, setAddedIds] = useState<Set<string | number>>(new Set())
  const [toasts, setToasts] = useState<Toast[]>([])
  const { addItem } = useCart()
  const toastId = useRef(0)

  useEffect(() => { fetchProducts() }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const data = await getProducts()
      setProducts(data)
    } catch (err) {
      setError('Failed to load products. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = (product: Product) => {
    addItem(product, 1)

    // Flash button state
    setAddedIds((prev) => new Set(prev).add(product.id))
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev)
        next.delete(product.id)
        return next
      })
    }, 1500)

    // Show toast
    const id = ++toastId.current
    setToasts((prev) => [...prev, { id, name: product.name }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000)
  }

  const filteredProducts = products.filter((p) => {
    if (activeCategory === 'All') return true
    return (p.category || '').toLowerCase() === activeCategory.toLowerCase()
  })

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'Price: Low to High') return (a.price ?? 0) - (b.price ?? 0)
    if (sortBy === 'Price: High to Low') return (b.price ?? 0) - (a.price ?? 0)
    if (sortBy === 'Newest') {
      const aTime = (a as any).created_at ? new Date((a as any).created_at).getTime() : 0
      const bTime = (b as any).created_at ? new Date((b as any).created_at).getTime() : 0
      return bTime - aTime
    }
    return 0
  })

  const isNew = (product: Product) => {
    const created = (product as any).created_at
    if (!created) return false
    return Date.now() - new Date(created).getTime() < 1000 * 60 * 60 * 24 * 14
  }

  return (
    <div className={pageRoot}>

      {/* ── Hero ── */}
      <section className="bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-16 pb-12 relative overflow-hidden">
        <div className="absolute right-[-2%] top-1/2 -translate-y-1/2 font-bebas text-clamp-2xl text-accent/5 light:text-accent-light/5 leading-none pointer-events-none select-none tracking-tighter">MERCH</div>
        <div className="max-w-5xl mx-auto relative z-1 flex items-end justify-between gap-6 flex-wrap">
          <div>
            <div className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light flex items-center gap-2 mb-3.5 before:block before:w-5 before:h-0.5 before:bg-accent light:before:bg-accent-light">Official Merchandise</div>
            <h1 className="font-bebas text-clamp-lg leading-tight text-chalk light:text-chalk-light tracking-tighter">
              TRFC<br /><span className="text-accent light:text-accent-light">SHOP</span>
            </h1>
          </div>
          <p className="font-barlow-condensed font-bold text-sm tracking-widest text-fog light:text-fog-light pb-2">
            {loading ? '—' : `${products.length} product${products.length !== 1 ? 's' : ''}`} available
          </p>
        </div>
      </section>

      {/* ── Ticker ── */}
      <div className="bg-accent light:bg-accent-light overflow-hidden py-0.75 animate-ticker">
        <div
          className="flex whitespace-nowrap"
          style={{ animation: 'shopTicker 20s linear infinite' }}
        >
          {Array(4).fill(null).map((_, i) => (
            <span key={i} className="flex items-center">
              <span className="font-bebas text-xs tracking-widest text-white px-9">FREE DELIVERY OVER KES 3,000</span>
              <span className="font-bebas text-xs tracking-widest text-white/40 px-9">✦</span>
              <span className="font-bebas text-xs tracking-widest text-white px-9">OFFICIAL TRFC GEAR</span>
              <span className="font-bebas text-xs tracking-widest text-white/40 px-9">✦</span>
              <span className="font-bebas text-xs tracking-widest text-white px-9">WEAR THE COMMUNITY</span>
              <span className="font-bebas text-xs tracking-widest text-white/40 px-9">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="bg-ash light:bg-ash-light border-b border-white/5 light:border-black/8 px-[6%] py-7">
        <div className="max-w-5xl mx-auto flex items-center gap-3 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-1.75 font-barlow-condensed font-bold text-xs tracking-widest uppercase px-4.5 py-2 transition-all duration-200 clip-angled-sm ${
                activeCategory === cat
                  ? 'bg-accent light:bg-accent-light text-black light:text-white border border-accent light:border-accent-light'
                  : 'bg-ash light:bg-ash-light text-fog light:text-fog-light border border-white/10 light:border-black/10 hover:border-white/20 light:hover:border-black/20 hover:text-chalk light:hover:text-chalk-light'
              }`}
            >
              {cat}
            </button>
          ))}

          <div className="ml-auto relative">
            <button
              className="flex items-center gap-1.75 font-barlow-condensed font-bold text-xs tracking-widest uppercase px-4 py-2 bg-ash light:bg-ash-light text-fog light:text-fog-light border border-white/10 light:border-black/10 cursor-pointer clip-angled-sm transition-all duration-200 hover:border-white/20 light:hover:border-black/20"
              onClick={() => setShowSort((v) => !v)}
            >
              <SlidersHorizontal size={13} />
              {sortBy}
              <ChevronDown size={13} className="transition-transform duration-200" style={{ transform: showSort ? 'rotate(180deg)' : 'none' }} />
            </button>
            {showSort && (
              <div className={`absolute top-full right-0 mt-2 min-w-52 ${cardSurface} clip-angled-sm z-50`}>
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setSortBy(opt); setShowSort(false) }}
                    className="w-full text-left bg-none border-none border-b border-white/5 light:border-black/8 last:border-b-0 px-4 py-3 cursor-pointer font-barlow-condensed font-bold text-xs tracking-widest uppercase transition-all duration-200 flex items-center gap-2 hover:text-accent light:hover:text-accent-light hover:bg-white/5 light:hover:bg-black/5"
                    style={{ color: opt === sortBy ? '#000000' : 'var(--fog)' }}
                  >
                    {opt === sortBy && <Check size={12} />}
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-5xl mx-auto px-[6%] py-9 pb-20">

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 border-l-4 border-l-red-500 px-4 py-3.5 mb-8 text-sm text-red-600 dark:text-red-400">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.25" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-auto-fill gap-0.5">
            {Array(8).fill(null).map((_, i) => (
              <div key={i} className="bg-ash light:bg-ash-light animate-pulse" style={{ aspectRatio: '3/4', animation: 'skelShimmer 1.4s ease infinite' }} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && products.length === 0 && (
          <div className="text-center py-25">
            <div className="font-bebas text-clamp-2xl text-accent/10 light:text-accent-light/10 leading-none mb-4 tracking-tighter">SOLD<br />OUT</div>
            <p className="font-barlow-condensed font-bold text-xl tracking-widest uppercase text-fog light:text-fog-light mb-2">No products available right now</p>
            <p className="text-sm text-fog light:text-fog-light">
              Check back soon — new drops coming.
            </p>
          </div>
        )}

        {/* Product grid */}
        {!loading && !error && sortedProducts.length > 0 && (
          <div className="grid grid-cols-auto-fill gap-0.5">
            {sortedProducts.map((product) => {
              const added = addedIds.has(product.id)
              return (
                <div key={product.id} className="bg-ash light:bg-ash-light border border-transparent hover:border-accent/30 light:hover:border-accent-light/30 transition-all duration-250 hover:-translate-y-0.75 hover:z-10">

                  {/* Image + overlay */}
                  <Link
                    to={`/shop/${product.id}`}
                    className="relative overflow-hidden aspect-square bg-smoke light:bg-smoke-light group block no-underline"
                  >
                    <img
                      src={product.image_url || 'https://images.unsplash.com/photo-1556906781-9a412961a28d?w=500&q=80'}
                      alt={product.name}
                      className="w-full h-full object-cover brightness-90 saturate-85 transition-all duration-500 ease-out group-hover:scale-107 group-hover:brightness-100 group-hover:saturate-100"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1556906781-9a412961a28d?w=500&q=80'
                      }}
                    />
                    {isNew(product) && (
                      <span className="absolute top-3 left-3 font-barlow-condensed font-black text-xs tracking-widest uppercase px-2.5 py-1 bg-accent light:bg-accent-light text-black light:text-white z-1">New</span>
                    )}
                    {product.stock === 0 && (
                      <span className="absolute top-3 left-3 font-barlow-condensed font-black text-xs tracking-widest uppercase px-2.5 py-1 bg-smoke light:bg-smoke-light text-fog light:text-fog-light z-1">Sold Out</span>
                    )}

                    {/* Quick-add overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-250 flex items-center justify-center">
                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={product.stock === 0}
                        className={`font-barlow-condensed font-black text-xs tracking-widest uppercase px-7 py-3 clip-angled transition-all duration-300 ease-out disabled:opacity-50 flex items-center gap-2 ${
                          added
                            ? 'bg-green-900/40 text-green-400 border border-green-600/50'
                            : 'bg-accent light:bg-accent-light text-black light:text-white border border-accent light:border-accent-light hover:bg-accent/90 light:hover:bg-accent-light/90'
                        }`}
                        style={{ transform: added ? 'translateY(0)' : 'translateY(10px)' }}
                      >
                        {added
                          ? <><Check size={14} /> Added!</>
                          : <><ShoppingCart size={14} /> Quick Add</>
                        }
                      </button>
                    </div>
                  </Link>

                  {/* Card body */}
                  <div className="px-4.5 py-5 flex flex-col gap-1.5 border-t border-white/5 light:border-black/8">
                    <Link to={`/shop/${product.id}`} className="no-underline hover:text-accent light:hover:text-accent-light transition-colors duration-200">
                      <ProductCard product={product} variant="compact" />
                    </Link>
                    <div className="flex items-center justify-between mt-2">
                      <div className="font-bebas text-2xl text-accent light:text-accent-light tracking-wider">
                        KES {product.price?.toLocaleString?.() ?? product.price}
                      </div>
                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={product.stock === 0}
                        className={`w-8.5 h-8.5 flex items-center justify-center transition-all duration-200 clip-angled-sm disabled:opacity-50 ${
                          added
                            ? 'bg-green-600/10 border border-green-600/30 text-green-400'
                            : 'bg-accent/10 light:bg-accent-light/10 border border-accent/20 light:border-accent-light/20 text-accent light:text-accent-light hover:bg-accent/20 light:hover:bg-accent-light/20'
                        }`}
                        aria-label={`Add ${product.name} to cart`}
                      >
                        {added
                          ? <Check size={15} />
                          : <ShoppingCart size={15} />
                        }
                      </button>
                    </div>
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Toast stack ── */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-2.5 z-1000">
        {toasts.map((toast) => (
          <div key={toast.id} className={`${cardSurface} border-l-4 border-l-accent light:border-l-accent-light px-5 py-3.5 flex items-center gap-3 clip-angled-sm animate-toastIn w-64`}>
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

      <style>{`
        @keyframes shopTicker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes skelShimmer {
          from { transform: translateX(-100%); }
          to   { transform: translateX(100%); }
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(40px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(40px); }
        }
        .animate-toastIn {
          animation: toastIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards;
        }
        .grid-cols-auto-fill {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        }
      `}</style>
    </div>
  )
}
