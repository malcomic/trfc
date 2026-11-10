import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { DASHBOARD_COPY } from '../../../content/dashboard'
import { MEMBERSHIP_COPY, foundingLine, kes, memberDate, type RenewalState } from '../../../content/membership'
import { formatKsh } from '../../../content/programs'
import { usePrograms } from '../../../context/ProgramsContext'
import { getMemberPerks, type PublicPerks } from '../../../api/membership'
import CtaButton from '../../programs/CtaButton'
import PerkList from '../membership/PerkList'
import { dashCard, dashHeading, dashMuted } from './ui'

let perksRequest: Promise<PublicPerks> | null = null

function usePublicPerks() {
  const [data, setData] = useState<PublicPerks | null>(null)
  useEffect(() => {
    let cancelled = false
    perksRequest ??= getMemberPerks().catch((error) => {
      perksRequest = null
      throw error
    })
    perksRequest.then((d) => !cancelled && setData(d)).catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])
  return data
}

export function BecomeMemberCard() {
  const copy = MEMBERSHIP_COPY.becomeMember
  const data = usePublicPerks()
  const price = data?.price
  const foundingOpen = price ? price.foundingLeft > 0 : false
  const benefits = data
    ? data.perks.filter((p) => p.status === 'on').slice(0, 4).map((p) => p.title)
    : DASHBOARD_COPY.becomeMember.benefits
  return (
    <div className={`${dashCard} border-cta/40 light:border-cta`}>
      <span className="inline-block rounded-full bg-cta text-cta-ink px-3 py-1 font-barlow font-semibold text-xs">
        {price && !price.available && price.reason === 'opens'
          ? copy.badge(memberDate(price.salesOpenAt, false))
          : copy.badgeOpen}
      </span>
      <h2 className={`${dashHeading} mt-3`}>{copy.heading}</h2>
      <p className={`${dashMuted} mt-2`}>{copy.body}</p>
      {price && (
        <>
          <p className="mt-3 font-barlow font-semibold text-chalk light:text-chalk-light">
            {copy.from(kes(foundingOpen ? price.founding : price.standard))}
          </p>
          {foundingOpen && (
            <p className="text-sm font-semibold text-cta light:text-chalk-light">
              {foundingLine(price.foundingLeft, price.foundingLimit, price.foundingDeadline)}
            </p>
          )}
        </>
      )}
      <ul className="mt-4 space-y-2">
        {benefits.map((b) => (
          <li key={b} className="flex items-start gap-3 text-chalk light:text-chalk-light">
            <Check size={18} aria-hidden="true" className="shrink-0 mt-0.5 text-cta light:text-chalk-light" />
            {b}
          </li>
        ))}
      </ul>
      <CtaButton to="/dashboard/membership" size="sm" className="mt-5">
        {copy.button}
      </CtaButton>
    </div>
  )
}

export function MemberPriceCard() {
  const copy = DASHBOARD_COPY.memberPrice
  const paid = usePrograms().programs.filter((p) => p.price > 0)
  return (
    <div className={dashCard}>
      <h2 className={dashHeading}>{copy.heading}</h2>
      <p className={`${dashMuted} mt-2`}>{copy.body}</p>
      <ul className="mt-4 divide-y divide-white/5 light:divide-black/8">
        {paid.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
            <span className="font-barlow font-semibold text-chalk light:text-chalk-light">{p.name}</span>
            <span className="text-right">
              <s className="text-fog light:text-fog-light text-sm mr-2">{formatKsh(p.price)}</s>
              <span className="font-barlow font-semibold text-chalk light:text-chalk-light">{formatKsh(p.memberPrice)}</span>
            </span>
          </li>
        ))}
      </ul>
      <CtaButton to="/programs" size="sm" className="mt-5">
        {copy.button}
      </CtaButton>
    </div>
  )
}

export function PointsCard() {
  const copy = DASHBOARD_COPY.points
  return (
    <div className={dashCard}>
      <h2 className={dashHeading}>{copy.heading}</h2>
      <p className={`${dashMuted} mt-2`}>{copy.body}</p>
    </div>
  )
}

export function MemberPerksCard() {
  const data = usePublicPerks()
  if (!data || data.perks.length === 0) return null
  return (
    <div className={dashCard}>
      <h2 className={`${dashHeading} mb-4`}>{DASHBOARD_COPY.perks.heading}</h2>
      <PerkList perks={data.perks} withActions />
    </div>
  )
}

/** Shown on the overview in the last 30 days of a membership and in the renewal window after it ends. */
export function RenewBanner({
  state,
  until,
  renewalUntil,
  renewalPrice,
}: {
  state: RenewalState
  until: string | null
  renewalUntil: string | null
  renewalPrice: number | null
}) {
  const copy = MEMBERSHIP_COPY.banner
  if ((state !== 'renew_soon' && state !== 'grace') || !until || renewalPrice == null) return null
  const amount = kes(renewalPrice)
  const text =
    state === 'renew_soon'
      ? copy.renewSoon(memberDate(until), amount)
      : renewalUntil
        ? copy.grace(memberDate(renewalUntil), amount)
        : null
  if (!text) return null
  return (
    <div className={`${dashCard} border-cta/40 light:border-cta flex flex-wrap items-center justify-between gap-4`}>
      <p className="font-barlow font-semibold text-chalk light:text-chalk-light">{text}</p>
      <CtaButton to="/dashboard/membership" size="sm">
        {copy.button}
      </CtaButton>
    </div>
  )
}

export function usePublicMembershipPrice() {
  return usePublicPerks()?.price ?? null
}
