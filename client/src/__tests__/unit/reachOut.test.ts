import { describe, it, expect } from 'vitest'
import { answerLabel, outreachStatusLabel } from '../../content/signupQuestions'
import { filtersFromParams, filtersToParams } from '../../components/admin/reachOut/filterParams'
import { contactLinks, zoneDisplay } from '../../components/admin/reachOut/memberDisplay'

describe('reach out labels', () => {
  it('shows member-facing labels and dashes for blank or "Prefer not to say"', () => {
    expect(answerLabel('hardest_now', 'start_then_stop')).toBe('I start strong, then I stop')
    expect(answerLabel('zone', 'outside')).toBe('Outside these zones')
    expect(answerLabel('goal_3m', null)).toBe('-')
    expect(answerLabel('goal_3m', 'prefer_not_to_say')).toBe('-')
  })

  it('labels outreach statuses, defaulting to "Not contacted"', () => {
    expect(outreachStatusLabel('not_interested')).toBe('Not interested')
    expect(outreachStatusLabel(undefined)).toBe('Not contacted')
  })

  it('shows the team name when a zone region is known', () => {
    expect(zoneDisplay({ zone: 'juja', zone_name: 'Juja' })).toBe('Team Juja')
    expect(zoneDisplay({ zone: 'not_sure', zone_name: null })).toBe('I am not sure')
    expect(zoneDisplay({ zone: null, zone_name: null })).toBe('-')
  })
})

describe('reach out filters in the URL', () => {
  it('round-trips filters and drops invalid day counts', () => {
    const filters = { zone: 'outside', hardest_now: 'cost', inactive_days: 14, has_other: true, search: 'jane' }
    expect(filtersFromParams(filtersToParams(filters))).toEqual(filters)
    expect(filtersFromParams(new URLSearchParams('inactive_days=9')).inactive_days).toBeUndefined()
  })
})

describe('contact links', () => {
  it('prefers WhatsApp for messages and the phone for calls', () => {
    expect(contactLinks({ phone: '0712 345 678', whatsapp: '0798765432' })).toEqual({
      whatsapp: 'https://wa.me/254798765432',
      call: 'tel:+254712345678',
    })
    expect(contactLinks({ phone: null, whatsapp: null })).toEqual({ whatsapp: null, call: null })
  })
})
