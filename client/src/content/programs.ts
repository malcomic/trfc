export type ProgramId = 'foundations' | 'fat_loss' | 'endurance' | 'hiking'
export type ProgramSlug = 'couch-to-5k' | 'fat-loss' | 'endurance' | 'hiking'

export interface ProgramFaq {
  q: string
  a: string
}

export interface Program {
  id: ProgramId
  slug: ProgramSlug
  name: string
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
  outlinePlaceholder: string
  shareNote?: string
  coachLine: string
  storyPlaceholder: string
  faqs: ProgramFaq[]
  join: { heading: string; body: string; footnote: string }
  cta: string
  barCta: string
  card: ProgramCardCopy
}

export type ProgramCardFilter = 'free' | 'fat' | 'endurance' | 'hiking'

export interface ProgramCardCopy {
  tag: string
  blurb: string
  button: string
  photoLabel: string
  filter: ProgramCardFilter
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

const PAID_CTA = 'Make my free account, then join'

function paidWeeklyItems(recovery: string) {
  return [
    { lead: 'A weekly guide', rest: ' with your tasks for the week.' },
    { lead: 'A weekly tracking sheet', rest: ' that you fill in.' },
    { lead: 'Recovery nutrition and stretches', rest: recovery },
    { lead: 'A captain', rest: ' who checks on you every week.' },
  ]
}

export const PROGRAMS: Record<ProgramId, Program> = {
  foundations: {
    id: 'foundations',
    slug: 'couch-to-5k',
    name: 'Couch to 5K',
    title: 'Never Run Before? Finish Your First 5K in 8 Weeks: The Couch to 5K Challenge',
    tagline:
      'You train 5 days and rest 2 days each week. On Saturday you run with the whole community. By Week 8, you run 5K.',
    lengthWeeks: 8,
    price: 0,
    memberPrice: 0,
    starts: 'January 2027',
    startsOn: null,
    chips: ['8 weeks', 'No equipment', 'For beginners'],
    heroNote: 'Never run before? That is who this is for. It is free, and it takes 2 minutes.',
    forYou: [
      'You have never run, or you stopped a long time ago.',
      'You start strong on Monday and quit by Thursday.',
      'You want to be around people who will not judge you.',
      'You want a clear next step, not a pile of plans.',
    ],
    whatYouGet: [
      { lead: 'A weekly guide.', rest: ' You know what to do each day of the week.' },
      { lead: 'A weekly tracking sheet.', rest: ' You fill it in, and you see your progress.' },
      { lead: 'Recovery tips.', rest: ' Stretches and food advice, so your body keeps up.' },
      { lead: 'A zone captain', rest: ' who checks on you every week.' },
      { lead: 'The Saturday run', rest: ' with the whole community.' },
      { lead: 'A finisher badge and certificate', rest: ' when you complete the 8 weeks.' },
    ],
    howItWorks: [
      { label: '5 days', title: 'You train', body: 'Short sessions that start easy. No equipment.' },
      { label: '2 days', title: 'You rest', body: 'Rest is part of the plan. Do not skip it.' },
      { label: 'Saturday', title: 'You run with us', body: 'Your captain is there. So are about 1,000 of us.' },
      { label: 'Week 8', title: 'You run 5K', body: 'Then you get your finisher badge.' },
    ],
    outlinePlaceholder: 'Week by week outline: Coach Maurice to add what happens in Weeks 1 to 8',
    shareNote:
      'Already run a lot? Share this program with a family member or a friend. We want as many people as we can running.',
    coachLine:
      'I have also picked plans that were too big for me, and I have also quit. That is why this program starts small.',
    storyPlaceholder:
      '[MEMBER NAME] could barely jog for one minute when [he/she] first came to a Saturday run. [X] weeks later, [he/she] finished a first 5K.',
    faqs: [
      { q: 'Is this really free?', a: 'Yes. The Couch to 5K program is free, and so is your account.' },
      { q: 'I have never run. Is it for me?', a: 'Yes. That is exactly who it is for. Nobody is judging you here.' },
      { q: 'Do I need equipment?', a: 'No. You only need shoes and a plan.' },
      {
        q: 'What happens after I sign up?',
        a: 'You make a free account and pick a captain. The program opens on your dashboard. We message you on WhatsApp.',
      },
      {
        q: 'What comes after Week 8?',
        a: 'You can join the Endurance & Race Prep program and run your first 10K. Members get 15% off one paid program a year.',
      },
    ],
    join: {
      heading: 'Make Monday the last time you start over.',
      body: 'Make your free account. Your 8-week program opens in your dashboard, and your captain says hello.',
      footnote: 'Free. 2 minutes. Starts January 2027.',
    },
    cta: 'Make my free account and start',
    barCta: 'Start free',
    card: {
      tag: 'Free',
      blurb: 'Train 5 days, rest 2, and run with the community on Saturday. By Week 8, you run 5K.',
      button: 'Start free',
      photoLabel: 'Saturday community run',
      filter: 'free',
    },
  },
  fat_loss: {
    id: 'fat_loss',
    slug: 'fat-loss',
    name: 'Fat Loss & Fitness',
    title: 'Clothes Not Fitting Anymore? Busy Adults, Fit Back in Your Clothes in 12 Weeks Transformation',
    tagline:
      'A 12-week plan for people with a full schedule. You follow one clear step each week, and your captain checks on you.',
    lengthWeeks: 12,
    price: 3497,
    memberPrice: 2972,
    starts: 'January 2027',
    startsOn: null,
    chips: ['12 weeks', 'Fat loss and fitness', 'Built for busy people'],
    heroNote:
      'Not sure about paying yet? Start with the free Couch to 5K. Make your free account first, then you pay by M-Pesa and Week 1 opens.',
    forYou: [
      'Your clothes do not fit like they used to.',
      'You are busy with work, kids or both, and you have little time.',
      'You have started plans before and stopped, because they were too much.',
      'You want someone to check on you each week.',
    ],
    whatYouGet: [
      ...paidWeeklyItems(', so you feel good and keep going.'),
      { lead: 'The Saturday run', rest: ' with the whole community.' },
      { lead: 'A finisher badge and certificate', rest: ' at the end of the 12 weeks.' },
    ],
    howItWorks: [
      { label: '12 weeks', title: 'One program', body: 'From start to finish, in your account.' },
      { label: 'Every week', title: 'A guide and a sheet', body: 'You read it, do it, and tick it off.' },
      { label: 'Every week', title: 'Your captain checks in', body: 'They see if you filled in your sheet.' },
      { label: 'Saturday', title: 'You run, jog or walk', body: 'With about 1,000 of us.' },
    ],
    outlinePlaceholder: 'Week by week outline: Coach Maurice to add what happens in Weeks 1 to 12',
    coachLine:
      'I have picked plans that were too big for me, and I have quit. That is why I match this program to where you are today.',
    storyPlaceholder: '[MEMBER NAME], [result, e.g. clothes fit again after X weeks]',
    faqs: [
      {
        q: 'How much does it cost?',
        a: 'KSh 3,497 for the 12 weeks. Members pay KSh 2,972, which is 15% off. You see the price before you pay.',
      },
      {
        q: 'How do I join?',
        a: 'Make a free account first. Then you pay by M-Pesa, and Week 1 opens. We message you on WhatsApp, and you pick a captain.',
      },
      {
        q: 'I am very busy. Will this work for me?',
        a: 'This program is built for busy people. You get one clear step each week, not a pile of tasks.',
      },
      {
        q: 'Not sure about paying yet?',
        a: 'Start with the free Couch to 5K program and see how you like it. Nobody is going to push you to pay.',
      },
      { q: 'What if I have an injury or a health condition?', a: 'Talk to your doctor before you start.' },
    ],
    join: {
      heading: 'Fit back in your clothes. Start where you are.',
      body: 'Make your free account first. Then join the 12-week program and get your Week 1.',
      footnote: 'KSh 3,497, or KSh 2,972 for members. Starts January 2027.',
    },
    cta: PAID_CTA,
    barCta: 'Join, KSh 3,497',
    card: {
      tag: 'Fat Loss',
      blurb: 'A 12-week plan for people with a full schedule. One clear step each week, and a captain who checks on you.',
      button: 'Learn more',
      photoLabel: 'Group workout',
      filter: 'fat',
    },
  },
  endurance: {
    id: 'endurance',
    slug: 'endurance',
    name: 'Endurance & Race Prep',
    title: 'Finished a 5K? Now Run Your First 10K in 10 Weeks Program',
    tagline:
      'You can already run 5K. Now you go further, one step at a time, with a captain and the whole community beside you.',
    lengthWeeks: 10,
    price: 1500,
    memberPrice: 1275,
    starts: 'January 2027',
    startsOn: null,
    chips: ['10 weeks', 'First 10K', 'Endurance and race prep'],
    heroNote:
      'Not sure you are ready? Start with the free Couch to 5K. Make your free account first, then you pay by M-Pesa and Week 1 opens.',
    forYou: [
      'You have finished a 5K, and you want to go further.',
      'You want to run a race, and you want a plan to get you there.',
      'You tend to do too much, too soon, and then stop.',
      'You want people to train with, not just a plan on your phone.',
    ],
    forYouNote: 'Never run a 5K? Start with the free Couch to 5K program first.',
    whatYouGet: [
      ...paidWeeklyItems(', so your legs keep up as you go further.'),
      { lead: 'The Saturday run', rest: ' with the whole community.' },
      { lead: 'A finisher badge and certificate', rest: ' at the end of the 10 weeks.' },
    ],
    howItWorks: [
      { label: '10 weeks', title: '5K to 10K', body: 'A little further each week.' },
      { label: 'Every week', title: 'A guide and a sheet', body: 'You read it, do it, and tick it off.' },
      { label: 'Every week', title: 'Your captain checks in', body: 'They see if you filled in your sheet.' },
      { label: 'Saturday', title: 'You run with us', body: 'With about 1,000 of us.' },
    ],
    outlinePlaceholder: 'Week by week outline: Coach Maurice to add what happens in Weeks 1 to 10',
    coachLine:
      'I have picked plans that were too big for me, and I have quit. That is why this program adds distance slowly.',
    storyPlaceholder: '[MEMBER NAME], [result, e.g. first 10K after X weeks]',
    faqs: [
      {
        q: 'How much does it cost?',
        a: 'KSh 1,500 for the 10 weeks. Members pay KSh 1,275, which is 15% off. You see the price before you pay.',
      },
      {
        q: 'Do I need to have run a 5K first?',
        a: 'It helps. If you have not, start with the free Couch to 5K program, then come back.',
      },
      {
        q: 'How do I join?',
        a: 'Make a free account first. Then you pay by M-Pesa, and Week 1 opens. We message you on WhatsApp, and you pick a captain.',
      },
      {
        q: 'Will this get me ready for a race?',
        a: 'Yes. It is built to get you to your first 10K. Our Thika Road Marathon on Sunday 4 April 2027 has a 10K race.',
      },
      { q: 'What if I have an injury or a health condition?', a: 'Talk to your doctor before you start.' },
    ],
    join: {
      heading: 'You ran 5K. Your first 10K is next.',
      body: 'Make your free account first. Then join the 10-week program and get your Week 1.',
      footnote: 'KSh 1,500, or KSh 1,275 for members. Starts January 2027.',
    },
    cta: PAID_CTA,
    barCta: 'Join, KSh 1,500',
    card: {
      tag: 'Endurance',
      blurb: 'You can already run 5K. Now you go further, one step at a time, ready for your first race.',
      button: 'Learn more',
      photoLabel: 'Runners on Thika Road',
      filter: 'endurance',
    },
  },
  hiking: {
    id: 'hiking',
    slug: 'hiking',
    name: 'Hiking',
    title: 'Never Hiked Before? Climb Your First Peak with Confidence in 6 Weeks Challenge',
    tagline:
      'Get your legs, your lungs and your confidence ready. You train with your captain and the community, then you climb.',
    lengthWeeks: 6,
    price: 997,
    memberPrice: 847,
    starts: 'January 2027',
    startsOn: null,
    chips: ['6 weeks', 'Hiking', 'For first-timers'],
    heroNote:
      'Never hiked? That is who this is for. Make your free account first, then you pay by M-Pesa and Week 1 opens.',
    memberNote: 'Members get 15% off one paid program a year, and book hike seats first.',
    forYou: [
      'You have never hiked, and you want to try.',
      'You want to be outside, with people, doing something new.',
      'You worry you will not keep up on a hike.',
      'You want to get ready before you climb, not on the day.',
    ],
    whatYouGet: [
      ...paidWeeklyItems(', so your legs are ready for the climb.'),
      { lead: 'Hikes with the community.', rest: ' Your ticket shows the pickup and drop-off points.' },
      { lead: 'A finisher badge and certificate', rest: ' at the end of the 6 weeks.' },
    ],
    howItWorks: [
      { label: '6 weeks', title: 'Get ready to climb', body: 'Build your legs and your lungs, step by step.' },
      { label: 'Every week', title: 'A guide and a sheet', body: 'You read it, do it, and tick it off.' },
      { label: 'Every week', title: 'Your captain checks in', body: 'They see if you filled in your sheet.' },
      { label: 'Hike day', title: 'You climb with us', body: 'Book your seat from the calendar. Pay a bit at a time.' },
    ],
    outlinePlaceholder: 'Week by week outline and which hikes are in this program: Coach Maurice to add',
    coachLine:
      'I have picked plans that were too big for me, and I have quit. That is why this program starts where you are.',
    storyPlaceholder: '[MEMBER NAME], [result, e.g. first peak climbed after X weeks]',
    faqs: [
      {
        q: 'How much does it cost?',
        a: 'KSh 997 for the 6 weeks. Members pay KSh 847, which is 15% off. You see the price before you pay.',
      },
      { q: 'I have never hiked. Is it for me?', a: 'Yes. The title says it. This program is for first-timers.' },
      {
        q: 'How do I join?',
        a: 'Make a free account first. Then you pay by M-Pesa, and Week 1 opens. We message you on WhatsApp, and you pick a captain.',
      },
      {
        q: 'How do I book a hike seat?',
        a: 'From the calendar in your account. You can pay a bit at a time: put down 30% to hold your seat, and pay the rest at least 3 days before the hike. Your ticket shows the pickup and drop-off points. Members book first.',
      },
      { q: 'What if I have an injury or a health condition?', a: 'Talk to your doctor before you start.' },
    ],
    join: {
      heading: 'Your first peak is closer than you think.',
      body: 'Make your free account first. Then join the 6-week program and get your Week 1.',
      footnote: 'KSh 997, or KSh 847 for members. Starts January 2027.',
    },
    cta: PAID_CTA,
    barCta: 'Join, KSh 997',
    card: {
      tag: 'Hiking',
      blurb: 'Get your legs, lungs and confidence ready. You train with your captain, then you climb with us.',
      button: 'Learn more',
      photoLabel: 'Hike day',
      filter: 'hiking',
    },
  },
}

export const PROGRAM_ORDER: ProgramId[] = ['foundations', 'fat_loss', 'endurance', 'hiking']

export const PROGRAM_BY_SLUG: Record<ProgramSlug, Program> = Object.fromEntries(
  PROGRAM_ORDER.map((id) => [PROGRAMS[id].slug, PROGRAMS[id]]),
) as Record<ProgramSlug, Program>

export function isProgramId(value: unknown): value is ProgramId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PROGRAMS, value)
}

export function programBySlug(slug: string | undefined): Program | undefined {
  if (!slug || !Object.prototype.hasOwnProperty.call(PROGRAM_BY_SLUG, slug)) return undefined
  return PROGRAM_BY_SLUG[slug as ProgramSlug]
}

export function programPath(id: ProgramId): string {
  return `/programs/${PROGRAMS[id].slug}`
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
