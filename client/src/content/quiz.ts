import type { CoreProgramId, ProgramFaq } from './programs'

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

const GOAL_PROGRAM: Record<GoalAnswer, CoreProgramId> = {
  move: 'foundations',
  lose: 'fat_loss',
  race: 'endurance',
  out: 'hiking',
}

export interface QuizMatch {
  program: CoreProgramId
  nextUp: CoreProgramId | null
}

export function matchProgram(goal: GoalAnswer, experience: ExperienceAnswer): QuizMatch {
  let program: CoreProgramId = 'foundations'
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
  program: CoreProgramId
  nextUp: CoreProgramId | null
  completedAt: string
}

export function saveQuizResult(result: StoredQuizResult): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result))
  } catch {
    /* storage unavailable */
  }
}

/** Legacy 3-question storage — ignored after finder cutover (key may still exist on devices). */
export function loadQuizResult(): StoredQuizResult | null {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* storage unavailable */
  }
  return null
}

export function clearQuizResult(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* storage unavailable */
  }
}

export const FIND_COPY = {
  promo: {
    line: 'Offer ends Friday 1 January. One bonus leaves every Monday.',
  },
  hero: {
    eyebrow: 'Find my program',
    headline: "Starting over every Monday? Let's stop that.",
    subline:
      'Watch this short video, then tap the button. We ask a few questions, one screen at a time, and show you the program that fits where you are today. It takes about four minutes.',
    video: 'Video: The Start-Over Trap. Starts on its own, muted.',
    hear: 'Tap to hear',
    button: 'Find my program',
    trust: 'About 1,000 active members · Thika Road since July 2025',
  },
  offer: {
    badge: 'Offer ends Friday 1 January',
    heading: 'Join early and keep all 6 bonuses',
    body: 'Find your program, join before 1 January and get 6 guides with it. Every Monday at midnight one bonus is removed, and you keep every bonus that is open on the day you join. The guides arrive inside your program from 11 January, week by week.',
    weeksLabel: 'Bonuses open each week',
    button: 'Find my program',
    footnote: 'Dates and counter shown are for the 1 December start. The counter updates every Monday.',
    schedule: {
      endsAt: '2027-01-01',
      weekWindows: [
        { count: 6, label: '1 to 7 Dec', start: '2026-12-01', end: '2026-12-07' },
        { count: 5, label: '8 to 14 Dec', start: '2026-12-08', end: '2026-12-14' },
        { count: 4, label: '15 to 21 Dec', start: '2026-12-15', end: '2026-12-21' },
        { count: 3, label: '22 to 28 Dec', start: '2026-12-22', end: '2026-12-28' },
        { count: 2, label: '29 Dec to 1 Jan', start: '2026-12-29', end: '2027-01-01' },
      ],
      bonuses: [
        {
          number: 1,
          title: 'No-Nerves Busy Members First-Week Guide',
          body: 'How to start strong and get your first week right, step by step, even if you have never trained like this before.',
          arrives: 'Arrives before week 1',
          closesAt: null,
        },
        {
          number: 2,
          title: 'Packed-Schedule Busy Members Weekly Planner',
          body: 'How to fit every session into your week from day one, even with work, family and traffic, without giving up your family time.',
          arrives: 'Arrives in week 1',
          closesAt: '2026-12-28',
        },
        {
          number: 3,
          title: 'Proof-Of-Progress Busy Members Weekly Tracker',
          body: 'How to see your progress every week and know it is working, with one 5-minute sheet, even on weeks when your numbers look flat.',
          arrives: 'Arrives in week 1',
          closesAt: '2026-12-21',
        },
        {
          number: 4,
          title: 'Less-Sore Busy Members 10-Minute Recovery Guide',
          body: 'How to recover faster after every session and feel less sore the next day, with 10 minutes of stretches and simple food, no supplements needed.',
          arrives: 'Arrives in week 2',
          closesAt: '2026-12-14',
        },
        {
          number: 5,
          title: 'Life-Happens Busy Members Stay-On-Track Plan',
          body: 'How to get back on track the day after a missed session or a missed week, without starting over or feeling guilty, so you still finish your program.',
          arrives: 'Arrives in week 3',
          closesAt: null,
        },
        {
          number: 6,
          title: 'Finish-Line Busy Members Graduation Day Plan',
          body: 'How to finish your program and cross the line at the second-Saturday run feeling strong, with a clear plan for the week before and race morning, so there is no stress and no guessing.',
          arrives: 'Arrives in your last 2 weeks',
          closesAt: '2026-12-07',
        },
      ],
    },
  },
  whatYouGet: {
    eyebrow: 'When you finish',
    heading: 'Here is what you walk away with',
    items: [
      'The one program that fits where you are today',
      'Your Week 1, step by step',
      'A zone captain who checks on you',
      'The Saturday run with the whole community',
      '6 bonus guides when you join before the offer ends',
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
      'She could barely jog for one minute when she first came to a Saturday run. X weeks later, she finished a first 5K. It started with picking the right starting point.',
    ],
    signoff: '— Coach Maurice',
  },
  results: {
    video: 'Video: member result',
    cover: '/images/results-cover.jpg',
    coverAlt: 'Member before and after training with Coach Maurice',
    play: 'Watch her story',
    caption: 'First 5K in 8 weeks',
  },
  testimonials: {
    heading: 'What past clients say',
  },
  finalCta: {
    heading: 'Find your program before the next bonus leaves',
    body: 'Your program starts 11 January 2027. Finding it is free, takes about four minutes, and you see the price before you pay.',
    button: 'Find my program',
    trust: 'Offer ends Friday 1 January',
  },
  quiz: {
    heading: 'About four minutes. Built around you.',
    submit: 'Find my program',
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
      q: 'Is finding my program free?',
      a: 'Yes. You see your program, your start date and the price before you pay. Couch to 5K is free for the first 200 members.',
    },
    {
      q: 'How long does it take?',
      a: 'About four minutes. The questions come one screen at a time.',
    },
    {
      q: 'What happens after I finish?',
      a: 'You see your program, your dates and the bonuses. You make a free account, pay by M-Pesa, and your program starts on 11 January 2027. We message you on WhatsApp, and you pick a captain.',
    },
    {
      q: 'Which bonuses do I keep?',
      a: 'Every bonus that is open on the day you join. One bonus is removed every Monday at midnight until the offer ends on 1 January.',
    },
    {
      q: 'When do the bonus guides arrive?',
      a: 'Inside your program from 11 January, at the week you need them. The first guide arrives before week 1.',
    },
    {
      q: 'Will you push me to pay?',
      a: 'No. You choose. The bonuses leave on set dates, so the earlier you decide, the more you keep.',
    },
    {
      q: 'Is this for me if I have never run?',
      a: 'Yes. If you are a beginner, say you are a beginner. Nobody is judging you here.',
    },
  ] as ProgramFaq[],
}
