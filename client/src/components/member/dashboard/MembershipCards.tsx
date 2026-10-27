import { Check } from 'lucide-react'
import { DASHBOARD_COPY } from '../../../content/dashboard'
import { PROGRAMS, PROGRAM_ORDER, formatKsh } from '../../../content/programs'
import CtaButton from '../../programs/CtaButton'
import { dashCard, dashHeading, dashMuted } from './ui'

export function BecomeMemberCard() {
  const copy = DASHBOARD_COPY.becomeMember
  return (
    <div className={`${dashCard} border-cta/40 light:border-cta`}>
      <span className="inline-block rounded-full bg-cta text-cta-ink px-3 py-1 font-barlow font-semibold text-xs">
        {copy.badge}
      </span>
      <h2 className={`${dashHeading} mt-3`}>{copy.heading}</h2>
      <p className={`${dashMuted} mt-2`}>{copy.body}</p>
      <ul className="mt-4 space-y-2">
        {copy.benefits.map((b) => (
          <li key={b} className="flex items-start gap-3 text-chalk light:text-chalk-light">
            <Check size={18} aria-hidden="true" className="shrink-0 mt-0.5 text-cta light:text-chalk-light" />
            {b}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function MemberPriceCard() {
  const copy = DASHBOARD_COPY.memberPrice
  const paid = PROGRAM_ORDER.map((id) => PROGRAMS[id]).filter((p) => p.price > 0)
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
  const copy = DASHBOARD_COPY.perks
  return (
    <div className={dashCard}>
      <h2 className={`${dashHeading} mb-4`}>{copy.heading}</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {copy.items.map((item) => (
          <div key={item.title} className="rounded-xl bg-smoke/50 light:bg-smoke-light/60 p-4">
            <p className="font-barlow font-semibold text-chalk light:text-chalk-light">{item.title}</p>
            <p className={`${dashMuted} mt-1`}>{item.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
