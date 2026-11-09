import type { CheckinQuestion, DayKind } from '../api/programs'

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

/** Day 1 is Monday. */
export function dayName(day: number): string {
  return DAY_NAMES[day - 1] ?? `Day ${day}`
}

export type WeekStatus = 'done' | 'open' | 'locked'

export function weekStatus(week: { locked: boolean; checkedIn: boolean }): WeekStatus {
  if (week.checkedIn) return 'done'
  return week.locked ? 'locked' : 'open'
}

/** How far through the program the member is, counting finished weeks. */
export function programPercent(checkedInWeeks: number, totalWeeks: number): number {
  if (totalWeeks <= 0) return 0
  return Math.min(100, Math.round((Math.max(0, checkedInWeeks) / totalWeeks) * 100))
}

/** The first required question that has no answer yet, or null when the form can be sent. */
export function firstMissingAnswer(questions: CheckinQuestion[], answers: Record<string, string>): CheckinQuestion | null {
  return questions.find((q) => q.required && !(answers[q.id] ?? '').trim()) ?? null
}

/** Splits a heading so its last word can be highlighted, the way other dashboard page titles look. */
export function splitHeading(text: string): { title: string; highlight?: string } {
  const words = text.trim().toUpperCase().split(/\s+/).filter(Boolean)
  if (words.length < 2) return { title: words[0] ?? '' }
  return { title: words.slice(0, -1).join(' '), highlight: words[words.length - 1] }
}

/** Rest days need no session page; every other day opens one. */
export function hasSessionPage(kind: DayKind): boolean {
  return kind !== 'rest'
}

export const PROGRAM_COPY = {
  back: {
    dashboard: 'Back to dashboard',
    program: 'Back to my program',
    week: (n: number) => `Back to Week ${n}`,
  },
  loadFailed: 'Could not load your program. Check your connection and try again.',
  retry: 'Try again',
  notEnrolled: {
    heading: 'You have not joined this program',
    body: 'Join from the program page, and it opens here right away.',
    button: 'See the program',
  },
  home: {
    title: 'MY',
    weekOf: (week: number, total: number) => `Week ${week} of ${total}`,
    graduatedLine: 'All weeks done. See you at graduation.',
    openWeek: (n: number) => `Open Week ${n}`,
    howYourWeekWorks: 'How your week works',
    howWeeksOpen: 'How the weeks open',
    yourWeeks: (total: number) => `Your ${total} weeks`,
    weekLabel: (n: number) => `Week ${n}`,
    status: { done: 'DONE', open: 'OPEN', locked: 'LOCKED' } as Record<WeekStatus, string>,
    graduation: 'Graduation',
    captainHeading: 'Your captain is with you',
    captainBody: (name: string) => `${name} checks on you every week. Message them any time.`,
    noCaptainBody: 'Pick your captain in My Zone. They check on you every week.',
    messageCaptain: 'Message my captain',
    pickCaptain: 'Choose my captain',
  },
  week: {
    title: (n: number) => `WEEK ${n}`,
    playVoiceNote: 'Play voice note',
    why: 'Why this week matters',
    coachNote: 'From Coach Maurice',
    yourDays: 'Your 7 days',
    done: 'Done',
    markDone: (title: string) => `Mark ${title} as done`,
    openSession: 'Open',
    seeCalendar: 'See the calendar',
    tip: 'Tip of the week',
    finish: (n: number) => `Finish Week ${n}`,
    finishBody: 'Sunday is check-in day. It takes 2 minutes and opens next week.',
    unticked: (n: number) => `${n} day${n === 1 ? '' : 's'} not ticked yet. That is fine. Send your check-in anyway.`,
    checkin: 'Do my Sunday check-in',
    checkedIn: 'Check-in sent. Well done.',
    nextWeek: (n: number) => `Go to Week ${n}`,
    locked: 'This week opens after your Sunday check-in.',
  },
  session: {
    minutes: (n: number) => `About ${n} minutes`,
    warmUp: 'Warm up',
    mainSet: 'Main set',
    coolDown: 'Cool down',
    round: (n: number) => `Round ${n}`,
    rest: (text: string) => `Then: ${text}`,
    restDay: 'Rest today. Your body gets stronger while you rest.',
    communityNote: 'Find the details of this Saturday\'s run in the calendar.',
    done: 'Done',
    doneAlready: 'Done. Nice work.',
    undo: 'Mark as not done',
    saved: 'Workout saved',
    saveFailed: 'Could not save. Check your connection.',
  },
  timer: {
    start: 'Start timer',
    pause: 'Pause',
    resume: 'Resume',
    reset: 'Reset',
  },
  checkin: {
    title: 'SUNDAY',
    highlight: 'CHECK-IN',
    heading: 'Your 2-minute check-in',
    body: (n: number) => `Tell us how Week ${n} went. Your captain sees your answers.`,
    optional: 'Optional',
    send: 'Send my check-in',
    sending: 'Sending…',
    missing: (label: string) => `Please answer: ${label}`,
    failed: 'Could not send your check-in',
    alreadyDone: 'You already sent this check-in.',
    successHeading: (n: number, next: number) => `Week ${n} done. Week ${next} is open.`,
    goToWeek: (n: number) => `Go to Week ${n}`,
    graduatedHeading: 'You finished all the weeks.',
    graduatedBody: 'Graduation is at the next community run. Your captain will tell you the date.',
    backHome: 'Back to my program',
    notThisWeek: 'This check-in is not open yet. Finish your current week first.',
  },
} as const
