import { describe, it, expect } from 'vitest'
import { isAdminNavActive } from '../../components/AdminLayout'

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
