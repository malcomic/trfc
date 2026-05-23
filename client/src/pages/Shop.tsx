import { useEffect, useState, useRef } from 'react'
import { useCart } from '../store/cartStore'
import { getProducts } from '../api/products'
import ProductCard from '../components/ProductCard'
import { Product } from '../types'
import { ShoppingCart, AlertCircle, SlidersHorizontal, Check, ChevronDown } from 'lucide-react'

const shopStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;600&family=Barlow+Condensed:wght@500;700;900&display=swap');

  .trfc-shop {
    --fire: #FF4500;
    --ember: #FF7A1A;
    --night: #0A0A0A;
    --ink: #111111;
    --ash: #1C1C1C;
    --smoke: #2A2A2A;
    --chalk: #F5F2EE;
    --fog: #6B6B6B;
    --mist: #2E2E2E;
    --danger: #FF3B30;
    --success: #30D158;
    min-height: 100vh;
    background: var(--night);
    font-family: 'Barlow', sans-serif;
    color: var(--chalk);
  }

  /* ── Hero strip ── */
  .trfc-shop__hero {
    background: var(--ink);
    border-bottom: 1px solid rgba(255,255,255,0.04);
    padding: 64px 6% 48px;
    position: relative;
    overflow: hidden;
  }
  .trfc-shop__hero-watermark {
    position: absolute;
    right: -2%;
    top: 50%;
    transform: translateY(-50%);
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(100px, 14vw, 220px);
    color: rgba(255,69,0,0.05);
    line-height: 1;
    pointer-events: none;
    user-select: none;
    letter-spacing: -2px;
    white-space: nowrap;
  }
  .trfc-shop__hero-inner {
    max-width: 1200px;
    margin: 0 auto;
    position: relative;
    z-index: 1;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    flex-wrap: wrap;
  }
  .trfc-shop__eyebrow {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--fire);
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }
  .trfc-shop__eyebrow::before {
    content: '';
    display: block;
    width: 20px;
    height: 2px;
    background: var(--fire);
  }
  .trfc-shop__title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(52px, 8vw, 100px);
    line-height: 0.92;
    color: var(--chalk);
    letter-spacing: 0.5px;
  }
  .trfc-shop__title span { color: var(--fire); }
  .trfc-shop__count {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 500;
    font-size: 14px;
    color: var(--fog);
    letter-spacing: 1px;
    padding-bottom: 8px;
  }

  /* ── Ticker ── */
  .trfc-shop__ticker {
    background: var(--fire);
    overflow: hidden;
    padding: 10px 0;
  }
  .trfc-shop__ticker-inner {
    display: flex;
    white-space: nowrap;
    animation: shopTicker 20s linear infinite;
  }
  @keyframes shopTicker {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }
  .trfc-shop__ticker-item {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 15px;
    letter-spacing: 3px;
    color: white;
    padding: 0 36px;
  }

  /* ── Toolbar ── */
  .trfc-shop__toolbar {
    max-width: 1200px;
    margin: 0 auto;
    padding: 28px 6%;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }
  .trfc-shop__filter-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    background: var(--ash);
    border: 1px solid rgba(255,255,255,0.07);
    color: var(--fog);
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    padding: 9px 18px;
    cursor: pointer;
    clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
    transition: border-color 0.2s, color 0.2s;
  }
  .trfc-shop__filter-btn:hover,
  .trfc-shop__filter-btn.active { border-color: var(--fire); color: var(--fire); }

  .trfc-shop__sort {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 7px;
    background: var(--ash);
    border: 1px solid rgba(255,255,255,0.07);
    color: var(--fog);
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    padding: 9px 16px;
    cursor: pointer;
    clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
    position: relative;
  }

  /* ── Grid ── */
  .trfc-shop__main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 36px 6% 80px;
  }

  .trfc-shop__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 2px;
  }

  /* ── Product card ── */
  .trfc-shop__card {
    background: var(--ash);
    border: 1px solid rgba(255,255,255,0.0);
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: border-color 0.25s, transform 0.25s;
    cursor: pointer;
  }
  .trfc-shop__card:hover {
    border-color: rgba(255,69,0,0.3);
    transform: translateY(-3px);
    z-index: 2;
  }

  .trfc-shop__card-img-wrap {
    position: relative;
    overflow: hidden;
    aspect-ratio: 1 / 1;
    background: var(--smoke);
  }
  .trfc-shop__card-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s cubic-bezier(0.16,1,0.3,1), filter 0.3s;
    filter: brightness(0.9) saturate(0.85);
  }
  .trfc-shop__card:hover .trfc-shop__card-img {
    transform: scale(1.07);
    filter: brightness(1) saturate(1);
  }

  /* Badge */
  .trfc-shop__card-badge {
    position: absolute;
    top: 12px;
    left: 12px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    padding: 4px 10px;
    z-index: 1;
  }
  .trfc-shop__card-badge--new { background: var(--fire); color: white; }
  .trfc-shop__card-badge--sold { background: var(--smoke); color: var(--fog); }

  /* Quick add overlay */
  .trfc-shop__card-overlay {
    position: absolute;
    inset: 0;
    background: rgba(10,10,10,0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.25s;
  }
  .trfc-shop__card:hover .trfc-shop__card-overlay { opacity: 1; }

  .trfc-shop__quick-add {
    background: var(--fire);
    border: none;
    color: white;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 900;
    font-size: 12px;
    letter-spacing: 3px;
    text-transform: uppercase;
    padding: 12px 28px;
    clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
    cursor: pointer;
    transition: background 0.2s, transform 0.15s;
    display: flex;
    align-items: center;
    gap: 8px;
    transform: translateY(10px);
    transition: background 0.2s, transform 0.3s cubic-bezier(0.16,1,0.3,1);
  }
  .trfc-shop__card:hover .trfc-shop__quick-add { transform: translateY(0); }
  .trfc-shop__quick-add:hover { background: var(--ember); }
  .trfc-shop__quick-add.added { background: #1A3A1A; color: var(--success); }

  /* Card body */
  .trfc-shop__card-body {
    padding: 18px 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    border-top: 1px solid rgba(255,255,255,0.04);
  }
  .trfc-shop__card-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 17px;
    letter-spacing: 0.5px;
    color: var(--chalk);
    line-height: 1.2;
  }
  .trfc-shop__card-sub {
    font-size: 12px;
    color: var(--fog);
    text-transform: uppercase;
    letter-spacing: 1.5px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 500;
  }
  .trfc-shop__card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 8px;
  }
  .trfc-shop__card-price {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 28px;
    color: var(--fire);
    letter-spacing: 1px;
    line-height: 1;
  }
  .trfc-shop__card-add-btn {
    width: 34px;
    height: 34px;
    background: rgba(255,69,0,0.1);
    border: 1px solid rgba(255,69,0,0.2);
    color: var(--fire);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
    transition: background 0.2s, border-color 0.2s;
  }
  .trfc-shop__card-add-btn:hover { background: rgba(255,69,0,0.2); border-color: rgba(255,69,0,0.5); }
  .trfc-shop__card-add-btn.added { background: rgba(48,209,88,0.1); border-color: rgba(48,209,88,0.3); color: var(--success); }

  /* ── Toast notification ── */
  .trfc-shop__toast {
    position: fixed;
    bottom: 32px;
    right: 32px;
    background: var(--ash);
    border: 1px solid rgba(255,255,255,0.08);
    border-left: 3px solid var(--fire);
    padding: 14px 20px;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 1000;
    clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px));
    animation: toastIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards;
    min-width: 260px;
    max-width: 340px;
    pointer-events: none;
  }
  .trfc-shop__toast.exit {
    animation: toastOut 0.3s ease forwards;
  }
  @keyframes toastIn {
    from { opacity: 0; transform: translateX(40px) scale(0.95); }
    to   { opacity: 1; transform: translateX(0) scale(1); }
  }
  @keyframes toastOut {
    from { opacity: 1; transform: translateX(0); }
    to   { opacity: 0; transform: translateX(40px); }
  }
  .trfc-shop__toast-icon {
    width: 28px;
    height: 28px;
    background: rgba(48,209,88,0.12);
    border: 1px solid rgba(48,209,88,0.25);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--success);
    flex-shrink: 0;
  }
  .trfc-shop__toast-text {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
  }
  .trfc-shop__toast-title { font-size: 15px; color: var(--chalk); letter-spacing: 0.5px; }
  .trfc-shop__toast-sub { font-size: 12px; color: var(--fog); letter-spacing: 1px; text-transform: uppercase; margin-top: 1px; }

  /* ── States ── */
  .trfc-shop__loading {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 2px;
  }
  .trfc-shop__skeleton {
    background: var(--ash);
    aspect-ratio: 1;
    position: relative;
    overflow: hidden;
  }
  .trfc-shop__skeleton::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%);
    animation: skelShimmer 1.4s ease infinite;
  }
  @keyframes skelShimmer {
    from { transform: translateX(-100%); }
    to   { transform: translateX(100%); }
  }

  .trfc-shop__empty {
    text-align: center;
    padding: 100px 24px;
  }
  .trfc-shop__empty-icon {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 80px;
    color: rgba(255,69,0,0.1);
    line-height: 1;
    margin-bottom: 16px;
  }
  .trfc-shop__empty-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 22px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--fog);
  }

  /* Error */
  .trfc-shop__error {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: rgba(255,59,48,0.08);
    border: 1px solid rgba(255,59,48,0.2);
    border-left: 3px solid var(--danger);
    padding: 16px 18px;
    margin-bottom: 32px;
    font-size: 14px;
    color: #FF6B65;
  }
