import { describe, it, expect } from 'vitest'
import {
  emptyDay,
  isPlaceholder,
  isWeekUnfinished,
  listToText,
  moveItem,
  newQuestion,
  programListStatus,
  questionIdFromLabel,
  sameContent,
  slugify,
  textToList,
} from '../../content/programEditor'
import { tickerItems } from '../../content/ticker'
import { programFromCatalog, type CatalogProgram } from '../../content/programs'
import type { ProgramWeekContent } from '../../types/programContent'

function week(overrides: Partial<ProgramWeekContent> = {}): ProgramWeekContent {
  return {
    week: 1,
    title: 'Week 1',
    summary: 'Get going',
    purpose: 'Show up',
    coachNote: 'Go slow',
    voiceNoteUrl: null,
    tip: 'Drink water',
    days: Array.from({ length: 7 }, (_, i) => ({ ...emptyDay(i + 1), title: `Day ${i + 1}` })),
    ...overrides,
  }
}

describe('placeholders', () => {
  it('spots "[To be added]" in any case', () => {
    expect(isPlaceholder('[To be added]')).toBe(true)
    expect(isPlaceholder('[Session to be added]')).toBe(true)
    expect(isPlaceholder('Jog for a minute')).toBe(false)
    expect(isPlaceholder(null)).toBe(false)
  })

  it('marks a week unfinished while any text is a placeholder', () => {
    expect(isWeekUnfinished(week())).toBe(false)
    expect(isWeekUnfinished(week({ tip: '[To be added]' }))).toBe(true)
    const days = week().days
    days[2] = { ...days[2], steps: { warmUp: ['[To be added]'], coolDown: [] } }
    expect(isWeekUnfinished(week({ days }))).toBe(true)
  })
})

describe('textToList and listToText', () => {
  it('keeps one trimmed item per non-blank line', () => {
    expect(textToList(' Walk 5 minutes \n\n  Stretch\n')).toEqual(['Walk 5 minutes', 'Stretch'])
    expect(listToText(['a', 'b'])).toBe('a\nb')
    expect(listToText(undefined)).toBe('')
  })
})

describe('moveItem', () => {
  it('swaps with the neighbour and ignores moves past the ends', () => {
    expect(moveItem(['a', 'b', 'c'], 1, 'up')).toEqual(['b', 'a', 'c'])
    expect(moveItem(['a', 'b', 'c'], 1, 'down')).toEqual(['a', 'c', 'b'])
    const list = ['a', 'b']
    expect(moveItem(list, 0, 'up')).toBe(list)
    expect(moveItem(list, 1, 'down')).toBe(list)
  })
})

describe('question ids', () => {
  it('makes a short key from the question text', () => {
    expect(questionIdFromLabel('How did you sleep?', [])).toBe('how_did_you_sleep')
    expect(questionIdFromLabel('3 things you enjoyed', [])).toBe('things_you_enjoyed')
    expect(questionIdFromLabel('???', [])).toBe('question')
  })

  it('never reuses a key already taken', () => {
    expect(questionIdFromLabel('Sleep', ['sleep'])).toBe('sleep_2')
    expect(questionIdFromLabel('Sleep', ['sleep', 'sleep_2'])).toBe('sleep_3')
    expect(newQuestion(['question']).id).toBe('question_2')
  })
})

describe('programListStatus', () => {
  it('describes where each program stands', () => {
    expect(programListStatus({ status: 'published', published_at: '2026-01-01', draft_updated_at: null })).toBe('Live')
    expect(programListStatus({ status: 'published', published_at: '2026-01-01', draft_updated_at: '2026-02-01' })).toBe(
      'Live, with unpublished changes'
    )
    expect(programListStatus({ status: 'draft', published_at: null, draft_updated_at: '2026-02-01' })).toBe('Draft')
    expect(programListStatus({ status: 'archived', published_at: '2026-01-01', draft_updated_at: null })).toBe('Archived')
  })
})

describe('slugify', () => {
  it('matches the server rules', () => {
    expect(slugify('  Strength & Mobility for Runners! ')).toBe('strength-mobility-for-runners')
    expect(slugify('Couch_to 5K')).toBe('couch-to-5k')
  })
})

describe('sameContent', () => {
  it('compares by value', () => {
    expect(sameContent({ a: [1, 2] }, { a: [1, 2] })).toBe(true)
    expect(sameContent({ a: [1, 2] }, { a: [2, 1] })).toBe(false)
  })
})

describe('tickerItems', () => {
  const make = (id: string, price: number) =>
    programFromCatalog({
      id,
      slug: id,
      name: id,
      is_core: false,
      sort_order: 1,
      weekCount: 6,
      page: { price, memberPrice: price, startsLabel: 'Soon', join: {} },
      card: { tag: '', blurb: '', button: '', category: '' },
    } as unknown as CatalogProgram)

  it('keeps the core ticker order, adds new programs after it and ends with Elite Coaching', () => {
    const items = tickerItems([make('foundations', 0), make('fat_loss', 1), make('yoga', 0), make('hiking', 1)])
    expect(items.map((i) => i.name)).toEqual(['foundations', 'hiking', 'fat_loss', 'yoga', 'Elite Coaching for Mothers'])
    expect(items[0]).toMatchObject({ detail: 'Free · 6 weeks · Starts Soon', to: '/programs/foundations' })
  })
})
