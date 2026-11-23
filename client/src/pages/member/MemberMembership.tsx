import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Loader } from 'lucide-react'
import {
  getMyMembership,
  getShopDiscount,
  type MyMembership,
  type ShopDiscount,
} from '../../api/membership'
import {
  MEMBERSHIP_COPY,
  kes,
  memberDate,
  renewalState,
} from '../../content/membership'
import { useMemberDashboard } from '../../context/MemberDashboardContext'
import MemberPageHeader from '../../components/member/MemberPageHeader'
import LiveQaCard from '../../components/member/membership/LiveQaCard'
import MemberBadge from '../../components/member/membership/MemberBadge'
import MembershipPayBox from '../../components/member/membership/MembershipPayBox'
import PerkList from '../../components/member/membership/PerkList'
import { dashCard, dashHeading, dashMuted } from '../../components/member/dashboard/ui'

const copy = MEMBERSHIP_COPY

function History({ membership }: { membership: MyMembership }) {
  return (
    <div className={dashCard}>
      <h2 className={`${dashHeading} mb-3`}>{copy.history.heading}</h2>
      {membership.history.length === 0 ? (
        <p className={dashMuted}>{copy.history.empty}</p>
      ) : (
        <ul className="divide-y divide-white/5 light:divide-black/8">
          {membership.history.map((year) => (
            <li key={year.id} className="py-3 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="font-barlow font-semibold text-chalk light:text-chalk-light">
                  {memberDate(year.startsAt)} to {memberDate(year.endsAt)}
                </p>
                <p className={dashMuted}>
                  {copy.history.type[year.priceType] ?? year.priceType}
                  {year.amount > 0 && ` · ${kes(year.amount)}`}
                  {year.receipt && ` · ${copy.history.receipt} ${year.receipt}`}
                </p>
              </div>
              {year.status === 'cancelled' && (
                <span className="text-xs font-semibold text-red-400 light:text-red-700">{copy.history.cancelled}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function MemberMembership() {
  const { refreshAll, notify } = useMemberDashboard()
  const [membership, setMembership] = useState<MyMembership | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(
    () =>
      getMyMembership()
        .then((m) => {
          setMembership(m)
          setError('')
        })
        .catch((err: any) => setError(err?.response?.data?.error || copy.loadError))
        .finally(() => setLoading(false)),
    []
  )

  const [shopDiscount, setShopDiscount] = useState<ShopDiscount | null>(null)

  useEffect(() => {
    void load()
    getShopDiscount().then(setShopDiscount).catch(() => setShopDiscount(null))
  }, [load])

  const onPaid = useCallback(() => {
    void load()
    refreshAll()
  }, [load, refreshAll])

  const onSuccess = useCallback(() => {
    notify('success', copy.success.title, copy.success.body)
    onPaid()
  }, [notify, onPaid])

  const header = <MemberPageHeader title={copy.title} highlight={copy.highlight} subtitle={copy.subtitle} />

  if (loading) {
    return (
      <>
        {header}
        <div className="flex justify-center py-16">
          <Loader className="w-10 h-10 animate-spin text-cta" />
        </div>
      </>
    )
  }
  if (error || !membership) {
    return (
      <>
        {header}
        <div className="bg-red-500/10 border border-red-500/20 p-4 flex gap-3 text-red-300 light:text-red-700 text-sm">
          <AlertCircle size={18} /> {error || copy.loadError}
        </div>
      </>
    )
  }

  const state = renewalState(membership)
  const onPerks = membership.perks.filter((p) => p.status === 'on')

  if (membership.active) {
    return (
      <>
        {header}
        <div className="space-y-6">
          <div className={dashCard}>
            <MemberBadge founding={membership.isFounding} />
            <h2 className={`${dashHeading} mt-3`}>{copy.active.until(memberDate(membership.until!))}</h2>
          </div>
          {state === 'renew_soon' && (
            <MembershipPayBox
              membership={membership}
              heading={copy.active.renewHeading}
              note={copy.active.renewBody(memberDate(membership.quote.startsAt))}
              onPaid={onSuccess}
              onRefresh={onPaid}
            />
          )}
          {membership.perks.some((p) => p.key === 'live_qa' && p.status === 'on') && <LiveQaCard />}
          <div className={dashCard}>
            <h2 className={`${dashHeading} mb-4`}>{copy.active.yourPerks}</h2>
            <PerkList perks={[...onPerks, ...membership.perks.filter((p) => p.status === 'coming_soon')]} withActions />
          </div>
          {shopDiscount?.isMember && (
            <div className={dashCard}>
              <h2 className={`${dashHeading} mb-2`}>{copy.shopDiscount.statusHeading}</h2>
              <p className={dashMuted}>
                {shopDiscount.available
                  ? copy.shopDiscount.available(kes(shopDiscount.amount))
                  : shopDiscount.usedOrderId
                    ? copy.shopDiscount.used(shopDiscount.usedOrderId.slice(0, 8).toUpperCase())
                    : copy.shopDiscount.usedNote}
              </p>
            </div>
          )}
          <History membership={membership} />
        </div>
      </>
    )
  }

  return (
    <>
      {header}
      <div className="space-y-6">
        <div className={dashCard}>
          {state === 'grace' ? (
            <>
              <h2 className={dashHeading}>{copy.grace.heading}</h2>
              <p className={`${dashMuted} mt-2`}>
                {copy.grace.body(kes(membership.quote.amount), memberDate(membership.renewalUntil!))}
              </p>
            </>
          ) : state === 'lapsed' ? (
            <>
              <h2 className={dashHeading}>{copy.lapsed.heading}</h2>
              <p className={`${dashMuted} mt-2`}>{copy.lapsed.body}</p>
            </>
          ) : (
            <>
              <h2 className={dashHeading}>{copy.hero.heading}</h2>
              <p className={`${dashMuted} mt-2`}>{copy.hero.body}</p>
            </>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className={`${dashCard} lg:col-span-2`}>
            <h2 className={`${dashHeading} mb-4`}>{copy.perksHeading}</h2>
            <PerkList perks={membership.perks} />
          </div>
          <MembershipPayBox membership={membership} heading={copy.price.heading} onPaid={onSuccess} onRefresh={onPaid} />
        </div>
        {membership.history.length > 0 && <History membership={membership} />}
      </div>
    </>
  )
}
