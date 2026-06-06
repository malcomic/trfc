import {
  Building2,
  Megaphone,
  Crown,
  Handshake,
  Star,
  Award,
  Gem,
  Trophy,
  type LucideIcon,
} from 'lucide-react'

export const SPONSORSHIP_ICON_OPTIONS = [
  'Building2',
  'Megaphone',
  'Crown',
  'Handshake',
  'Star',
  'Award',
  'Gem',
  'Trophy',
] as const

export type SponsorshipIconName = (typeof SPONSORSHIP_ICON_OPTIONS)[number]

const ICON_MAP: Record<SponsorshipIconName, LucideIcon> = {
  Building2,
  Megaphone,
  Crown,
  Handshake,
  Star,
  Award,
  Gem,
  Trophy,
}

export function getSponsorshipIcon(name: string): LucideIcon {
  if (name in ICON_MAP) {
    return ICON_MAP[name as SponsorshipIconName]
  }
  return Handshake
}
