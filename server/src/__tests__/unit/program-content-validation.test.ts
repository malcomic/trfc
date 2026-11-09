import { describe, it, expect } from 'vitest'
import { CORE_PROGRAMS } from '../../config/programCatalogSeed.js'
import { blankProgramContent, placeholderWeek } from '../../config/programSeed.js'
import {
  checkForPublish,
  cleanCard,
  cleanContent,
  cleanPage,
  cleanPlan,
  cleanWeek,
  idFromSlug,
  slugify,
} from '../../utils/programContentValidation.js'

const couch = () => structuredClone(CORE_PROGRAMS[0].content)

describe('cleanContent', () => {
  it('accepts every seeded core program unchanged in shape', () => {
    for (const p of CORE_PROGRAMS) {
      const result = cleanContent(p.content)
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value.weeks).toHaveLength(p.content.weeks.length)
    }
  })

  it('renumbers weeks 1 to N in order', () => {
    const content = couch()
    content.weeks = [placeholderWeek(5), placeholderWeek(9)]
    const result = cleanContent(content)
    expect(result.ok && result.value.weeks.map((w) => w.week)).toEqual([1, 2])
  })

  it('refuses a week that does not have all 7 days', () => {
    const content = couch()
    content.weeks[0].days = content.weeks[0].days.slice(0, 6)
    const result = cleanContent(content)
    expect(result).toMatchObject({ ok: false })
    expect(!result.ok && result.error).toMatch(/weeks\[0\]\.days/)
  })

  it('refuses an unknown day type', () => {
    const content = couch() as any
    content.weeks[0].days[0].kind = 'swim'
    expect(cleanContent(content)).toMatchObject({ ok: false })
  })

  it('keeps the reserved quiz slot', () => {
    const result = cleanContent({ ...couch(), quiz: { goals: ['move'], experience: [] } })
    expect(result.ok && result.value.quiz).toEqual({ goals: ['move'], experience: [] })
  })
})

describe('section cleaners', () => {
  it('trims text and drops empty list items', () => {
    const result = cleanPage({ ...couch().page, title: '  Hi  ', chips: ['8 weeks', ' ', ''] })
    expect(result.ok && result.value.title).toBe('Hi')
    expect(result.ok && result.value.chips).toEqual(['8 weeks'])
  })

  it('refuses negative or fractional prices', () => {
    expect(cleanPage({ ...couch().page, price: -1 })).toMatchObject({ ok: false })
    expect(cleanPage({ ...couch().page, price: 10.5 })).toMatchObject({ ok: false })
  })

  it('only accepts https image links', () => {
    expect(cleanCard({ ...couch().card, image: 'javascript:alert(1)' })).toMatchObject({ ok: false })
    expect(cleanCard({ ...couch().card, image: 'http://x.com/a.jpg' })).toMatchObject({ ok: false })
    const ok = cleanCard({ ...couch().card, image: 'https://res.cloudinary.com/a.jpg' })
    expect(ok.ok && ok.value.image).toBe('https://res.cloudinary.com/a.jpg')
  })

  it('refuses a bad start date', () => {
    expect(cleanPage({ ...couch().page, startsOn: '5 Jan' })).toMatchObject({ ok: false })
  })

  it('refuses duplicate question ids and bad ids', () => {
    const plan = couch().plan
    expect(cleanPlan({ ...plan, checkinQuestions: [plan.checkinQuestions[0], plan.checkinQuestions[0]] })).toMatchObject({
      ok: false,
    })
    expect(
      cleanPlan({ ...plan, checkinQuestions: [{ ...plan.checkinQuestions[0], id: 'Feel Now' }] })
    ).toMatchObject({ ok: false })
  })

  it('removes options from free-text questions', () => {
    const plan = couch().plan
    const result = cleanPlan({
      ...plan,
      checkinQuestions: [{ id: 'note', label: 'Note', type: 'text', options: ['a'], required: false }],
    })
    expect(result.ok && result.value.checkinQuestions[0]).toEqual({ id: 'note', label: 'Note', type: 'text', required: false })
  })

  it('drops an empty main set and sets the week number from the URL', () => {
    const week = couch().weeks[0] as any
    week.days[1].steps.mainSet = { label: 'x', rounds: 2, work: '' }
    const result = cleanWeek(week, 3)
    expect(result.ok && result.value.week).toBe(3)
    expect(result.ok && result.value.days[1].steps.mainSet).toBeUndefined()
  })
})

describe('checkForPublish', () => {
  it('passes Couch to 5K with only warnings for unfinished weeks and missing images', () => {
    const { errors, warnings } = checkForPublish(couch())
    expect(errors).toEqual([])
    expect(warnings.some((w) => w.where === 'Week 2')).toBe(true)
    expect(warnings.some((w) => w.where === 'Week 1')).toBe(false)
    expect(warnings.some((w) => w.message.includes('hero image'))).toBe(true)
  })

  it('blocks a blank program until the basics are filled in', () => {
    const { errors } = checkForPublish(blankProgramContent('Strength', 2))
    expect(errors.map((e) => e.message)).toEqual(expect.arrayContaining(['Add a tagline', 'Add a short description']))
  })

  it('blocks choice questions with fewer than two answers', () => {
    const content = couch()
    content.plan.checkinQuestions = [{ id: 'q', label: 'Q', type: 'choice', options: ['Only'], required: true }]
    expect(checkForPublish(content).errors.some((e) => e.where === 'Check-in question 1')).toBe(true)
  })

  it('blocks a member price above the full price', () => {
    const content = structuredClone(CORE_PROGRAMS[1].content)
    content.page.memberPrice = content.page.price + 1
    expect(checkForPublish(content).errors.some((e) => e.message.includes('member price'))).toBe(true)
  })
})

describe('slugify', () => {
  it('makes a web address and an id from a name', () => {
    expect(slugify('  Strength & Mobility for Runners! ')).toBe('strength-mobility-for-runners')
    expect(idFromSlug('strength-mobility')).toBe('strength_mobility')
  })
})
