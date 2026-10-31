import { describe, it, expect } from 'vitest'
import { isMemberNavActive, memberNavItems } from '../../components/member/memberNav'
import { legacyTabPath } from '../../utils/legacyTabs'

describe('isMemberNavActive', () => {
  it('matches /dashboard exactly for the overview', () => {
    expect(isMemberNavActive('/dashboard', '/dashboard')).toBe(true)
    expect(isMemberNavActive('/dashboard/', '/dashboard')).toBe(true)
    expect(isMemberNavActive('/dashboard/wallet', '/dashboard')).toBe(false)
  })

  it('matches section routes by prefix', () => {
    expect(isMemberNavActive('/dashboard/wallet', '/dashboard/wallet')).toBe(true)
    expect(isMemberNavActive('/dashboard/wallet/plans', '/dashboard/wallet')).toBe(true)
    expect(isMemberNavActive('/dashboard/walletx', '/dashboard/wallet')).toBe(false)
    expect(isMemberNavActive('/dashboard/tickets', '/dashboard/wallet')).toBe(false)
  })
})

describe('memberNavItems', () => {
  const paths = (role?: string) => memberNavItems(role).map((i) => i.path)

  it('hides the captain page from regular members', () => {
    expect(paths('member')).not.toContain('/dashboard/captain')
    expect(paths(undefined)).not.toContain('/dashboard/captain')
  })

  it('shows the captain page to captains', () => {
    expect(paths('captain')).toContain('/dashboard/captain')
  })

  it('follows the design order for a free account', () => {
    expect(memberNavItems('member').map((i) => i.label)).toEqual([
      'Dashboard',
      'My Tickets',
      'Calendar',
      'My Programs',
      'My Zone',
      'Points',
      'Ticket value',
      'Medals',
      'Payments',
      'Support',
      'Settings',
    ])
  })

  it('greys out Points with a Members tag for free accounts', () => {
    const points = memberNavItems('member').find((i) => i.label === 'Points')!
    expect(points.disabled).toBe(true)
    expect(points.badge).toBe('Members')
  })

  it('opens Points and adds Guides Library for members', () => {
    const items = memberNavItems('member', true)
    expect(items.find((i) => i.label === 'Points')!.disabled).toBeFalsy()
    expect(items.map((i) => i.path)).toContain('/dashboard/guides')
    expect(memberNavItems('member').map((i) => i.path)).not.toContain('/dashboard/guides')
  })

  it('points Support at the given link', () => {
    const contact = memberNavItems('member').find((i) => i.label === 'Support')!
    expect(contact).toMatchObject({ path: '/contact', external: false })
    const wa = memberNavItems('member', false, { href: 'https://wa.me/254712345678', external: true }).find(
      (i) => i.label === 'Support'
    )!
    expect(wa).toMatchObject({ path: 'https://wa.me/254712345678', external: true })
  })
})

describe('legacyTabPath', () => {
  it('maps old ?tab= values to their pages', () => {
    expect(legacyTabPath('wallet')).toBe('/dashboard/wallet')
    expect(legacyTabPath('calendar')).toBe('/dashboard/calendar')
  })

  it('keeps unknown and upcoming tabs on the overview', () => {
    expect(legacyTabPath('upcoming')).toBeNull()
    expect(legacyTabPath('nope')).toBeNull()
    expect(legacyTabPath(null)).toBeNull()
  })
})
