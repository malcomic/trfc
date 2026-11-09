import { describe, it, expect } from 'vitest'
import { announcementLinkType, unreadBadgeLabel } from '../../utils/announcements'

describe('announcementLinkType', () => {
  it('opens site paths in the app and https links in a new tab', () => {
    expect(announcementLinkType('/events')).toBe('internal')
    expect(announcementLinkType('https://example.com')).toBe('external')
  })

  it('does not link anything unsafe or empty', () => {
    expect(announcementLinkType(null)).toBeNull()
    expect(announcementLinkType('')).toBeNull()
    expect(announcementLinkType('//evil.example.com')).toBeNull()
    expect(announcementLinkType('javascript:alert(1)')).toBeNull()
    expect(announcementLinkType('http://example.com')).toBeNull()
  })
})

describe('unreadBadgeLabel', () => {
  it('hides at zero and caps at 9+', () => {
    expect(unreadBadgeLabel(0)).toBeNull()
    expect(unreadBadgeLabel(3)).toBe('3')
    expect(unreadBadgeLabel(9)).toBe('9')
    expect(unreadBadgeLabel(10)).toBe('9+')
  })
})
