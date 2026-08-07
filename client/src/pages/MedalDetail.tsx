import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AlertCircle, Minus, Plus, Award, Check } from 'lucide-react'
import { getMedalBySlug, MedalTier, MedalOption } from '../api/medals'
import { pageRoot, cardSurface, inputField } from '../utils/themeClasses'
import { getSafeImageUrl } from '../utils/imageUrl'

const MEDAL_FALLBACK =
  'https://images.unsplash.com/photo-1461896836934-ffe607ba6851?w=800&q=80'

export default function MedalDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [tier, setTier] = useState<MedalTier | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedOption, setSelectedOption] = useState<MedalOption | null>(null)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (slug) fetchTier()
  }, [slug])

  const fetchTier = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await getMedalBySlug(slug!)
      setTier(data)
      if (data.options?.length) {
        setSelectedOption(data.options[0])
      }
    } catch (err) {
      setError('Failed to load medal')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={pageRoot}>
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="h-96 bg-smoke light:bg-smoke-light animate-pulse mb-8" />
          <div className="h-8 bg-smoke light:bg-smoke-light animate-pulse w-2/3 mb-4" />
          <div className="h-4 bg-smoke light:bg-smoke-light animate-pulse w-full mb-2" />
        </div>
      </div>
    )
  }

  if (!tier || error) {
    return (
      <div className={`${pageRoot} py-16 px-6`}>
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/20 border-l-4 border-l-red-500 p-6 flex gap-4">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-red-300 mb-4">{error || 'Medal not found'}</p>
              <button
                onClick={() => (error ? fetchTier() : navigate('/shop?category=Medals'))}
                className="bg-accent light:bg-accent-light text-black light:text-white px-4 py-2 clip-angled-sm"
              >
                {error ? 'Retry' : 'Back to Medals'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const unitPrice = selectedOption ? Number(selectedOption.price) : 0
  const total = unitPrice * quantity

  return (
    <div className={pageRoot}>
      <section className="bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-14 pb-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/shop?category=Medals')}
            className="text-accent light:text-accent-light text-sm mb-4 bg-transparent border-0 cursor-pointer font-barlow-condensed font-bold hover:underline"
          >
            ← Back to Medals
          </button>
          <h1 className="font-bebas text-6xl md:text-7xl leading-none tracking-tight text-chalk light:text-chalk-light">
            {tier.name}
          </h1>
          {tier.description && (
            <p className="text-fog light:text-fog-light mt-3 max-w-xl leading-relaxed">
              {tier.description}
            </p>
          )}
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-[6%] py-10 pb-20">
        <img
          src={getSafeImageUrl(tier.image_url, MEDAL_FALLBACK)}
          alt={tier.name}
          className="w-full h-72 md:h-80 object-cover brightness-85 clip-angled mb-8"
        />

        {tier.benefits?.length > 0 && (
          <ul className="mb-8 space-y-2">
            {tier.benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2 text-fog light:text-fog-light">
                <Check size={16} className="text-accent light:text-accent-light flex-shrink-0 mt-1" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        )}

        <div className={`${cardSurface} p-6`}>
          <label className="block font-barlow-condensed font-bold text-sm tracking-widest uppercase text-accent light:text-accent-light mb-4">
            Distance
          </label>
          <div className="flex flex-wrap gap-2 mb-6">
            {tier.options.map((opt) => {
              const active = selectedOption?.id === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedOption(opt)}
                  className={`px-5 py-3 font-barlow-condensed font-bold text-sm tracking-widest uppercase transition border ${
                    active
                      ? 'bg-accent light:bg-accent-light text-black light:text-white border-accent light:border-accent-light'
                      : `${inputField} hover:border-accent/40 light:hover:border-accent-light/40`
                  }`}
                >
                  {opt.distance_km} km
                </button>
              )
            })}
          </div>

          <label className="block font-barlow-condensed font-bold text-sm tracking-widest uppercase text-accent light:text-accent-light mb-4">
            Quantity
          </label>
          <div className="flex items-center gap-4 mb-6">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className={`w-10 h-10 flex items-center justify-center hover:bg-accent light:hover:bg-accent-light hover:text-white transition ${inputField}`}
            >
              <Minus size={16} />
            </button>
            <span className="font-bebas text-3xl w-12 text-center">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(Math.min(10, quantity + 1))}
              className={`w-10 h-10 flex items-center justify-center hover:bg-accent light:hover:bg-accent-light hover:text-white transition ${inputField}`}
            >
              <Plus size={16} />
            </button>
            <span className="text-fog light:text-fog-light ml-4">
              Total:{' '}
              <strong className="text-accent light:text-accent-light font-bebas text-2xl">
                KES {total.toLocaleString()}
              </strong>
            </span>
          </div>

          <button
            type="button"
            disabled={!selectedOption}
            onClick={() =>
              navigate(`/medals/${slug}/checkout`, {
                state: { optionId: selectedOption!.id, quantity },
              })
            }
            className="w-full bg-accent light:bg-accent-light text-black light:text-white py-4 font-barlow-condensed font-black text-sm tracking-widest uppercase clip-angled hover:bg-accent/90 light:hover:bg-accent-light/90 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Award size={18} />
            Continue to Payment
          </button>
        </div>
      </div>
    </div>
  )
}
