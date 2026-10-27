import { describe, it, expect } from 'vitest'
import { safeRedirect } from '../../utils/safeRedirect'

describe('safeRedirect', () => {
  it('keeps same-site paths, including encoded ones', () => {
    expect(safeRedirect('/programs/fat-loss?join=1', '/dashboard')).toBe('/programs/fat-loss?join=1')
    expect(safeRedirect(encodeURIComponent('/programs/hiking?join=1'), '/dashboard')).toBe('/programs/hiking?join=1')
  })

  it('falls back for empty, external or malformed values', () => {
    expect(safeRedirect(null, '/dashboard')).toBe('/dashboard')
    expect(safeRedirect('', '/dashboard')).toBe('/dashboard')
    expect(safeRedirect('//evil.com', '/dashboard')).toBe('/dashboard')
    expect(safeRedirect('/\\evil.com', '/dashboard')).toBe('/dashboard')
    expect(safeRedirect('https://evil.com', '/dashboard')).toBe('/dashboard')
    expect(safeRedirect('%E0%A4%A', '/dashboard')).toBe('/dashboard')
  })
})
