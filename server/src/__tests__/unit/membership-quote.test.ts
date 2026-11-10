import { describe, it, expect, vi } from 'vitest'

vi.mock('../../config/db.js', () => ({ query: vi.fn(), getClient: vi.fn() }))

import { addMonthsNairobi, quoteFor, type MembershipHistoryRow, type MembershipSettings } from '../../utils/membership.js'
import { dueReminderKind } from '../../jobs/membershipJobs.js'

const DAY = 24 * 60 * 60 * 1000

const SETTINGS: MembershipSettings = {
  standardPrice: 2447,
  foundingPrice: 1997,
  foundingLimit: 100,
  foundingDeadline: new Date('2026-12-31T23:59:59+03:00'),
  renewalPrice: 1997,
  renewalGraceDays: 30,
  salesOpenAt: new Date('2026-12-01T00:00:00+03:00'),
  salesPaused: false,
  updatedAt: null,
}

const NOW = new Date('2026-12-10T09:00:00+03:00')
const paid = (endsAt: Date, priceType: MembershipHistoryRow['priceType'] = 'standard'): MembershipHistoryRow => ({
  priceType,
  status: 'paid',
  endsAt,
})

describe('quoteFor', () => {
  it('gives a new member the founding price while places and time remain', () => {
    const q = quoteFor([], SETTINGS, 40, NOW)
    expect(q).toMatchObject({ available: true, priceType: 'founding', amount: 1997, foundingLeft: 60, renewalUntil: null })
    expect(q.startsAt).toEqual(NOW)
    expect(q.endsAt.toISOString()).toBe('2027-12-10T06:00:00.000Z')
  })

  it('charges the standard price once the founding places are gone', () => {
    expect(quoteFor([], SETTINGS, 100, NOW)).toMatchObject({ priceType: 'standard', amount: 2447, foundingLeft: 0 })
  })

  it('charges the standard price after the founding deadline', () => {
    const later = new Date('2027-01-01T00:00:00+03:00')
    expect(quoteFor([], SETTINGS, 5, later)).toMatchObject({ priceType: 'standard', amount: 2447, foundingLeft: 0 })
  })

  it('stacks a renewal on the current end date while the member is active', () => {
    const endsAt = new Date(NOW.getTime() + 10 * DAY)
    const q = quoteFor([paid(endsAt)], SETTINGS, 0, NOW)
    expect(q).toMatchObject({ priceType: 'renewal', amount: 1997 })
    expect(q.startsAt).toEqual(endsAt)
    expect(q.renewalUntil).toEqual(new Date(endsAt.getTime() + 30 * DAY))
  })

  it('uses the latest paid year and ignores failed ones', () => {
    const old = new Date(NOW.getTime() - 400 * DAY)
    const current = new Date(NOW.getTime() + 100 * DAY)
    const q = quoteFor(
      [paid(old), { priceType: 'standard', status: 'failed', endsAt: new Date(NOW.getTime() + 900 * DAY) }, paid(current)],
      SETTINGS,
      0,
      NOW
    )
    expect(q.startsAt).toEqual(current)
  })

  it('keeps the renewal price for 30 days after expiry, starting today', () => {
    const endsAt = new Date(NOW.getTime() - 30 * DAY)
    const q = quoteFor([paid(endsAt)], SETTINGS, 0, NOW)
    expect(q).toMatchObject({ priceType: 'renewal', amount: 1997 })
    expect(q.startsAt).toEqual(NOW)
  })

  it('charges full price to someone who comes back after the renewal window', () => {
    const endsAt = new Date(NOW.getTime() - 30 * DAY - 1000)
    expect(quoteFor([paid(endsAt)], SETTINGS, 0, NOW)).toMatchObject({ priceType: 'standard', amount: 2447 })
  })

  it('counts a gift-only history as history, so a returning gift member is not founding', () => {
    const endsAt = new Date(NOW.getTime() - 60 * DAY)
    expect(quoteFor([paid(endsAt, 'gift')], SETTINGS, 0, NOW)).toMatchObject({ priceType: 'standard' })
  })

  it('is unavailable before sales open and while paused, but still shows the price', () => {
    const before = new Date('2026-11-20T09:00:00+03:00')
    expect(quoteFor([], SETTINGS, 0, before)).toMatchObject({ available: false, reason: 'opens', priceType: 'founding' })
    expect(quoteFor([], { ...SETTINGS, salesPaused: true }, 0, NOW)).toMatchObject({ available: false, reason: 'paused' })
  })
})

describe('addMonthsNairobi', () => {
  it('adds calendar months in Nairobi time', () => {
    expect(addMonthsNairobi(new Date('2026-12-01T00:00:00+03:00'), 12).toISOString()).toBe('2027-11-30T21:00:00.000Z')
  })

  it('clamps to the end of a short month', () => {
    expect(addMonthsNairobi(new Date('2027-01-31T10:00:00+03:00'), 1).toISOString()).toBe('2027-02-28T07:00:00.000Z')
    expect(addMonthsNairobi(new Date('2028-02-29T10:00:00+03:00'), 12).toISOString()).toBe('2029-02-28T07:00:00.000Z')
  })
})

describe('dueReminderKind', () => {
  const ends = new Date('2027-06-01T09:00:00+03:00')
  const at = (days: number) => new Date(ends.getTime() - days * DAY)

  it('sends nothing more than 30 days out', () => {
    expect(dueReminderKind(ends, at(31), 30)).toBeNull()
  })

  it('picks the 30-day, 7-day, expired and last-chance windows', () => {
    expect(dueReminderKind(ends, at(30), 30)).toBe('d30')
    expect(dueReminderKind(ends, at(8), 30)).toBe('d30')
    expect(dueReminderKind(ends, at(7), 30)).toBe('d7')
    expect(dueReminderKind(ends, at(0.1), 30)).toBe('d7')
    expect(dueReminderKind(ends, at(0), 30)).toBe('expired')
    expect(dueReminderKind(ends, at(-24), 30)).toBe('expired')
    expect(dueReminderKind(ends, at(-25), 30)).toBe('grace_d25')
    expect(dueReminderKind(ends, at(-30), 30)).toBeNull()
  })
})
