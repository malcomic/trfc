import { describe, it, expect } from 'vitest'
import { firstName, greetingFor, initials, supportLink } from '../../content/dashboard'
import { programWeek } from '../../content/programs'
import { upcomingEvents } from '../../components/member/dashboard/ComingUpList'
import type { Event } from '../../types'

/** A Date at the given Nairobi wall-clock hour (UTC+3). */
const nairobiAt = (hour: number, minute = 0) => new Date(Date.UTC(2026, 9, 27, hour - 3, minute))

describe('greetingFor', () => {
  it('says good morning until 11:59 in Nairobi', () => {
    expect(greetingFor(nairobiAt(0))).toBe('Good morning')
    expect(greetingFor(nairobiAt(11, 59))).toBe('Good morning')
  })

  it('says good afternoon from 12:00 to 16:59', () => {
    expect(greetingFor(nairobiAt(12))).toBe('Good afternoon')
    expect(greetingFor(nairobiAt(16, 59))).toBe('Good afternoon')
  })

  it('says good evening from 17:00', () => {
    expect(greetingFor(nairobiAt(17))).toBe('Good evening')
    expect(greetingFor(nairobiAt(23, 59))).toBe('Good evening')
  })

  it('uses Nairobi time, not UTC', () => {
    // 22:00 UTC is 01:00 the next day in Nairobi.
    expect(greetingFor(new Date(Date.UTC(2026, 9, 27, 22)))).toBe('Good morning')
  })
})

describe('programWeek', () => {
  const program = { lengthWeeks: 8, startsOn: '2027-01-04' }

  it('is week 1 at 0% when the start date is not set', () => {
    expect(programWeek({ lengthWeeks: 8, startsOn: null }, '2027-02-01')).toEqual({
      week: 1,
      total: 8,
      percent: 0,
      started: false,
    })
  })

  it('is week 1 at 0% before the start date', () => {
    expect(programWeek(program, '2027-01-03')).toMatchObject({ week: 1, percent: 0, started: false })
  })

  it('counts weeks from the start date', () => {
    expect(programWeek(program, '2027-01-04')).toEqual({ week: 1, total: 8, percent: 13, started: true })
    expect(programWeek(program, '2027-01-10')).toMatchObject({ week: 1 })
    expect(programWeek(program, '2027-01-11')).toMatchObject({ week: 2, percent: 25 })
  })

  it('stops at the last week', () => {
    expect(programWeek(program, '2027-06-01')).toMatchObject({ week: 8, percent: 100, started: true })
  })
})

describe('supportLink', () => {
  it('opens WhatsApp for a captain with a number', () => {
    expect(supportLink({ whatsapp: '0712 345 678' })).toEqual({ href: 'https://wa.me/254712345678', external: true })
    expect(supportLink({ whatsapp: '+254 112 345 678' })).toEqual({ href: 'https://wa.me/254112345678', external: true })
  })

  it('falls back to the Contact page', () => {
    expect(supportLink(null)).toEqual({ href: '/contact', external: false })
    expect(supportLink({ whatsapp: null })).toEqual({ href: '/contact', external: false })
    expect(supportLink({ whatsapp: '12345' })).toEqual({ href: '/contact', external: false })
  })
})

describe('names', () => {
  it('takes the first name and initials', () => {
    expect(firstName('  Jane Wanjiru Doe ')).toBe('Jane')
    expect(initials('Jane Wanjiru Doe')).toBe('JD')
    expect(initials('Jane')).toBe('J')
    expect(initials('')).toBe('?')
  })
})

describe('upcomingEvents', () => {
  const ev = (id: string, event_date: string, is_active = true) => ({ id, title: id, event_date, is_active }) as Event

  it('keeps active events from today on, soonest first', () => {
    const list = [
      ev('later', '2026-11-07T07:00:00.000Z'),
      ev('past', '2026-10-26T07:00:00.000Z'),
      ev('today', '2026-10-27T18:00:00.000Z'),
      ev('off', '2026-10-30T07:00:00.000Z', false),
    ]
    expect(upcomingEvents(list, '2026-10-27').map((e) => e.id)).toEqual(['today', 'later'])
  })
})
