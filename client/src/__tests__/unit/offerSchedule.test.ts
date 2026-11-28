import { describe, expect, it } from 'vitest'
import { FIND_COPY } from '../../content/quiz'
import { resolveOfferSchedule } from '../../content/finder/offerSchedule'

const config = FIND_COPY.offer.schedule

describe('resolveOfferSchedule', () => {
  it('highlights the first week window before 1 December', () => {
    const schedule = resolveOfferSchedule(config, new Date(2026, 10, 26))
    expect(schedule.openCount).toBe(6)
    expect(schedule.activeWeekIndex).toBe(0)
    expect(schedule.statusTitle).toBe('Today: all 6 bonuses are open')
  })

  it('shows all 6 open before the first Monday drop', () => {
    const schedule = resolveOfferSchedule(config, new Date(2026, 11, 1))
    expect(schedule.ended).toBe(false)
    expect(schedule.openCount).toBe(6)
    expect(schedule.activeWeekIndex).toBe(0)
    expect(schedule.statusTitle).toBe('Today: all 6 bonuses are open')
    expect(schedule.statusSubline).toContain('7 December')
    expect(schedule.statusSubline).toContain('Finish-Line')
  })

  it('drops Finish-Line on Monday 7 December', () => {
    const schedule = resolveOfferSchedule(config, new Date(2026, 11, 7))
    expect(schedule.openCount).toBe(5)
    expect(schedule.activeWeekIndex).toBe(0)
    expect(schedule.bonuses.find((b) => b.number === 6)?.open).toBe(false)
    expect(schedule.statusTitle).toBe('Today: 5 bonuses are open')
    expect(schedule.statusSubline).toContain('14 December')
  })

  it('activates the last week window through offer end', () => {
    const schedule = resolveOfferSchedule(config, new Date(2026, 11, 30))
    expect(schedule.openCount).toBe(2)
    expect(schedule.activeWeekIndex).toBe(4)
    expect(schedule.bonuses.filter((b) => b.open).map((b) => b.number)).toEqual([1, 5])
  })

  it('marks the offer ended after 1 January 2027', () => {
    const schedule = resolveOfferSchedule(config, new Date(2027, 0, 2))
    expect(schedule.ended).toBe(true)
    expect(schedule.openCount).toBe(0)
    expect(schedule.statusTitle).toBe('This early-join offer has ended')
  })
})
