import {
  BadgeCheck,
  Camera,
  Flag,
  Gift,
  Handshake,
  HeartPulse,
  Library,
  Medal,
  Mountain,
  Percent,
  Repeat,
  ShieldCheck,
  Shirt,
  Sparkles,
  Star,
  Ticket,
  UserPlus,
  Video,
  Vote,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { MemberPerk } from '../../../api/membership'
import { MEMBERSHIP_COPY } from '../../../content/membership'
import { dashMuted } from '../dashboard/ui'

export const PERK_ICONS: Record<string, LucideIcon> = {
  BadgeCheck,
  Camera,
  Flag,
  Gift,
  Handshake,
  HeartPulse,
  Library,
  Medal,
  Mountain,
  Percent,
  Repeat,
  ShieldCheck,
  Shirt,
  Sparkles,
  Star,
  Ticket,
  UserPlus,
  Video,
  Vote,
}

export const perkIcon = (name: string | null) => (name && PERK_ICONS[name]) || Sparkles

function PerkAction({ perk }: { perk: MemberPerk }) {
  if (!perk.linkUrl) return null
  const label = perk.buttonLabel || 'Open'
  const className =
    'inline-block mt-2 font-barlow font-semibold text-sm text-cta light:text-chalk-light underline underline-offset-4'
  return perk.linkUrl.startsWith('/') ? (
    <Link to={perk.linkUrl} className={className}>
      {label}
    </Link>
  ) : (
    <a href={perk.linkUrl} target="_blank" rel="noopener noreferrer" className={className}>
      {label}
    </a>
  )
}

/** Perks as cards; links and buttons only show for perks that are on and when `withActions` is set. */
export default function PerkList({ perks, withActions = false }: { perks: MemberPerk[]; withActions?: boolean }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {perks.map((perk) => {
        const Icon = perkIcon(perk.icon)
        const soon = perk.status === 'coming_soon'
        return (
          <div key={perk.key} className="rounded-xl bg-smoke/50 light:bg-smoke-light/60 p-4 flex gap-3">
            <Icon size={20} aria-hidden="true" className={`shrink-0 mt-0.5 ${soon ? 'text-fog light:text-fog-light' : 'text-cta light:text-chalk-light'}`} />
            <div className="min-w-0">
              <p className="font-barlow font-semibold text-chalk light:text-chalk-light">
                {perk.title}
                {soon && (
                  <span className="ml-2 align-middle rounded-full bg-white/10 light:bg-black/10 px-2 py-0.5 text-[11px] font-semibold text-fog light:text-fog-light">
                    {MEMBERSHIP_COPY.comingSoon}
                  </span>
                )}
              </p>
              {perk.description && <p className={`${dashMuted} mt-1`}>{perk.description}</p>}
              {withActions && !soon && <PerkAction perk={perk} />}
            </div>
          </div>
        )
      })}
    </div>
  )
}
