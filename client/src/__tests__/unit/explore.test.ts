import { describe, it, expect } from 'vitest'
import { EXPLORE_FILTERS, filterPrograms, isExploreFilter, stepNumber } from '../../content/explore'
import { PROGRAM_ORDER } from '../../content/programs'

describe('filterPrograms', () => {
  it('returns every program in order for "all"', () => {
    expect(filterPrograms('all').map((p) => p.id)).toEqual(PROGRAM_ORDER)
  })

  it.each([
    ['free', 'foundations'],
    ['fat', 'fat_loss'],
    ['endurance', 'endurance'],
    ['hiking', 'hiking'],
  ] as const)('returns only the matching program for "%s"', (filter, id) => {
    expect(filterPrograms(filter).map((p) => p.id)).toEqual([id])
  })

  it('has a non-empty result for every chip', () => {
    for (const f of EXPLORE_FILTERS) {
      expect(filterPrograms(f.id).length).toBeGreaterThan(0)
    }
  })
})

describe('isExploreFilter', () => {
  it('accepts every chip id', () => {
    for (const f of EXPLORE_FILTERS) expect(isExploreFilter(f.id)).toBe(true)
  })

  it('rejects unknown values', () => {
    expect(isExploreFilter('running')).toBe(false)
    expect(isExploreFilter('')).toBe(false)
    expect(isExploreFilter(null)).toBe(false)
    expect(isExploreFilter('constructor')).toBe(false)
  })
})

describe('stepNumber', () => {
  it('pads to two digits', () => {
    expect(stepNumber(0)).toBe('01')
    expect(stepNumber(4)).toBe('05')
  })
})
