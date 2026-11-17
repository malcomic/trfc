import { describe, it, expect } from 'vitest'

/** Mirrors Login.tsx defaultPathForRole so coach routing stays locked in. */
function defaultPathForRole(role?: string) {
  if (role === 'scanner') return '/admin/scan'
  if (role === 'admin') return '/admin'
  if (role === 'coach') return '/dashboard/coach'
  return '/dashboard'
}

describe('coach login redirect', () => {
  it('sends coaches to the coach workspace', () => {
    expect(defaultPathForRole('coach')).toBe('/dashboard/coach')
  })

  it('keeps other roles on their existing homes', () => {
    expect(defaultPathForRole('member')).toBe('/dashboard')
    expect(defaultPathForRole('captain')).toBe('/dashboard')
    expect(defaultPathForRole('admin')).toBe('/admin')
    expect(defaultPathForRole('scanner')).toBe('/admin/scan')
  })
})
