import {
  Award,
  BookOpen,
  CalendarDays,
  CreditCard,
  Flag,
  LayoutGrid,
  Library,
  LifeBuoy,
  MapPin,
  Settings,
  Star,
  Ticket,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import { CONTACT_PATH, DASHBOARD_COPY, type SupportLink } from '../../content/dashboard'

export interface MemberNavItem {
  path: string
  label: string
  icon: LucideIcon
  /** Opens outside the app (for example WhatsApp) in a new tab. */
  external?: boolean
  /** Shown but not clickable. */
  disabled?: boolean
  badge?: string
}

export function isMemberNavActive(pathname: string, path: string) {
  if (path === '/dashboard') return pathname === '/dashboard' || pathname === '/dashboard/'
  return pathname === path || pathname.startsWith(path + '/')
}

export function memberNavItems(
  role?: string | null,
  isMember = false,
  support: SupportLink = { href: CONTACT_PATH, external: false }
): MemberNavItem[] {
  const items: MemberNavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { path: '/dashboard/tickets', label: 'My Tickets', icon: Ticket },
    { path: '/dashboard/calendar', label: 'Calendar', icon: CalendarDays },
    { path: '/dashboard/programs', label: 'My Programs', icon: BookOpen },
    { path: '/dashboard/zone', label: 'My Zone', icon: MapPin },
    isMember
      ? { path: '/dashboard/points', label: 'Points', icon: Star }
      : { path: '/dashboard/points', label: 'Points', icon: Star, disabled: true, badge: DASHBOARD_COPY.nav.membersTag },
  ]
  if (isMember) items.push({ path: '/dashboard/guides', label: 'Guides Library', icon: Library })
  items.push(
    { path: '/dashboard/wallet', label: 'Ticket value', icon: WalletCards },
    { path: '/dashboard/medals', label: 'Medals', icon: Award },
    { path: '/dashboard/payments', label: 'Payments', icon: CreditCard },
    { path: support.href, label: 'Support', icon: LifeBuoy, external: support.external },
    { path: '/dashboard/profile', label: 'Settings', icon: Settings }
  )
  if (role === 'captain') items.push({ path: '/dashboard/captain', label: 'Captain', icon: Flag })
  return items
}
