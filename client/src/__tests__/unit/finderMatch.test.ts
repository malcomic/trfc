import { describe, expect, it } from 'vitest'
import { FALLBACK_PROGRAM_ID, matchFinder } from '../../content/finder/match'
import type { CatalogProgram } from '../../content/programs'
import type { FinderAnswers } from '../../content/finder/types'

function program(
  id: string,
  quiz: CatalogProgram['quiz'],
  sort_order = 1
): CatalogProgram {
  return {
    id,
    slug: id,
    name: id,
    is_core: true,
    sort_order,
    weekCount: 8,
    quiz,
    page: {
      title: id,
      tagline: '',
      price: id === 'foundations' ? 0 : 1000,
      memberPrice: 850,
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
    card: { tag: '', blurb: '', button: '', category: '' },
  }
}

const catalog = [
  program('foundations', { goals: ['start_running'], sex: 'any', priority: 10 }, 1),
  program('fat_loss', { goals: ['lose_fat', 'build_muscle', 'get_stronger'], sex: 'any', priority: 20 }, 2),
  program('endurance', { goals: ['start_running', 'longer_race'], sex: 'any', raceDistances: ['10k', '21k'], priority: 30 }, 3),
  program('hiking', { goals: ['hike'], sex: 'any', hikeTargets: ['kenya'], priority: 20 }, 4),
  program('elite_mothers', { goals: ['lose_fat'], sex: 'women', eliteOffer: true, priority: 5 }, 5),
]

describe('matchFinder', () => {
  it('matches fat loss goals', () => {
    const answers: FinderAnswers = { goal: 'lose_fat', sex: 'women' }
    expect(matchFinder(answers, catalog).program.id).toBe('fat_loss')
  })

  it('allows sex any', () => {
    const answers: FinderAnswers = { goal: 'hike', sex: 'men', hikeTarget: 'kenya' }
    expect(matchFinder(answers, catalog).program.id).toBe('hiking')
  })

  it('falls back to foundations when nothing matches', () => {
    const answers: FinderAnswers = { goal: 'longer_race', sex: 'men', raceDistance: '42k' }
    expect(matchFinder(answers, catalog).program.id).toBe(FALLBACK_PROGRAM_ID)
  })

  it('returns elite offer when hasChildren is yes', () => {
    const answers: FinderAnswers = { goal: 'lose_fat', sex: 'women', hasChildren: 'yes' }
    const result = matchFinder(answers, catalog)
    expect(result.program.id).toBe('fat_loss')
    expect(result.elite?.id).toBe('elite_mothers')
  })

  it('prefers higher priority', () => {
    const answers: FinderAnswers = { goal: 'start_running', sex: 'women', raceDistance: '10k' }
    expect(matchFinder(answers, catalog).program.id).toBe('endurance')
  })
})
