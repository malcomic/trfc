import { BookOpen, Inbox, LayoutGrid, Settings, type LucideIcon } from 'lucide-react'

export interface CoachNavItem {
  path: string
  label: string
  icon: LucideIcon
}

export function isCoachNavActive(pathname: string, path: string) {
  if (path === '/dashboard/coach') return pathname === '/dashboard/coach' || pathname === '/dashboard/coach/'
  return pathname === path || pathname.startsWith(path + '/')
}

export const coachNavItems: CoachNavItem[] = [
  { path: '/dashboard/coach', label: 'Overview', icon: LayoutGrid },
  { path: '/dashboard/coach/programs', label: 'My programs', icon: BookOpen },
  { path: '/dashboard/coach/inbox', label: 'Inbox', icon: Inbox },
  { path: '/dashboard/coach/profile', label: 'Settings', icon: Settings },
]
