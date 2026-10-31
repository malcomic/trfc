import { describe, it, expect, vi } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))

import {
  DEFAULT_TICKET_RULES,
  creditAvailableFrom,
  creditExpiry,
  daysLeft,
  depositFor,
  nextDeliveryWednesday,
  parseTicketRules,
  planDeadline,
} from '../../utils/ticketRules.js'
import { dueExpiryStage } from '../../jobs/creditJobs.js'
import { dueReminderStage } from '../../jobs/installmentJobs.js'
import { allocateSeats, availableFor, computeSeatState, publicSeatInfo } from '../../utils/seatPriority.js'
import { splitCaptainShare } from '../../utils/eventSettlement.js'

describe('ticket credit dates', () => {
  it('a missed 31 Oct event gives credit until 30 Dec at 11:59 pm Nairobi (day 1 is 1 Nov)', () => {
    expect(creditExpiry('2026-10-31', 60).toISOString()).toBe('2026-12-30T20:59:59.000Z')
  })

  it('missed-event credit appears at 6 am Nairobi the morning after', () => {
    expect(creditAvailableFrom('2026-10-31').toISOString()).toBe('2026-11-01T03:00:00.000Z')
  })

  it('counts today in the days left, so the last day shows 1', () => {
    const expires = creditExpiry('2026-10-31', 60)
    expect(daysLeft(expires, new Date('2026-12-30T10:00:00Z'))).toBe(1)
    expect(daysLeft(expires, new Date('2026-12-29T10:00:00Z'))).toBe(2)
    expect(daysLeft(expires, new Date('2026-12-30T21:00:00Z'))).toBe(0)
  })
})

describe('paying in parts', () => {
  it('first payment is 30% rounded up to the next KSh 10', () => {
    expect(depositFor(1497, 30, 10)).toBe(450)
    expect(depositFor(1000, 30, 10)).toBe(300)
    expect(depositFor(20, 30, 10)).toBe(10)
    expect(depositFor(5, 30, 10)).toBe(5)
  })

  it('deadline is the end of the day 3 days before the event', () => {
    expect(planDeadline('2026-12-12', 3).toISOString()).toBe('2026-12-09T20:59:59.000Z')
  })
})

describe('clothing delivery', () => {
  it('Monday 2 November is delivered Wednesday 4 November', () => {
    expect(nextDeliveryWednesday(new Date('2026-11-02T09:00:00+03:00'))).toBe('2026-11-04')
  })

  it('Tuesday before 8 pm makes that Wednesday; from 8 pm it is the next Wednesday', () => {
    expect(nextDeliveryWednesday(new Date('2026-11-03T19:59:00+03:00'))).toBe('2026-11-04')
    expect(nextDeliveryWednesday(new Date('2026-11-03T20:00:00+03:00'))).toBe('2026-11-11')
    expect(nextDeliveryWednesday(new Date('2026-11-03T21:00:00+03:00'))).toBe('2026-11-11')
  })

  it('an order on Wednesday goes to the following Wednesday', () => {
    expect(nextDeliveryWednesday(new Date('2026-11-04T08:00:00+03:00'))).toBe('2026-11-11')
  })

  it('uses Nairobi time, not UTC (Tuesday 8:30 pm Nairobi is 5:30 pm UTC)', () => {
    expect(nextDeliveryWednesday(new Date('2026-11-03T17:30:00Z'))).toBe('2026-11-11')
  })
})

describe('parseTicketRules', () => {
  it('accepts valid changes and rejects out-of-range values', () => {
    expect(parseTicketRules({ creditDays: 90 }, DEFAULT_TICKET_RULES)).toMatchObject({ creditDays: 90 })
    expect(parseTicketRules({ creditDays: 0 }, DEFAULT_TICKET_RULES)).toEqual(expect.stringContaining('creditDays'))
    expect(parseTicketRules({ depositPct: 120 }, DEFAULT_TICKET_RULES)).toEqual(expect.stringContaining('depositPct'))
  })
})

describe('reminder timing', () => {
  const deadline = planDeadline('2026-12-12', 3)
  const none = { d7: false, d3: false, d0: false }

  it('payment reminders go 7 days, 3 days and on the deadline day', () => {
    expect(dueReminderStage(deadline, new Date('2026-11-25T09:00:00Z'), none)).toBeNull()
    expect(dueReminderStage(deadline, new Date('2026-12-03T09:00:00Z'), none)).toMatchObject({ send: '7d' })
    expect(dueReminderStage(deadline, new Date('2026-12-07T09:00:00Z'), none)).toMatchObject({ send: '3d' })
    expect(dueReminderStage(deadline, new Date('2026-12-09T09:00:00Z'), none)).toMatchObject({ send: '0d' })
    expect(dueReminderStage(deadline, new Date('2026-12-09T09:00:00Z'), { ...none, d0: true })).toBeNull()
    expect(dueReminderStage(deadline, new Date('2026-12-10T09:00:00Z'), none)).toBeNull()
  })

  it('credit reminders go 14, 7 and 2 days before it ends, skipping stages already passed', () => {
    const sent = { d14: false, d7: false, d2: false }
    expect(dueExpiryStage(20, sent)).toBeNull()
    expect(dueExpiryStage(14, sent)).toEqual({ send: '14d', mark: ['14d'] })
    expect(dueExpiryStage(6, sent)).toEqual({ send: '7d', mark: ['14d', '7d'] })
    expect(dueExpiryStage(2, { d14: true, d7: true, d2: false })).toEqual({ send: '2d', mark: ['14d', '7d', '2d'] })
    expect(dueExpiryStage(1, { d14: true, d7: true, d2: true })).toBeNull()
    expect(dueExpiryStage(0, sent)).toBeNull()
  })
})

