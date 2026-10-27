import { PROGRAMS, PROGRAM_ORDER, type Program, type ProgramCardFilter } from './programs'

export type ExploreFilter = 'all' | ProgramCardFilter

export const EXPLORE_FILTERS: { id: ExploreFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'free', label: 'Free' },
  { id: 'hiking', label: 'Hiking' },
  { id: 'endurance', label: 'Endurance' },
  { id: 'fat', label: 'Fat Loss' },
]

export function isExploreFilter(value: unknown): value is ExploreFilter {
  return typeof value === 'string' && EXPLORE_FILTERS.some((f) => f.id === value)
}

export function filterPrograms(filter: ExploreFilter): Program[] {
  const all = PROGRAM_ORDER.map((id) => PROGRAMS[id])
  return filter === 'all' ? all : all.filter((p) => p.card.filter === filter)
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
