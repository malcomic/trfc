import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMedals, MedalTier } from '../api/medals'
import { AlertCircle, ChevronRight, Award } from 'lucide-react'
import { pageRoot } from '../utils/themeClasses'
import { getSafeImageUrl } from '../utils/imageUrl'

const MEDAL_FALLBACK =
  'https://images.unsplash.com/photo-1461896836934-ffe607ba6851?w=800&q=80'

const TIER_ACCENT: Record<string, string> = {
  bronze: 'from-amber-700/40 to-amber-900/20',
  silver: 'from-slate-400/30 to-slate-600/20',
  gold: 'from-yellow-500/35 to-amber-600/20',
}

export default function Medals() {
  const [tiers, setTiers] = useState<MedalTier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const data = await getMedals()
        setTiers(data)
      } catch (err) {
        setError('Failed to load medals. Please try again.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className={pageRoot}>
      <section className="relative overflow-hidden bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] py-16 md:py-20">
        <div className="absolute left-0 top-0 bottom-0 w-0.75 bg-gradient-to-b from-transparent via-accent light:via-accent-light to-transparent opacity-70" />
        <div className="max-w-5xl mx-auto relative z-1">
          <div className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light flex items-center gap-2 mb-3.5 before:w-5 before:h-0.5 before:bg-accent light:before:bg-accent-light">
            Challenge Medals
          </div>
          <h1 className="font-bebas text-clamp-lg leading-tight text-chalk light:text-chalk-light mb-6 tracking-tighter">
            EARN YOUR<br />
            <span className="text-transparent [-webkit-text-stroke:2px_#fff] light:[-webkit-text-stroke:2px_#000]">
              MEDAL
            </span>
          </h1>
          <p className="text-fog light:text-fog-light max-w-2xl leading-relaxed">
            Choose Bronze, Silver, or Gold — then pick your distance and complete payment to claim your challenge medal.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-[6%] py-12 pb-20">
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-80 bg-smoke light:bg-smoke-light animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-6 flex gap-4">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-red-300 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-accent light:bg-accent-light text-black light:text-white px-4 py-2 clip-angled-sm"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && !error && tiers.length === 0 && (
          <div className="text-center py-16 text-fog light:text-fog-light">
            <Award className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No medal challenges available right now.</p>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tiers.map((tier) => (
              <Link
                key={tier.id}
                to={`/medals/${tier.slug}`}
                className="group relative block no-underline overflow-hidden border border-white/8 light:border-black/10 bg-ash light:bg-ash-light hover:border-accent/40 light:hover:border-accent-light/40 transition"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${TIER_ACCENT[tier.slug] || 'from-accent/20 to-transparent'} opacity-80 pointer-events-none`}
                />
                <img
                  src={getSafeImageUrl(tier.image_url, MEDAL_FALLBACK)}
                  alt={tier.name}
                  className="relative w-full h-48 object-cover brightness-75 group-hover:brightness-90 transition"
                />
                <div className="relative p-6">
                  <h2 className="font-bebas text-4xl text-chalk light:text-chalk-light tracking-tight mb-2">
                    {tier.name}
                  </h2>
                  <p className="text-sm text-fog light:text-fog-light line-clamp-2 mb-4">
                    {tier.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="font-bebas text-2xl text-accent light:text-accent-light">
                      {tier.min_price != null
                        ? `From KES ${Number(tier.min_price).toLocaleString()}`
                        : 'See options'}
                    </span>
                    <ChevronRight className="text-accent light:text-accent-light group-hover:translate-x-1 transition" size={20} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
