/** Program ids are set by admins; the four below ship with the site and drive the quiz and signups. */
export type ProgramId = string
export type CoreProgramId = 'foundations' | 'fat_loss' | 'endurance' | 'hiking'

export const CORE_PROGRAMS: { id: CoreProgramId; slug: string; name: string }[] = [
  { id: 'foundations', slug: 'couch-to-5k', name: 'Couch to 5K' },
  { id: 'fat_loss', slug: 'fat-loss', name: 'Fat Loss & Fitness' },
  { id: 'endurance', slug: 'endurance', name: 'Endurance & Race Prep' },
  { id: 'hiking', slug: 'hiking', name: 'Hiking' },
]

export const CORE_PROGRAM_IDS: CoreProgramId[] = CORE_PROGRAMS.map((p) => p.id)

/** Core slugs cannot be changed by admins, so links to the free program are safe to hard-code. */
export const FREE_PROGRAM_SLUG = 'couch-to-5k'

export function isCoreProgramId(value: unknown): value is CoreProgramId {
  return typeof value === 'string' && CORE_PROGRAMS.some((p) => p.id === value)
}

export function coreProgramName(id: string): string {
  return CORE_PROGRAMS.find((p) => p.id === id)?.name ?? id
}

export interface ProgramFaq {
  q: string
  a: string
}

export interface ProgramCardCopy {
  tag: string
  blurb: string
  button: string
  photoLabel: string
  /** Browse filter label, for example "Hiking". Empty means the card only shows under All (and Free when free). */
  category: string
  image: string | null
}

export interface Program {
  id: ProgramId
  slug: string
  name: string
  isCore: boolean
  title: string
  tagline: string
  lengthWeeks: number
  price: number
  memberPrice: number
  starts: string
  /** First day of Week 1 as YYYY-MM-DD, or null until the date is decided. */
  startsOn: string | null
  chips: string[]
  heroNote: string
  memberNote?: string
  forYou: string[]
  forYouNote?: string
  whatYouGet: { lead: string; rest: string }[]
  howItWorks: { label: string; title: string; body: string }[]
  outline?: string
  shareNote?: string
  coachLine: string
  story: string
  faqs: ProgramFaq[]
  join: { heading: string; body: string; footnote: string }
  cta: string
  barCta: string
  heroImage: string | null
  card: ProgramCardCopy
}

/** Shape of a program in GET /programs/catalog and /programs/by-slug/:slug. */
export interface CatalogProgram {
  id: string
  slug: string
  name: string
  is_core: boolean
  sort_order: number
  weekCount: number
  page: {
    title: string
    tagline: string
    price: number
    memberPrice: number
    startsLabel: string
    startsOn: string | null
    chips: string[]
    heroNote: string
    memberNote?: string
    forYou: string[]
    forYouNote?: string
    whatYouGet: { lead: string; rest: string }[]
    howItWorks: { label: string; title: string; body: string }[]
    outline?: string
    coachLine: string
    story: string
    faqs: ProgramFaq[]
    join: { heading: string; body: string; footnote: string }
    cta: string
    barCta: string
    shareNote?: string
    heroImage?: string | null
  }
  card: {
    tag: string
    blurb: string
    button: string
    category: string
    photoLabel?: string
    image?: string | null
  }
  preview?: boolean
}

export function programFromCatalog(entry: CatalogProgram): Program {
  const { page, card } = entry
  return {
    id: entry.id,
    slug: entry.slug,
    name: entry.name,
    isCore: entry.is_core,
    title: page.title,
    tagline: page.tagline,
    lengthWeeks: entry.weekCount,
    price: Number(page.price) || 0,
    memberPrice: Number(page.memberPrice) || 0,
    starts: page.startsLabel,
    startsOn: page.startsOn ?? null,
    chips: page.chips ?? [],
    heroNote: page.heroNote,
    memberNote: page.memberNote || undefined,
    forYou: page.forYou ?? [],
    forYouNote: page.forYouNote || undefined,
    whatYouGet: page.whatYouGet ?? [],
    howItWorks: page.howItWorks ?? [],
    outline: page.outline || undefined,
    shareNote: page.shareNote || undefined,
    coachLine: page.coachLine,
    story: page.story,
    faqs: page.faqs ?? [],
    join: page.join,
    cta: page.cta,
    barCta: page.barCta,
    heroImage: page.heroImage ?? null,
    card: {
      tag: card.tag,
      blurb: card.blurb,
      button: card.button,
      photoLabel: card.photoLabel || entry.name,
      category: card.category ?? '',
      image: card.image ?? null,
    },
  }
}

export const COACH_INTRO =
  'I started Thika Road Fitness Community in July 2025. Seven people came to our first bootcamp. Today about 1,000 of us run, jog and walk together, from Thika to Ngara.'

export const COACH_PHOTO = '/images/coach-maurice.jpg'

export const DISCLAIMER =
  'Results are different for every person. How far you get depends on how often you show up. These programs are for general fitness. If you have an injury or a health condition, talk to your doctor before you start. TRFC is run by Active Tribe Wellness.'

export const MEMBER_DISCOUNT_NOTE = 'Members get 15% off one paid program a year.'

export function formatKsh(amount: number): string {
  return amount === 0 ? 'Free' : `KSh ${amount.toLocaleString('en-US')}`
}

export function programPath(slug: string): string {
  return `/programs/${slug}`
}

/** The member's own copy of a program inside the dashboard. */
export function dashboardProgramPath(slug: string, week?: number, rest = ''): string {
  const base = `/dashboard/programs/${slug}`
  return week ? `${base}/week/${week}${rest}` : base
}

export interface ProgramWeek {
  week: number
  total: number
  percent: number
  started: boolean
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Where a program stands on `today` (YYYY-MM-DD). Before the start date it is Week 1 at 0%. */
export function programWeek(program: Pick<Program, 'lengthWeeks' | 'startsOn'>, today: string): ProgramWeek {
  const total = program.lengthWeeks
  const start = program.startsOn ? Date.parse(`${program.startsOn}T00:00:00Z`) : NaN
  const now = Date.parse(`${today}T00:00:00Z`)
  if (Number.isNaN(start) || Number.isNaN(now) || now < start) {
    return { week: 1, total, percent: 0, started: false }
  }
  const week = Math.min(total, Math.floor((now - start) / (7 * DAY_MS)) + 1)
  return { week, total, percent: Math.round((week / total) * 100), started: true }
}
