import { describe, it, expect } from 'vitest'
import {
  MEMBERSHIP_COPY,
  buildIcs,
  earlyWindowEnd,
  fileSize,
  foundingLine,
  liveQaState,
  pollPercents,
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

describe('live Q&A helpers', () => {
  it('builds a calendar file in UTC with escaped text and no Zoom link', () => {
    const ics = buildIcs(
      { start: '2026-12-03T16:00:00Z', title: 'Q&A; nutrition, sleep', description: 'Line one\nLine two', url: 'https://trfc.example/dashboard/membership' },
      new Date('2026-11-10T09:00:00Z')
    )
    const lines = ics.split('\r\n')
    expect(lines[0]).toBe('BEGIN:VCALENDAR')
    expect(lines).toContain('DTSTART:20261203T160000Z')
    expect(lines).toContain('DTEND:20261203T170000Z')
    expect(lines).toContain('DTSTAMP:20261110T090000Z')
    expect(lines).toContain('SUMMARY:Q&A\\; nutrition\\, sleep')
    expect(lines).toContain('DESCRIPTION:Line one\\nLine two')
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics).not.toContain('zoom')
  })

  it('picks the join, soon, members and empty states', () => {
    const base = { nextAt: '2026-12-03T16:00:00Z', joinUrl: null, isMember: true }
    expect(liveQaState({ ...base, joinUrl: 'https://zoom.us/j/1' })).toBe('join')
    expect(liveQaState(base)).toBe('soon')
    expect(liveQaState({ ...base, isMember: false })).toBe('members')
    expect(liveQaState({ ...base, nextAt: null })).toBe('none')
    expect(liveQaState(null)).toBe('none')
    expect(MEMBERSHIP_COPY.liveQa.soon).toBe('The Zoom link appears here 1 hour before the session.')
  })
})

describe('member vote helpers', () => {
  it('rounds poll percentages so they add up to 100', () => {
    expect(pollPercents([1, 1, 1])).toEqual([34, 33, 33])
    expect(pollPercents([2, 1])).toEqual([67, 33])
    expect(pollPercents([1, 2, 3, 4, 5, 6, 7])).toEqual([4, 7, 11, 14, 18, 21, 25])
    expect(pollPercents([0, 0, 0])).toEqual([0, 0, 0])
  })

  it('counts votes in words', () => {
    expect(MEMBERSHIP_COPY.vote.votes(1)).toBe('1 vote')
    expect(MEMBERSHIP_COPY.vote.votes(12)).toBe('12 votes')
  })

  it('shows guide sizes in KB or MB', () => {
    expect(fileSize(850 * 1024)).toBe('850 KB')
    expect(fileSize(2.4 * 1024 * 1024)).toBe('2.4 MB')
    expect(fileSize(0)).toBe('')
  })
})
