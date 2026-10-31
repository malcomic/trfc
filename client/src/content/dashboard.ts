import { toKenyanMsisdn } from './onboarding'

const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000

export type Greeting = 'Good morning' | 'Good afternoon' | 'Good evening'

/** Greeting for the current hour in Nairobi (UTC+3, no daylight saving). */
export function greetingFor(now: Date = new Date()): Greeting {
  const hour = new Date(now.getTime() + NAIROBI_OFFSET_MS).getUTCHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function firstName(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] ?? ''
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : ''
  return (first + last).toUpperCase()
}

export interface SupportLink {
  href: string
  external: boolean
}

export const CONTACT_PATH = '/contact'

/** Support goes to the member's captain on WhatsApp, or the Contact page when there is no number. */
export function supportLink(captain: { whatsapp?: string | null } | null | undefined): SupportLink {
  const msisdn = captain?.whatsapp ? toKenyanMsisdn(captain.whatsapp) : null
  return msisdn ? { href: `https://wa.me/${msisdn}`, external: true } : { href: CONTACT_PATH, external: false }
}

export const DASHBOARD_COPY = {
  header: {
    subtitle: 'Here is your week.',
    freePill: 'Free account',
    memberPill: (until: string) => `Member until ${until}`,
    reminders: 'Reminders',
  },
  stats: {
    saturdays: { label: 'Saturdays attended', note: 'Goes up each time you run with us.' },
    program: { label: (name: string) => `Your ${name} program`, none: 'Pick a program', noneNote: 'Explore programs' },
    nextEvent: { label: 'Next event', fallback: 'Saturday community run', none: 'None yet', noneNote: 'See the calendar' },
    captain: { label: 'Your zone captain', none: 'Choose a captain', noneNote: 'Pick one in My Zone' },
    points: { label: 'Points this season', value: '[0]', note: '[Earning rule to be decided]' },
    pendingPayments: (n: number) => `${n} payment${n === 1 ? ' is' : 's are'} still pending.`,
    viewPayments: 'View payments',
  },
  program: {
    heading: (name: string) => `Your program: ${name}`,
    weekOf: (week: number, total: number) => `Week ${week} of ${total}`,
    starts: (when: string) => `Starts ${when}`,
    thisWeek: 'This week',
    sessions: ['Day 1: [Session]', 'Day 2: [Session]', 'Day 3: [Session]', 'Saturday: Community run'],
    guide: 'Open my weekly guide',
    noneHeading: 'You have not joined a program yet',
    noneBody: 'Start with the free Couch to 5K, or find the program that fits you.',
    matchLine: (name: string) => `Your quiz picked ${name}.`,
    startFree: 'Start Couch to 5K',
    seeMatch: (name: string) => `See ${name}`,
    explore: 'Explore programs',
  },
  tickets: {
    heading: 'My tickets',
    empty: 'You have no tickets yet. Book an event from the calendar, and your ticket shows here with its QR code.',
    calendar: 'See the calendar',
    all: 'See all tickets',
  },
  comingUp: {
    heading: 'Coming up',
    book: 'Book',
    details: 'See details',
    installments: 'Pay a bit at a time: 30% holds your place.',
    empty: 'New events are on the way. Check the calendar soon.',
  },
  explore: {
    heading: 'Ready for more?',
    body: 'Hiking, Endurance & Race Prep, and Fat Loss & Fitness. Not sure which? Take the 3-question quiz.',
    button: 'Explore programs',
    quiz: 'Take the quiz',
  },
  becomeMember: {
    badge: 'Coming 1 December',
    heading: 'Become a member',
    body: 'An upgrade on your free account. You keep everything you have now. Nobody has to join.',
    benefits: [
      '15% off one paid program a year',
      'Points and season awards',
      'Hike seats: members book first',
      'Guides library and monthly live Q&A',
    ],
  },
  memberPrice: {
    heading: 'Your member price',
    body: '15% off one paid program this year.',
    button: 'Use my discount',
  },
  points: {
    heading: 'Points and awards',
    body: '[Points and season awards show here once the earning rules are decided.]',
  },
  perks: {
    heading: 'Member perks',
    items: [
      { title: 'Hike seats', body: 'Members book first. Open date: [date]' },
      { title: 'Guides library', body: '[Topics to be listed]' },
      { title: 'Monthly live Q&A', body: 'Next one: [date]' },
      { title: 'Partner discounts', body: '[Partners to be listed]' },
    ],
  },
  zone: {
    title: 'MY',
    highlight: 'ZONE',
    subtitle: 'Your captain checks on you every week.',
    captainLabel: 'Your zone captain',
    zoneLabel: 'Zone',
    message: 'Message on WhatsApp',
    noNumber: 'Your captain has not added a WhatsApp number yet. Reach the TRFC team from the Contact page.',
    contact: 'Contact TRFC',
    noneHeading: 'You do not have a captain yet',
    noneBody: 'Your captain is your guide in the community. Choose one below and they will say hello.',
    changeCaptain: 'Change captain',
    pickerLabel: 'Captain',
    pickerPlaceholder: 'Select a captain',
    zoneOnly: (zone: string) => `You can pick any captain in the ${zone} zone.`,
    anyZone: 'Pick a captain near you. Their zone becomes your zone.',
    limitNote: (days: number) => `You can change your captain once every ${days} days.`,
    nextChange: (when: string) => `You can change your captain again on ${when}.`,
    noCaptains: 'There are no other captains in your zone right now. Contact the TRFC team if you need help.',
    save: 'Save captain',
    saving: 'Saving…',
    cancel: 'Cancel',
    savedTitle: 'Captain updated',
    savedBody: (name: string) => `${name} has been told you joined their team.`,
    failed: 'Could not change your captain',
  },
  programs: {
    title: 'MY',
    highlight: 'PROGRAMS',
    subtitle: 'The program you joined and what comes next.',
    current: 'Your program',
    status: { active: 'Joined' },
    joinedOn: (when: string) => `Joined ${when}`,
    viewPage: 'View program page',
    quizHeading: 'From your quiz',
    quizMatch: (name: string) => `The quiz picked ${name} for you.`,
    nextUp: (name: string) => `Next up: ${name}`,
    others: 'Other programs',
    comingSoon: 'Coming soon',
    free: 'Free',
    noneHeading: 'You have not joined a program yet',
    noneBody: 'Couch to 5K is free and opens in your dashboard right away.',
  },
  membersOnly: {
    title: 'COMING WITH',
    highlight: 'MEMBERSHIP',
    body: 'This opens with membership. Watch this space.',
    back: 'Back to dashboard',
  },
  nav: {
    membersTag: 'Members',
    explore: 'Explore',
    browsePrograms: 'Browse Programs',
    freeMember: 'Free member',
    member: 'Member',
    signOut: 'Sign Out',
  },
} as const
