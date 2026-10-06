import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getUserMedalPurchases, UserMedalPurchase } from '../api/medals'
import { AlertCircle, Loader, Award, ArrowLeft } from 'lucide-react'
import { pageRoot, cardSurface } from '../utils/themeClasses'
import MedalDownloadButton from '../components/MedalDownloadButton'
import MedalResendButton from '../components/MedalResendButton'

export default function MyMedals() {
  const [purchases, setPurchases] = useState<UserMedalPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getUserMedalPurchases()
        setPurchases(data)
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load medals')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className={pageRoot}>
      <section className="bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-14 pb-11">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/account"
            className="inline-flex items-center gap-2 text-accent light:text-accent-light text-sm mb-4 no-underline hover:underline"
          >
            <ArrowLeft size={14} /> Account
          </Link>
          <h1 className="font-bebas text-5xl text-chalk light:text-chalk-light">
            MY <span className="text-accent light:text-accent-light">MEDALS</span>
          </h1>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-[6%] py-10 pb-20">
        {loading && (
          <div className="flex justify-center py-16">
            <Loader className="w-10 h-10 animate-spin text-accent light:text-accent-light" />
          </div>
        )}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 flex gap-3 text-red-300 text-sm">
            <AlertCircle size={18} /> {error}
          </div>
        )}
        {!loading && !error && purchases.length === 0 && (
          <div className="text-center py-16 text-fog light:text-fog-light">
            <Award className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No medals yet.</p>
            <Link
              to="/medals"
              className="text-accent light:text-accent-light mt-4 inline-block no-underline hover:underline"
            >
              Browse medals
            </Link>
          </div>
        )}
        <div className="space-y-4">
          {purchases.map((p) => (
            <div
              key={p.id}
              className={`${cardSurface} p-5 flex flex-wrap gap-4 justify-between items-start`}
            >
              <div>
                <h3 className="font-barlow-condensed font-bold text-lg">{p.tier_name}</h3>
                <p className="text-sm text-fog light:text-fog-light">{p.distance_km} km</p>
                <p className="text-sm text-fog light:text-fog-light mt-1">
                  {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                </p>
              </div>
              <div className="text-right space-y-3">
                <span
                  className={`inline-block px-3 py-1 text-xs font-bold uppercase ${
                    p.payment_status === 'paid'
                      ? 'bg-green-500/20 text-green-400'
                      : p.payment_status === 'failed'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                  }`}
                >
                  {p.payment_status}
                </span>
                {p.price != null && (
                  <p className="font-bebas text-xl text-accent light:text-accent-light">
                    KES {Number(p.price).toLocaleString()}
                  </p>
                )}
                {p.payment_status === 'paid' && (
                  <div className="flex flex-wrap gap-2 justify-end">
                    <MedalDownloadButton
                      purchaseId={p.id}
                      paymentStatus={p.payment_status}
                      compact
                    />
                    <MedalResendButton
                      purchaseId={p.id}
                      paymentStatus={p.payment_status}
                      compact
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
