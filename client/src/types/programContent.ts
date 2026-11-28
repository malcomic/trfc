/** Mirrors server/src/types/programContent.ts. */
export const DAY_KINDS = ['run', 'strength', 'rest', 'community'] as const
export type DayKind = (typeof DAY_KINDS)[number]

export const QUESTION_TYPES = ['choice', 'scale', 'text'] as const
export type QuestionType = (typeof QUESTION_TYPES)[number]

export interface DaySteps {
  warmUp: string[]
  mainSet?: { label: string; rounds: number; work: string; rest?: string }
  coolDown: string[]
  durationMinutes?: number
}

export interface CheckinQuestion {
  id: string
  label: string
  type: QuestionType
  options?: string[]
  required: boolean
}

export interface ProgramDay {
  day: number
  kind: DayKind
  title: string
  steps: DaySteps
}

export interface ProgramWeekContent {
  week: number
  title: string
  summary: string
  purpose: string
  coachNote: string
  voiceNoteUrl: string | null
  tip: string
  days: ProgramDay[]
}

export interface ProgramPageContent {
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
  faqs: { q: string; a: string }[]
  join: { heading: string; body: string; footnote: string }
  cta: string
  barCta: string
  shareNote?: string
  heroImage?: string | null
}

export interface ProgramCardContent {
  tag: string
  blurb: string
  button: string
  category: string
  photoLabel?: string
  image?: string | null
}

export interface ProgramPlanContent {
  howYourWeekWorks: string[]
  howWeeksOpen: string[]
  graduation: { heading: string; body: string }
  checkinQuestions: CheckinQuestion[]
}

export const FINDER_GOALS = [
  'lose_fat',
  'build_muscle',
  'get_stronger',
  'start_running',
  'longer_race',
  'hike',
] as const
export type FinderGoal = (typeof FINDER_GOALS)[number]

export const FINDER_SEXES = ['women', 'men', 'any'] as const
export type FinderSex = (typeof FINDER_SEXES)[number]

export const FINDER_LEVELS = ['beginner', 'intermediate', 'advanced'] as const
export type FinderLevel = (typeof FINDER_LEVELS)[number]

export const FINDER_RACE_DISTANCES = ['10k', '15k', '21k', '42k'] as const
export type FinderRaceDistance = (typeof FINDER_RACE_DISTANCES)[number]

export const FINDER_HIKE_TARGETS = ['day_hikes', 'satima', 'kenya', 'unsure'] as const
export type FinderHikeTarget = (typeof FINDER_HIKE_TARGETS)[number]

export const FINDER_TRAIN_WHERE = ['home', 'gym', 'outside', 'mix'] as const
export type FinderTrainWhere = (typeof FINDER_TRAIN_WHERE)[number]

/** Admin-chosen tags used by the Program Finder matcher. */
export interface ProgramQuizMatching {
  goals: FinderGoal[]
  sex: FinderSex
  levels?: FinderLevel[]
  raceDistances?: FinderRaceDistance[]
  hikeTargets?: FinderHikeTarget[]
  trainWhere?: FinderTrainWhere[]
  eliteOffer?: boolean
  priority?: number
}

export interface ProgramContent {
  page: ProgramPageContent
  card: ProgramCardContent
  plan: ProgramPlanContent
  weeks: ProgramWeekContent[]
  quiz?: ProgramQuizMatching
}
