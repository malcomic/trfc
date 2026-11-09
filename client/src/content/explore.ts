import type { Program } from './programs'

/** 'all', 'free', or a category id such as 'fat-loss'. */
export type ExploreFilter = string

export interface ExploreFilterOption {
  id: ExploreFilter
  label: string
}

export function categoryId(category: string): string {
  return category
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** All and Free first, then one chip per card category in A to Z order. */
export function exploreFilters(programs: Program[]): ExploreFilterOption[] {
  const categories = new Map<string, string>()
  for (const p of programs) {
    const id = categoryId(p.card.category)
    if (id && id !== 'all' && id !== 'free' && !categories.has(id)) categories.set(id, p.card.category.trim())
  }
  const sorted = [...categories].sort((a, b) => a[1].localeCompare(b[1]))
  const filters: ExploreFilterOption[] = [{ id: 'all', label: 'All' }]
  if (programs.some((p) => p.price === 0)) filters.push({ id: 'free', label: 'Free' })
  return [...filters, ...sorted.map(([id, label]) => ({ id, label }))]
}

export function filterPrograms(programs: Program[], filter: ExploreFilter): Program[] {
  if (filter === 'all') return programs
  if (filter === 'free') return programs.filter((p) => p.price === 0)
  return programs.filter((p) => categoryId(p.card.category) === filter)
}

export const EXPLORE_COPY = {
  hero: {
    eyebrow: 'Explore programs',
    heading: 'Programs built to fit where you are',
    lead: 'Pick the one that matches today, not the one that looks best online. You start one program at a time.',
  },
  quizStrip: {
    text: 'Not sure which one? Take the 3-question quiz. It takes 2 minutes.',
    button: 'Find my program',
  },
  programs: {
    label: 'Programs',
    filterLabel: 'Filter programs',
    startsPrefix: 'Starts',
    memberPrefix: 'Members pay',
    freeForAll: 'Free for everyone',
    empty: 'No programs match this filter yet.',
  },
  how: {
    eyebrow: 'How it works',
    heading: 'Three steps to your first week',
    steps: [
      { title: 'Make a free account', body: 'It takes 2 minutes. You pick your zone captain.' },
      {
        title: 'Pick your program',
        body: 'Take the quiz, or choose one from this page. Paid programs are paid by M-Pesa.',
      },
      {
        title: 'Start Week 1',
        body: 'Your guide and tracking sheet open in your dashboard, and your captain says hello.',
      },
    ],
  },
  values: {
    eyebrow: 'What we stand on',
    heading: 'Five things. Every program.',
    items: ['Routine.', 'Order.', 'Discipline.', 'Unity.', 'Inclusivity.'],
    footer: 'Come as you are.',
  },
} as const

export function stepNumber(index: number): string {
  return String(index + 1).padStart(2, '0')
}
