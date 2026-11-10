import { describe, it, expect } from 'vitest'
import {
  MEMBERSHIP_COPY,
  earlyWindowEnd,
  foundingLine,
  memberDate,
  memberDateTime,
  quoteLine,
  renewalState,
  shopDiscountFor,
} from '../../content/membership'
import {
  fromNairobiInput,
  moveItem,
  rowsToSettings,
  settingsToRows,
  toNairobiInput,
} from '../../components/admin/membership/membershipAdmin'

const DAY = 24 * 60 * 60 * 1000
const NOW = new Date('2027-03-10T09:00:00+03:00')
const iso = (offsetDays: number) => new Date(NOW.getTime() + offsetDays * DAY).toISOString()

describe('renewalState', () => {
  it('is none without a membership', () => {
    expect(renewalState(null, NOW)).toBe('none')
    expect(renewalState({ until: null }, NOW)).toBe('none')
  })

  it('is active until the last 30 days, then renew_soon', () => {
    expect(renewalState({ until: iso(31) }, NOW)).toBe('active')
    expect(renewalState({ until: iso(30) }, NOW)).toBe('renew_soon')
    expect(renewalState({ until: iso(1) }, NOW)).toBe('renew_soon')
  })

  it('is grace inside the renewal window after expiry, then lapsed', () => {
    expect(renewalState({ until: iso(-5), renewalUntil: iso(25) }, NOW)).toBe('grace')
    expect(renewalState({ until: iso(-31), renewalUntil: iso(-1) }, NOW)).toBe('lapsed')
    expect(renewalState({ until: iso(-5) }, NOW)).toBe('lapsed')
  })
})

describe('quoteLine and foundingLine', () => {
  it('describes each price type', () => {
    expect(quoteLine({ priceType: 'founding', amount: 1997 })).toBe('Founding price: KSh 1,997 for 12 months')
    expect(quoteLine({ priceType: 'renewal', amount: 1997 })).toBe('Renew for KSh 1,997 for 12 months')
    expect(quoteLine({ priceType: 'standard', amount: 2447 })).toBe('KSh 2,447 for 12 months')
  })

  it('shows founding places left with the deadline, and nothing when none are left', () => {
    expect(foundingLine(37, 100, '2026-12-31T20:59:59.000Z')).toBe('37 of 100 founding places left, until 31 December')
    expect(foundingLine(0, 100, '2026-12-31T20:59:59.000Z')).toBeNull()
  })

  it('formats dates in Nairobi time', () => {
    expect(memberDate('2026-12-31T22:00:00.000Z')).toBe('1 January 2027')
  })
})

describe('admin membership helpers', () => {
  it('round-trips datetime-local values in Nairobi time', () => {
    expect(toNairobiInput('2026-11-30T21:00:00.000Z')).toBe('2026-12-01T00:00')
    expect(fromNairobiInput('2026-12-01T00:00')).toBe('2026-11-30T21:00:00.000Z')
    expect(fromNairobiInput('nope')).toBeNull()
  })

  it('keeps setting types when saving rows', () => {
    const rows = settingsToRows({ zoom_url: 'https://zoom.us/j/1', percent: 15, live: true, next_date: null })
    expect(rows).toEqual([
      { key: 'zoom_url', value: 'https://zoom.us/j/1' },
      { key: 'percent', value: '15' },
      { key: 'live', value: 'true' },
      { key: 'next_date', value: '' },
    ])
    expect(rowsToSettings([...rows, { key: '  ', value: 'ignored' }])).toEqual({
      zoom_url: 'https://zoom.us/j/1',
      percent: 15,
      live: true,
      next_date: null,
    })
  })

  it('moves perks up and down within bounds', () => {
    expect(moveItem(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c'])
    expect(moveItem(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c'])
  })
})

describe('early booking', () => {
  it('ends 48 hours after the event was created', () => {
    expect(earlyWindowEnd('2026-11-10T09:00:00Z').toISOString()).toBe('2026-11-12T09:00:00.000Z')
  })

  it('shows the opening time in Nairobi time', () => {
    const text = MEMBERSHIP_COPY.early.nonMember(memberDateTime('2026-11-12T15:30:00Z'))
    expect(text).toBe('Members book first. Booking opens to everyone on Thu 12 November, 6:30 pm.')
  })
})

describe('shopDiscountFor', () => {
  const status = { available: true, amount: 300 }

  it('takes up to 300 off marked items at full price', () => {
    expect(
      shopDiscountFor(
        [
          { price: 1500, quantity: 1, eligible: true, flash: false },
          { price: 800, quantity: 1, eligible: false, flash: false },
        ],
        status
      )
    ).toBe(300)
    expect(shopDiscountFor([{ price: 100, quantity: 2, eligible: true, flash: false }], status)).toBe(200)
  })

  it('ignores flash lines, unmarked items and a used discount', () => {
    expect(shopDiscountFor([{ price: 1000, quantity: 1, eligible: true, flash: true }], status)).toBe(0)
    expect(shopDiscountFor([{ price: 1000, quantity: 1, eligible: false, flash: false }], status)).toBe(0)
    expect(shopDiscountFor([{ price: 1000, quantity: 1, eligible: true, flash: false }], { available: false, amount: 300 })).toBe(0)
    expect(shopDiscountFor([{ price: 1000, quantity: 1, eligible: true, flash: false }], null)).toBe(0)
  })
})
