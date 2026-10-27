import type { ProgramFaq, ProgramId } from './programs'

export type GoalAnswer = 'move' | 'lose' | 'race' | 'out'
export type ExperienceAnswer = 'none' | 'some' | 'active' | 'runner'
export type DaysAnswer = 'few' | 'some' | 'most'

export interface QuizAnswers {
  goal: GoalAnswer | null
  experience: ExperienceAnswer | null
  days: DaysAnswer | null
}

export interface QuizQuestion<T extends string> {
  key: keyof QuizAnswers
  legend: string
  options: { value: T; label: string }[]
}

export const GOAL_QUESTION: QuizQuestion<GoalAnswer> = {
  key: 'goal',
  legend: '1. What brings you to TRFC right now?',
  options: [
    { value: 'move', label: 'I want to start moving again' },
    { value: 'lose', label: 'I want to lose weight and get fit' },
    { value: 'race', label: 'I want to run a race, or go further than I have before' },
    { value: 'out', label: 'I want to be outside and try something new' },
  ],
}

export const EXPERIENCE_QUESTION: QuizQuestion<ExperienceAnswer> = {
  key: 'experience',
  legend: '2. How much have you exercised in the last 3 months?',
  options: [
    { value: 'none', label: 'Not much, if I am honest' },
    { value: 'some', label: 'A little, a few times a month' },
    { value: 'active', label: 'I have been active, just not with a group' },
    { value: 'runner', label: 'I can already run 5K without stopping' },
  ],
}

export const DAYS_QUESTION: QuizQuestion<DaysAnswer> = {
  key: 'days',
  legend: '3. How many days a week can you train?',
  options: [
    { value: 'few', label: '2 or 3 days' },
    { value: 'some', label: '4 or 5 days' },
    { value: 'most', label: 'Most days' },
  ],
}

const GOAL_PROGRAM: Record<GoalAnswer, ProgramId> = {
  move: 'foundations',
  lose: 'fat_loss',
  race: 'endurance',
  out: 'hiking',
}

export interface QuizMatch {
  program: ProgramId
  nextUp: ProgramId | null
}

export function matchProgram(goal: GoalAnswer, experience: ExperienceAnswer): QuizMatch {
  let program: ProgramId = 'foundations'
  if (experience === 'active' || experience === 'runner') {
    if (goal === 'lose') program = 'fat_loss'
    else if (goal === 'out') program = 'hiking'
    else if (experience === 'runner') program = 'endurance'
  }
  const goalProgram = GOAL_PROGRAM[goal]
  const nextUp = program === 'foundations' && goalProgram !== 'foundations' ? goalProgram : null
  return { program, nextUp }
}

const WEEK_LINES: Record<DaysAnswer, string> = {
  few: 'Start with 2 or 3 days a week. That is enough to begin.',
  some: '4 or 5 days a week fits well. Keep 2 days for rest.',
  most: 'You can train most days, but keep 1 or 2 days for rest. Rest is part of the plan.',
}

export function weekLine(days: DaysAnswer): string {
  return WEEK_LINES[days]
}

const STORAGE_KEY = 'trfc_quiz_v1'

export interface StoredQuizResult {
  goal: GoalAnswer
  experience: ExperienceAnswer
  days: DaysAnswer
  program: ProgramId
  nextUp: ProgramId | null
  completedAt: string
}

export function saveQuizResult(result: StoredQuizResult): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result))
  } catch {
    /* storage unavailable */
  }
}

export function loadQuizResult(): StoredQuizResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredQuizResult) : null
  } catch {
    return null
  }
}

export function clearQuizResult(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* storage unavailable */
  }
}

export const FIND_COPY = {
  hero: {
    eyebrow: 'Find my program',
    headline: "Starting over every Monday? Let's stop that.",
    subline: 'Watch this short video, then answer 3 questions. We pick the program that fits where you are today.',
    video: 'Video: The Start-Over Trap. Starts on its own, muted.',
    hear: 'Tap to hear',
    button: 'Find my program',
    trust: 'About 1,000 active members · Thika Road since July 2025',
  },
  whatYouGet: {
    eyebrow: 'After the quiz',
    heading: 'Here is what you walk away with',
    items: [
      'The one program that fits where you are today',
      'Your Week 1, step by step',
      'A zone captain who checks on you',
      'The Saturday run with the whole community',
      'A free account, so your tickets and progress sit in one place',
    ],
  },
  patterns: {
    heading: 'This shows up one of three ways',
    items: [
      {
        title: "You pick what's popular",
        body: 'A marathon plan. A fat loss challenge from Instagram. It looked good online, but it was never made for where you are.',
      },
      { title: 'You do too much, too soon', body: 'You run every day and cut out food. By Thursday you are done.' },
      { title: 'You keep restarting', body: 'Work, kids or travel got in the way, and then it is Monday again.' },
    ],
  },
  coachLine: 'I have also picked plans that were too big for me, and I have also quit. That is why I care so much about where you start.',
  story: {
    heading: 'I have been there too',
    paragraphs: [
      'I picked plans that were too big for me at the time. I did too much, too soon, and I stopped within weeks.',
      'Then I matched what I did to where I really was. I stopped guessing and followed the next step.',
      '[MEMBER NAME] could barely jog for one minute when [he/she] first came to a Saturday run. [X] weeks later, [he/she] finished a first 5K. It started with picking the right starting point.',
    ],
    signoff: '— Coach Maurice',
  },
  results: {
    video: 'Video: member result',
    cover: '/images/results-cover.jpg',
    coverAlt: 'Member before and after training with Coach Maurice',
    play: 'Watch her story',
    caption: '[Member name], [result, e.g. First 5K in 8 weeks]',
  },
  quiz: {
    heading: 'Three questions. About 2 minutes.',
    submit: 'See my program',
  },
  result: {
    eyebrow: 'Your program',
    length: 'Length',
    price: 'Price',
    memberPrice: 'Member price (15% off)',
    week: 'Your week:',
    nextUp: 'Next up, for your goal',
    seeIt: 'See it',
    button: 'See my program',
    note: 'Everyone makes a free account first. For a paid program, you pay by M-Pesa after that, and Week 1 opens. TRFC members get 15% off one program a year.',
    retake: 'Take the quiz again',
  },
  faqs: [
    {
      q: 'Is the quiz free?',
      a: 'Yes. The Couch to 5K program is free too. The other programs cost money, and you see the price before you pay.',
    },
    { q: 'How long does it take?', a: 'About 2 minutes.' },
    {
      q: 'What happens after I finish?',
      a: 'You see your program and make a free account. The free program opens on your dashboard right away. For a paid one, you pay by M-Pesa and Week 1 opens. We message you on WhatsApp, and you pick a captain.',
    },
    { q: 'Will you push me to pay?', a: 'No. Start with the free program and see how you like it.' },
    {
      q: 'Is this for me if I have never run?',
      a: 'Yes. If you are a beginner, say you are a beginner. Nobody is judging you here.',
    },
  ] as ProgramFaq[],
}