describe('member seat priority', () => {
  const releaseAt = new Date('2026-12-05T00:00:00+03:00')
  const before = new Date('2026-11-20T09:00:00Z')

  it('holds 40% of 30 seats (12) for members until 7 days before', () => {
    const state = computeSeatState({ total: 30, pct: 40, memberTaken: 0, openTaken: 0, releaseAt, now: before })
    expect(state.memberSeats).toBe(12)
    expect(availableFor(state, false)).toBe(18)
    expect(availableFor(state, true)).toBe(30)
  })

  it('rounds member seats up to a whole seat', () => {
    expect(computeSeatState({ total: 25, pct: 40, memberTaken: 0, openTaken: 0, releaseAt, now: before }).memberSeats).toBe(10)
    expect(computeSeatState({ total: 26, pct: 40, memberTaken: 0, openTaken: 0, releaseAt, now: before }).memberSeats).toBe(11)
  })

  it('non-members see sold out when open seats run out, without member seat counts', () => {
    const state = computeSeatState({ total: 30, pct: 40, memberTaken: 3, openTaken: 18, releaseAt, now: before })
    expect(publicSeatInfo(state, false)).toEqual({
      priority_note: '40% of the seats are given to members as first priority.',
      seats_available: 0,
      sold_out_for_you: true,
    })
    expect(publicSeatInfo(state, true).seats_available).toBe(9)
    expect(allocateSeats(state, false, 1)).toBeNull()
    expect(allocateSeats(state, true, 2)).toEqual(['member', 'member'])
  })

  it('members fill member seats first, then open seats', () => {
    const state = computeSeatState({ total: 30, pct: 40, memberTaken: 11, openTaken: 0, releaseAt, now: before })
    expect(allocateSeats(state, true, 3)).toEqual(['member', 'open', 'open'])
  })

  it('opens unclaimed member seats to everyone 7 days before', () => {
    const state = computeSeatState({
      total: 30,
      pct: 40,
      memberTaken: 3,
      openTaken: 18,
      releaseAt,
      now: new Date('2026-12-05T00:00:00+03:00'),
    })
    expect(state.openedToAll).toBe(9)
    expect(availableFor(state, false)).toBe(9)
    expect(allocateSeats(state, true, 2)).toEqual(['open', 'open'])
  })

  it('has no limit when the event has no total', () => {
    const state = computeSeatState({ total: null, pct: 40, memberTaken: 0, openTaken: 50, releaseAt: null, now: before })
    expect(availableFor(state, false)).toBeNull()
    expect(allocateSeats(state, false, 5)).toEqual(['open', 'open', 'open', 'open', 'open'])
  })
})

describe("zones' share of event profit", () => {
  const zones = [
    ['Thika', 8],
    ['Juja', 6],
    ['Clayworks', 5],
    ['TRM', 4],
    ['Weteithie', 3],
    ['Allsops', 2],
  ].map(([name, used]) => ({
    regionId: String(name),
    regionName: String(name),
    leadCaptainId: `lead-${name}`,
    leadCaptainName: `Lead ${name}`,
    usedTickets: Number(used),
  }))

  it('matches the worked example: 100 used tickets at KSh 1,497, KSh 70,000 costs', () => {
    const result = splitCaptainShare({ revenue: 149700, costs: 70000, pct: 20, usedCount: 100, zones })
    expect(result.grossProfit).toBe(79700)
    expect(result.perTicketValue).toBe(159.4)
    expect(result.lines.map((l) => [l.regionId, l.amount])).toEqual([
      ['Thika', 1275],
      ['Juja', 956],
      ['Clayworks', 797],
      ['TRM', 638],
      ['Weteithie', 478],
      ['Allsops', 319],
    ])
    expect(result.captainPool).toBe(4463)
  })

  it('pays KSh 0 when the event makes no profit', () => {
    const result = splitCaptainShare({ revenue: 50000, costs: 70000, pct: 20, usedCount: 40, zones })
    expect(result.grossProfit).toBe(0)
    expect(result.captainPool).toBe(0)
    expect(result.lines.every((l) => l.amount === 0)).toBe(true)
  })

  it('pays nothing when no tickets were used', () => {
    expect(splitCaptainShare({ revenue: 0, costs: 0, pct: 20, usedCount: 0, zones: [] }).perTicketValue).toBe(0)
  })
})
