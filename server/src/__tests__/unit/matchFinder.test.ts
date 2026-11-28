import { describe, expect, it } from 'vitest'
import { FALLBACK_PROGRAM_ID, isPlausibleFinderProgram, matchFinderProgramId } from '../../utils/matchFinder.js'
import type { CatalogEntry } from '../../utils/programCatalog.js'

function entry(id: string, quiz: CatalogEntry['quiz'], sort_order = 1): CatalogEntry {
  return {
    id,
    slug: id,
    name: id,
    is_core: true,
    sort_order,
    weekCount: 8,
    page: {} as CatalogEntry['page'],
    card: {} as CatalogEntry['card'],
    quiz,
  }
}

const catalog: CatalogEntry[] = [
  entry('foundations', { goals: ['start_running'], sex: 'any', priority: 10 }, 1),
  entry('fat_loss', { goals: ['lose_fat', 'build_muscle', 'get_stronger'], sex: 'any', priority: 20 }, 2),
  entry('endurance', { goals: ['start_running', 'longer_race'], sex: 'any', raceDistances: ['10k'], priority: 30 }, 3),
  entry('hiking', { goals: ['hike'], sex: 'men', hikeTargets: ['kenya'], priority: 20 }, 4),
  entry('elite_mothers', { goals: ['lose_fat'], sex: 'women', eliteOffer: true, priority: 5 }, 5),
]

describe('matchFinderProgramId', () => {
  it('matches goal and allows sex any', () => {
    expect(matchFinderProgramId({ goal: 'lose_fat', sex: 'women' }, catalog)).toBe('fat_loss')
  })

  it('respects sex filter', () => {
    expect(matchFinderProgramId({ goal: 'hike', sex: 'women', hikeTarget: 'kenya' }, catalog)).toBe(
      FALLBACK_PROGRAM_ID
    )
    expect(matchFinderProgramId({ goal: 'hike', sex: 'men', hikeTarget: 'kenya' }, catalog)).toBe('hiking')
  })

  it('falls back to foundations when race filter misses', () => {
    expect(matchFinderProgramId({ goal: 'longer_race', sex: 'men', raceDistance: '42k' }, catalog)).toBe(
      FALLBACK_PROGRAM_ID
    )
  })

  it('prefers higher priority', () => {
    expect(matchFinderProgramId({ goal: 'start_running', sex: 'women', raceDistance: '10k' }, catalog)).toBe(
      'endurance'
    )
  })
})

describe('isPlausibleFinderProgram', () => {
  it('allows foundations always', () => {
    expect(isPlausibleFinderProgram('foundations', { goal: 'lose_fat' }, catalog)).toBe(true)
  })

  it('rejects spoofed paid program ids', () => {
    expect(isPlausibleFinderProgram('hiking', { goal: 'lose_fat', sex: 'women' }, catalog)).toBe(false)
  })
})
