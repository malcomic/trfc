import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getProductCategories } from '../api/productCategories'
import { getMedals, type MedalTier } from '../api/medals'
import { ProductCategory } from '../types'
import { AlertCircle, Award, ChevronRight } from 'lucide-react'
import { pageRoot } from '../utils/themeClasses'
import { getSafeImageUrl } from '../utils/imageUrl'

const CATEGORY_FALLBACK =
  'https://images.unsplash.com/photo-1556906781-9a412961a28d?w=800&q=80'
const MEDAL_FALLBACK =
  'https://images.unsplash.com/photo-1461896836934-ffe607ba6851?w=800&q=80'

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

interface CategoryTileProps {
  to: string
  name: string
  imageUrl: string
  fallback: string
  countLabel: string
  description?: string | null
  badge?: React.ReactNode
}

function CategoryTile({ to, name, imageUrl, fallback, countLabel, description, badge }: CategoryTileProps) {
  return (
    <Link
      to={to}
      className="group relative block no-underline overflow-hidden bg-ash light:bg-ash-light border border-white/8 light:border-black/10 hover:border-accent/40 light:hover:border-accent-light/40 transition-all duration-250 hover:-translate-y-0.75"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-smoke light:bg-smoke-light">
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover brightness-75 saturate-85 transition-all duration-500 ease-out group-hover:scale-105 group-hover:brightness-90 group-hover:saturate-100"
          onError={(e) => {
            ;(e.target as HTMLImageElement).src = fallback
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        {badge && <div className="absolute top-3 left-3 z-1">{badge}</div>}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h2 className="font-bebas text-4xl text-white tracking-tight leading-none uppercase">{name}</h2>
          <p className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-white/70 mt-1.5">
            {countLabel}
          </p>
        </div>
      </div>
      <div className="px-5 py-4 flex items-center justify-between gap-3 border-t border-white/5 light:border-black/8">
        <p className="text-sm text-fog light:text-fog-light line-clamp-1">
          {description || `Shop ${name.toLowerCase()}`}
        </p>
        <ChevronRight className="text-accent light:text-accent-light shrink-0 group-hover:translate-x-1 transition" size={18} />
      </div>
    </Link>
  )
}

export default function Shop() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [medals, setMedals] = useState<MedalTier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const legacyCategory = searchParams.get('category')

  useEffect(() => {
    if (!legacyCategory) return
    if (legacyCategory.toLowerCase() === 'medals') {
      navigate('/medals', { replace: true })
    } else if (legacyCategory.toLowerCase() !== 'all' && slugify(legacyCategory)) {
      navigate(`/shop/c/${slugify(legacyCategory)}`, { replace: true })
    } else {
      navigate('/shop', { replace: true })
    }
  }, [legacyCategory, navigate])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const [categoryData, medalData] = await Promise.all([
          getProductCategories(),
          getMedals().catch(() => [] as MedalTier[]),
        ])
        setCategories(Array.isArray(categoryData) ? categoryData : [])
        setMedals(Array.isArray(medalData) ? medalData : [])
      } catch (err) {
        setError('Failed to load the shop. Please try again.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const showMedalsCard = medals.length > 0
  const totalCategories = categories.length + (showMedalsCard ? 1 : 0)
  const categoryNames = [...categories.map((c) => c.name), ...(showMedalsCard ? ['Medals'] : [])]

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
            <p className="text-fog light:text-fog-light mt-4 max-w-md leading-relaxed">
              Represent the movement with official TRFC merchandise and challenge medals. Pick a category to start shopping.
            </p>
          </div>
          <div className="pb-2">
            {categoryNames.length > 0 && (
              <p className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog light:text-fog-light mb-2">
                {categoryNames.join(' · ')}
              </p>
            )}
            <p className="font-barlow-condensed font-bold text-sm tracking-widest text-fog light:text-fog-light">
              {loading ? '—' : `${totalCategories} categor${totalCategories !== 1 ? 'ies' : 'y'}`}
            </p>
          </div>
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
              <span className="font-bebas text-xs tracking-widest text-night light:text-night-light px-9">OFFICIAL TRFC GEAR</span>
              <span className="font-bebas text-xs tracking-widest text-night/40 light:text-night-light/40 px-9">✦</span>
              <span className="font-bebas text-xs tracking-widest text-night light:text-night-light px-9">WEAR THE COMMUNITY</span>
              <span className="font-bebas text-xs tracking-widest text-night/40 light:text-night-light/40 px-9">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Categories ── */}
      <div className="max-w-5xl mx-auto px-[6%] py-12 pb-20">
        <div className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog light:text-fog-light mb-6">
          Shop by category
        </div>

        {error && (
          <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 border-l-4 border-l-red-500 px-4 py-3.5 mb-8 text-sm text-red-600 dark:text-red-400">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.25" />
            <span>{error}</span>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array(6).fill(null).map((_, i) => (
              <div key={i} className="bg-ash light:bg-ash-light animate-pulse" style={{ aspectRatio: '4/3.6' }} />
            ))}
          </div>
        )}

        {!loading && !error && totalCategories === 0 && (
          <div className="text-center py-25">
            <div className="font-bebas text-clamp-2xl text-accent/10 light:text-accent-light/10 leading-none mb-4 tracking-tighter">COMING<br />SOON</div>
            <p className="font-barlow-condensed font-bold text-xl tracking-widest uppercase text-fog light:text-fog-light mb-2">
              No products available right now
            </p>
            <p className="text-sm text-fog light:text-fog-light">
              Check back soon — new drops coming.
            </p>
          </div>
        )}

        {!loading && !error && totalCategories > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {categories.map((category) => {
              const count = category.product_count ?? 0
              return (
                <CategoryTile
                  key={category.id}
                  to={`/shop/c/${category.slug}`}
                  name={category.name}
                  imageUrl={getSafeImageUrl(category.image_url, CATEGORY_FALLBACK)}
                  fallback={CATEGORY_FALLBACK}
                  countLabel={`${count} product${count !== 1 ? 's' : ''}`}
                  description={category.description}
                />
              )
            })}

            {showMedalsCard && (
              <CategoryTile
                to="/medals"
                name="Medals"
                imageUrl={getSafeImageUrl(medals[0]?.image_url, MEDAL_FALLBACK)}
                fallback={MEDAL_FALLBACK}
                countLabel={`${medals.length} tier${medals.length !== 1 ? 's' : ''}`}
                description="Challenge medals — Bronze, Silver and Gold"
                badge={
                  <span className="flex items-center gap-1.5 font-barlow-condensed font-black text-xs tracking-widest uppercase px-2.5 py-1 bg-accent light:bg-accent-light text-black light:text-white">
                    <Award size={12} /> Challenge
                  </span>
                }
              />
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes shopTicker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}
