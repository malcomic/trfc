import { useEffect, useState } from 'react'
import { AlertCircle, Loader } from 'lucide-react'
import { getUserMedalPurchases, type UserMedalPurchase } from '../../api/medals'
import { cardSurface } from '../../utils/themeClasses'
import { formatDate, formatKes } from '../../utils/captainDisplay'
import MemberPageHeader from '../../components/member/MemberPageHeader'
import StatusBadge from '../../components/member/StatusBadge'
import EmptyState from '../../components/member/EmptyState'
import MedalDownloadButton from '../../components/MedalDownloadButton'
import MedalResendButton from '../../components/MedalResendButton'

export default function MemberMedals() {
  const [medals, setMedals] = useState<UserMedalPurchase[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getUserMedalPurchases()
      .then(setMedals)
      .catch((err: any) => {
        setError(err.response?.data?.error || 'Failed to load medals')
        setMedals([])
      })
  }, [])

  return (
    <>
      <MemberPageHeader title="MY" highlight="MEDALS" subtitle="Your challenge medal purchases." />

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 p-4 flex gap-3 text-red-300 text-sm">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {medals === null ? (
        <div className="flex justify-center py-10">
          <Loader className="w-8 h-8 animate-spin text-accent light:text-accent-light" />
        </div>
      ) : medals.length === 0 ? (
        !error && <EmptyState message="No medal challenges yet." to="/medals" cta="See medal challenges" />
      ) : (
        <div className="space-y-3">
          {medals.map((m) => (
            <div key={m.id} className={`${cardSurface} p-4 flex flex-wrap justify-between gap-3 items-start`}>
              <div>
                <p className="font-barlow-condensed font-bold text-lg">{m.tier_name}</p>
                <p className="text-sm text-fog light:text-fog-light">
                  {m.distance_km} km · {formatDate(m.created_at)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={m.payment_status} />
                {m.price != null && (
                  <p className="font-bebas text-xl text-accent light:text-accent-light">{formatKes(Number(m.price))}</p>
                )}
                {m.payment_status === 'paid' && (
                  <div className="flex flex-wrap gap-2 justify-end">
                    <MedalDownloadButton purchaseId={m.id} paymentStatus={m.payment_status} compact />
                    <MedalResendButton purchaseId={m.id} paymentStatus={m.payment_status} compact />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