`

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
  const styleRef = useRef<HTMLStyleElement | null>(null)
  const toastId = useRef(0)

  useEffect(() => {
    if (document.getElementById('trfc-shop-styles')) return
    const el = document.createElement('style')
    el.id = 'trfc-shop-styles'
    el.textContent = shopStyles
    document.head.appendChild(el)
    styleRef.current = el
    return () => {
      const existing = document.getElementById('trfc-shop-styles')
      if (existing) document.head.removeChild(existing)
    }
  }, [])

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

  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === 'Price: Low to High') return (a.price ?? 0) - (b.price ?? 0)
    if (sortBy === 'Price: High to Low') return (b.price ?? 0) - (a.price ?? 0)
    return 0
  })

  const isNew = () => {
    return false
  }

  return (
    <div className="trfc-shop">

      {/* ── Hero ── */}
      <section className="trfc-shop__hero">
        <div className="trfc-shop__hero-watermark" aria-hidden="true">MERCH</div>
        <div className="trfc-shop__hero-inner">
          <div>
            <div className="trfc-shop__eyebrow">Official Merchandise</div>
            <h1 className="trfc-shop__title">
              TRFC<br /><span>SHOP</span>
            </h1>
          </div>
          <p className="trfc-shop__count">
            {loading ? '—' : `${products.length} product${products.length !== 1 ? 's' : ''}`} available
          </p>
        </div>
      </section>

      {/* ── Ticker ── */}
      <div className="trfc-shop__ticker" aria-hidden="true">
        <div className="trfc-shop__ticker-inner">
          {Array(4).fill(null).map((_, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <span className="trfc-shop__ticker-item">FREE DELIVERY OVER KES 3,000</span>
              <span className="trfc-shop__ticker-item" style={{ color: 'rgba(255,255,255,0.4)' }}>✦</span>
              <span className="trfc-shop__ticker-item">OFFICIAL TRFC GEAR</span>
              <span className="trfc-shop__ticker-item" style={{ color: 'rgba(255,255,255,0.4)' }}>✦</span>
              <span className="trfc-shop__ticker-item">WEAR THE COMMUNITY</span>
              <span className="trfc-shop__ticker-item" style={{ color: 'rgba(255,255,255,0.4)' }}>✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="trfc-shop__toolbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`trfc-shop__filter-btn${activeCategory === cat ? ' active' : ''}`}
          >
            {cat}
          </button>
        ))}

        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <button
            className="trfc-shop__sort"
            onClick={() => setShowSort((v) => !v)}
          >
            <SlidersHorizontal size={13} />
            {sortBy}
            <ChevronDown size={13} style={{ transition: 'transform 0.2s', transform: showSort ? 'rotate(180deg)' : 'none' }} />
          </button>
          {showSort && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              background: 'var(--ash)', border: '1px solid rgba(255,255,255,0.08)',
              minWidth: '200px', zIndex: 50,
              clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)',
            }}>
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => { setSortBy(opt); setShowSort(false) }}
                  style={{
                    width: '100%', textAlign: 'left', background: 'none',
                    border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)',
                    padding: '12px 16px', cursor: 'pointer',
                    fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700,
                    fontSize: '13px', letterSpacing: '1.5px', textTransform: 'uppercase',
                    color: opt === sortBy ? 'var(--fire)' : 'var(--fog)',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => { if (opt !== sortBy) e.currentTarget.style.color = 'var(--chalk)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = opt === sortBy ? 'var(--fire)' : 'var(--fog)' }}
                >
                  {opt === sortBy && <Check size={12} />}
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="trfc-shop__main">

        {/* Error */}
        {error && (
          <div className="trfc-shop__error">
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="trfc-shop__loading">
            {Array(8).fill(null).map((_, i) => (
              <div key={i} className="trfc-shop__skeleton" style={{ aspectRatio: '3/4' }} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && products.length === 0 && (
          <div className="trfc-shop__empty">
            <div className="trfc-shop__empty-icon">SOLD<br />OUT</div>
            <p className="trfc-shop__empty-title">No products available right now</p>
            <p style={{ color: 'var(--fog)', fontSize: '14px', marginTop: '8px' }}>
              Check back soon — new drops coming.
            </p>
          </div>
        )}

        {/* Product grid */}
        {!loading && !error && sortedProducts.length > 0 && (
          <div className="trfc-shop__grid">
            {sortedProducts.map((product) => {
              const added = addedIds.has(product.id)
              return (
                <div key={product.id} className="trfc-shop__card">

                  {/* Image + overlay */}
                  <div className="trfc-shop__card-img-wrap">
                    <img
                      src={product.image_url || 'https://images.unsplash.com/photo-1556906781-9a412961a28d?w=500&q=80'}
                      alt={product.name}
                      className="trfc-shop__card-img"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1556906781-9a412961a28d?w=500&q=80'
                      }}
                    />
                    {isNew() && (
                      <span className="trfc-shop__card-badge trfc-shop__card-badge--new">New</span>
                    )}
                    {product.stock === 0 && (
                      <span className="trfc-shop__card-badge trfc-shop__card-badge--sold">Sold Out</span>
                    )}

                    {/* Quick-add overlay */}
                    <div className="trfc-shop__card-overlay">
                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={product.stock === 0}
                        className={`trfc-shop__quick-add${added ? ' added' : ''}`}
                      >
                        {added
                          ? <><Check size={14} /> Added!</>
                          : <><ShoppingCart size={14} /> Quick Add</>
                        }
                      </button>
                    </div>
                  </div>

                  {/* Card body (renders existing ProductCard content) */}
                  <div className="trfc-shop__card-body">
                    <ProductCard product={product} />
                    <div className="trfc-shop__card-footer">
                      <div className="trfc-shop__card-price">
                        KES {product.price?.toLocaleString?.() ?? product.price}
                      </div>
                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={product.stock === 0}
                        className={`trfc-shop__card-add-btn${added ? ' added' : ''}`}
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
      <div style={{ position: 'fixed', bottom: 32, right: 32, display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 1000 }}>
        {toasts.map((toast) => (
          <div key={toast.id} className="trfc-shop__toast">
            <div className="trfc-shop__toast-icon">
              <Check size={13} />
            </div>
            <div className="trfc-shop__toast-text">
              <div className="trfc-shop__toast-title">Added to cart</div>
              <div className="trfc-shop__toast-sub">{toast.name}</div>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}