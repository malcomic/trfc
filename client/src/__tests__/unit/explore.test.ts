import { describe, it, expect } from 'vitest'
import { categoryId, exploreFilters, filterPrograms, stepNumber } from '../../content/explore'
import { programFromCatalog, type CatalogProgram, type Program } from '../../content/programs'

function program(id: string, price: number, category: string): Program {
  return programFromCatalog({
    id,
    slug: id.replace(/_/g, '-'),
    name: id,
    is_core: true,
    sort_order: 1,
    weekCount: 8,
    page: {
      title: id,
      tagline: '',
      price,
      memberPrice: price,
      startsLabel: 'January 2027',
      startsOn: null,
      chips: [],
      heroNote: '',
      forYou: [],
      whatYouGet: [],
      howItWorks: [],
      coachLine: '',
      story: '',
      faqs: [],
      join: { heading: '', body: '', footnote: '' },
      cta: '',
      barCta: '',
    },
    card: { tag: '', blurb: '', button: '', category },
  } as CatalogProgram)
}

const PROGRAMS = [
  program('foundations', 0, ''),
  program('fat_loss', 3497, 'Fat Loss'),
  program('endurance', 1697, 'Endurance'),
  program('hiking', 997, 'Hiking'),
]

describe('exploreFilters', () => {
  it('puts All and Free first, then categories from A to Z', () => {
    expect(exploreFilters(PROGRAMS)).toEqual([
      { id: 'all', label: 'All' },
      { id: 'free', label: 'Free' },
      { id: 'endurance', label: 'Endurance' },
      { id: 'fat-loss', label: 'Fat Loss' },
      { id: 'hiking', label: 'Hiking' },
    ])
  })

  it('shows one chip per category, even when several programs share it', () => {
    const filters = exploreFilters([...PROGRAMS, program('trail', 500, ' hiking ')])
    expect(filters.filter((f) => f.id === 'hiking')).toHaveLength(1)
  })

  it('hides Free when nothing is free', () => {
    expect(exploreFilters(PROGRAMS.slice(1)).map((f) => f.id)).not.toContain('free')
  })
})

describe('filterPrograms', () => {
  it('returns every program in order for "all"', () => {
    expect(filterPrograms(PROGRAMS, 'all').map((p) => p.id)).toEqual(['foundations', 'fat_loss', 'endurance', 'hiking'])
  })

  it.each([
    ['free', 'foundations'],
    ['fat-loss', 'fat_loss'],
    ['endurance', 'endurance'],
    ['hiking', 'hiking'],
  ])('returns only the matching program for "%s"', (filter, id) => {
    expect(filterPrograms(PROGRAMS, filter).map((p) => p.id)).toEqual([id])
  })

  it('has a non-empty result for every chip', () => {
    for (const f of exploreFilters(PROGRAMS)) {
      expect(filterPrograms(PROGRAMS, f.id).length).toBeGreaterThan(0)
    }
  })
})

describe('categoryId', () => {
  it('turns a label into a URL-safe id', () => {
    expect(categoryId('Fat Loss')).toBe('fat-loss')
    expect(categoryId('  Race & Speed! ')).toBe('race-speed')
    expect(categoryId('')).toBe('')
  })
})

describe('stepNumber', () => {
  it('pads to two digits', () => {
    expect(stepNumber(0)).toBe('01')
    expect(stepNumber(4)).toBe('05')
  })
})
