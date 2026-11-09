import { programFromCatalog, type CatalogProgram, type Program } from '../../content/programs'

export function catalogEntry(overrides: {
  id: string
  slug?: string
  name?: string
  price?: number
  category?: string
  weekCount?: number
  image?: string | null
}): CatalogProgram {
  const { id, slug = id.replace(/_/g, '-'), name = id, price = 0, category = '', weekCount = 4, image = null } = overrides
  return {
    id,
    slug,
    name,
    is_core: false,
    sort_order: 1,
    weekCount,
    page: {
      title: `${name} title`,
      tagline: `${name} tagline`,
      price,
      memberPrice: Math.round(price * 0.85),
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
      cta: 'Join',
      barCta: 'Join',
    },
    card: { tag: '', blurb: '', button: 'Learn more', category, image },
  }
}

/** The four core programs as the catalog returns them after the migration. */
export const CORE_FIXTURE: Program[] = [
  catalogEntry({ id: 'foundations', slug: 'couch-to-5k', name: 'Couch to 5K', weekCount: 8 }),
  catalogEntry({ id: 'fat_loss', slug: 'fat-loss', name: 'Fat Loss & Fitness', price: 3497, category: 'Fat Loss', weekCount: 12 }),
  catalogEntry({ id: 'endurance', name: 'Endurance & Race Prep', price: 1697, category: 'Endurance', weekCount: 10 }),
  catalogEntry({ id: 'hiking', name: 'Hiking', price: 997, category: 'Hiking', weekCount: 6 }),
].map(programFromCatalog)
