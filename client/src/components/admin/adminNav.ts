import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Package,
  Image,
  Images,
  ImagePlus,
  Film,
  ShoppingCart,
  Store,
  Users,
  UsersRound,
  BarChart3,
  TrendingUp,
  FileText,
  MessageSquare,
  Wrench,
  Ticket,
  Award,
  Handshake,
  Layers,
  Type,
  QrCode,
  UserPlus,
  HeartHandshake,
  Flag,
  MapPin,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export type AdminNavLink = { path: string; label: string; icon: LucideIcon }
export type AdminNavGroup = {
  id: string
  label: string
  icon: LucideIcon
  children: AdminNavLink[]
}
export type AdminNavEntry = AdminNavLink | AdminNavGroup

export const adminNavEntries: AdminNavEntry[] = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/scan', label: 'Scanner', icon: QrCode },
  {
    id: 'insights',
    label: 'Insights',
    icon: TrendingUp,
    children: [
      { path: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
      { path: '/admin/reports', label: 'Reports', icon: FileText },
    ],
  },
  {
    id: 'events',
    label: 'Events & Tickets',
    icon: CalendarDays,
    children: [
      { path: '/admin/events', label: 'Events', icon: Calendar },
      { path: '/admin/tickets', label: 'Tickets', icon: Ticket },
      { path: '/admin/wallets', label: 'Ticket value', icon: Wallet },
      { path: '/admin/medals', label: 'Medals', icon: Award },
      { path: '/admin/equipment', label: 'Equipment', icon: Wrench },
    ],
  },
  {
    id: 'shop',
    label: 'Shop',
    icon: Store,
    children: [
      { path: '/admin/products', label: 'Products', icon: Package },
      { path: '/admin/orders', label: 'Orders', icon: ShoppingCart },
    ],
  },
  {
    id: 'members',
    label: 'Members',
    icon: UsersRound,
    children: [
      { path: '/admin/signups', label: 'Signups', icon: UserPlus },
      { path: '/admin/reach-out', label: 'Reach Out', icon: HeartHandshake },
      { path: '/admin/users', label: 'Users', icon: Users },
      { path: '/admin/captains', label: 'Captains', icon: Flag },
      { path: '/admin/zones', label: 'Zones', icon: MapPin },
    ],
  },
  {
    id: 'media',
    label: 'Media',
    icon: Images,
    children: [
      { path: '/admin/gallery', label: 'Gallery', icon: Image },
      { path: '/admin/site-images', label: 'Site Images', icon: ImagePlus },
      { path: '/admin/page-videos', label: 'Page Videos', icon: Film },
      { path: '/admin/testimonials', label: 'Testimonials', icon: MessageSquare },
    ],
  },
  {
    id: 'partners',
    label: 'Partners',
    icon: Handshake,
    children: [
      { path: '/admin/partnerships', label: 'Partnerships', icon: Handshake },
      { path: '/admin/sponsorship-tiers', label: 'Sponsorship Tiers', icon: Layers },
    ],
  },
  { path: '/admin/appearance', label: 'Appearance', icon: Type },
]

export function isNavGroup(entry: AdminNavEntry): entry is AdminNavGroup {
  return 'children' in entry
}

export function isAdminNavActive(pathname: string, path: string) {
  if (path === '/admin') {
    return pathname === '/admin'
  }
  return pathname === path || pathname.startsWith(path + '/')
}

export function findActiveGroupId(pathname: string): string | null {
  for (const entry of adminNavEntries) {
    if (isNavGroup(entry) && entry.children.some((c) => isAdminNavActive(pathname, c.path))) {
      return entry.id
    }
  }
  return null
}
