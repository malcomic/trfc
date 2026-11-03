import { describe, it, expect } from 'vitest'
import { CHOICE_QUESTIONS, ZONE_EXTRAS, compactAnswers, zoneOptions } from '../../content/signupQuestions'

const TAIL_VALUES = ['other', 'prefer_not_to_say']

describe('signup questions', () => {
  it('keeps "Other" and "Prefer not to say" last, in that order', () => {
    for (const question of CHOICE_QUESTIONS) {
      const values = question.options.map((o) => o.value)
      const tail = values.filter((v) => TAIL_VALUES.includes(v))
      expect(values.slice(values.length - tail.length)).toEqual(tail)
      expect(values[values.length - 1]).toBe('prefer_not_to_say')
    }
  })

  it('has no duplicate values within a question', () => {
    for (const question of CHOICE_QUESTIONS) {
      const values = question.options.map((o) => o.value)
      expect(new Set(values).size).toBe(values.length)
    }
  })

  it('lists zones first and the fixed extras last', () => {
    const options = zoneOptions([
      { name: 'Thika', slug: 'thika', stretch: 'Thika town and surrounds, up to Njomoko' },
      { name: 'Juja', slug: 'juja', stretch: null },
    ])
    expect(options[0]).toEqual({ label: 'Team Thika (Thika town and surrounds, up to Njomoko)', value: 'thika' })
    expect(options[1]).toEqual({ label: 'Team Juja', value: 'juja' })
    expect(options.slice(2)).toEqual(ZONE_EXTRAS)
  })

  it('drops blank answers and Other text unless Other is chosen', () => {
    expect(compactAnswers({ hardest_now: 'no_time', hardest_now_other: 'x', goal_3m: '', zone: 'juja' })).toEqual({
      hardest_now: 'no_time',
      zone: 'juja',
    })
    expect(compactAnswers({ hardest_now: 'other', hardest_now_other: ' Shifts ' })).toEqual({
      hardest_now: 'other',
      hardest_now_other: 'Shifts',
    })
  })
})
