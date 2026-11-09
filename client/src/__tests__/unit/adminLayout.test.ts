import { describe, it, expect } from 'vitest'
import { isAdminNavActive } from '../../components/AdminLayout'
import {
  adminNavEntries,
  findActiveGroupId,
  isNavGroup,
} from '../../components/admin/adminNav'

describe('isAdminNavActive', () => {
  it('matches /admin exactly for dashboard', () => {
    expect(isAdminNavActive('/admin', '/admin')).toBe(true)
    expect(isAdminNavActive('/admin/events', '/admin')).toBe(false)
    expect(isAdminNavActive('/admin/analytics', '/admin')).toBe(false)
  })

  it('matches nested paths for section routes', () => {
    expect(isAdminNavActive('/admin/events', '/admin/events')).toBe(true)
    expect(isAdminNavActive('/admin/events/123', '/admin/events')).toBe(true)
    expect(isAdminNavActive('/admin/products', '/admin/events')).toBe(false)
  })
})

describe('findActiveGroupId', () => {
  it('finds the group holding the current page', () => {
    expect(findActiveGroupId('/admin/site-images')).toBe('media')
    expect(findActiveGroupId('/admin/testimonials')).toBe('media')
    expect(findActiveGroupId('/admin/captains/5')).toBe('members')
    expect(findActiveGroupId('/admin/wallets')).toBe('events')
  })

  it('returns null for pages outside any group', () => {
    expect(findActiveGroupId('/admin')).toBeNull()
    expect(findActiveGroupId('/admin/appearance')).toBeNull()
    expect(findActiveGroupId('/admin/scan')).toBeNull()
  })
})

describe('adminNavEntries', () => {
  const allPaths = adminNavEntries.flatMap((e) =>
    isNavGroup(e) ? e.children.map((c) => c.path) : [e.path]
  )

  it('lists every page exactly once', () => {
    expect(new Set(allPaths).size).toBe(allPaths.length)
  })

  it('keeps all existing admin pages', () => {
    const expected = [
      '/admin',
      '/admin/scan',
      '/admin/analytics',
      '/admin/reports',
      '/admin/events',
      '/admin/medals',
      '/admin/products',
      '/admin/gallery',
      '/admin/site-images',
      '/admin/page-videos',
      '/admin/orders',
      '/admin/signups',
      '/admin/programs',
      '/admin/reach-out',
      '/admin/users',
      '/admin/announcements',
      '/admin/captains',
      '/admin/zones',
      '/admin/hiring',
      '/admin/testimonials',
      '/admin/equipment',
      '/admin/tickets',
      '/admin/wallets',
      '/admin/partnerships',
      '/admin/sponsorship-tiers',
      '/admin/appearance',
    ]
    expect([...allPaths].sort()).toEqual([...expected].sort())
  })

  it('has no empty groups and unique group ids', () => {
    const groups = adminNavEntries.filter(isNavGroup)
    expect(groups.every((g) => g.children.length > 0)).toBe(true)
    const ids = groups.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
