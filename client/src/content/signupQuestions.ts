export interface AnswerOption {
  label: string
  value: string
}

export type ChoiceField = 'hardest_now' | 'goal_3m' | 'time_with_trfc' | 'want_more' | 'exercise_frequency'
export type AnswerField = ChoiceField | 'zone'

export interface SignupAnswers {
  hardest_now: string
  hardest_now_other: string
  goal_3m: string
  time_with_trfc: string
  want_more: string
  exercise_frequency: string
  zone: string
}

export interface ChoiceQuestion {
  field: ChoiceField
  title: string
  options: AnswerOption[]
}

export const EMPTY_ANSWERS: SignupAnswers = {
  hardest_now: '',
  hardest_now_other: '',
  goal_3m: '',
  time_with_trfc: '',
  want_more: '',
  exercise_frequency: '',
  zone: '',
}

export const OTHER_TEXT_MAX = 120
export const ZONE_TITLE = 'Which zone are you in?'

export const SIGNUP_QUESTIONS_COPY = {
  subtitle: 'Takes one minute. The questions in the gold box are optional.',
  title: 'Help us help you',
  line: 'All questions are optional. Skip any you like.',
  choose: 'Choose one',
  otherPlaceholder: 'Type it in',
  skip: 'Skip for now',
  beforeButton: 'Your answers help us plan events and programs. You can change or delete them in settings.',
  button: 'Create my account',
}

const PREFER_NOT = { label: 'Prefer not to say', value: 'prefer_not_to_say' }

/** Order matters: "Other" and "Prefer not to say" always stay last. */
export const CHOICE_QUESTIONS: ChoiceQuestion[] = [
  {
    field: 'hardest_now',
    title: 'What is hardest for you right now?',
    options: [
      { label: 'I start strong, then I stop', value: 'start_then_stop' },
      { label: 'I lose motivation', value: 'low_motivation' },
      { label: 'I do not have time', value: 'no_time' },
      { label: 'I do not know where to start', value: 'not_sure_where_to_start' },
      { label: 'The weight will not move', value: 'weight_stuck' },
      { label: 'I want to run longer or race', value: 'run_longer_race' },
      { label: 'I want to hike more, safely', value: 'hike_safely' },
      { label: 'I am a mother and I want my energy and body back', value: 'mother_energy_body' },
      { label: 'Training alone gets boring', value: 'training_alone_boring' },
      { label: 'Gym and food cost too much', value: 'cost' },
      { label: 'Other (type it in)', value: 'other' },
      PREFER_NOT,
    ],
  },
  {
    field: 'goal_3m',
    title: 'What do you want most in the next 3 months?',
    options: [
      { label: 'Lose weight', value: 'lose_weight' },
      { label: 'Run my first 5K', value: 'first_5k' },
      { label: 'Run a 10K or half marathon', value: 'run_10k_half' },
      { label: 'Hike mountains and waterfalls', value: 'hike' },
      { label: 'Get stronger', value: 'stronger' },
      { label: 'Have more energy', value: 'more_energy' },
      { label: 'Meet people and feel part of a community', value: 'community' },
      { label: 'Other', value: 'other' },
      PREFER_NOT,
    ],
  },
  {
    field: 'time_with_trfc',
    title: 'How long have you been with TRFC?',
    options: [
      { label: 'This is my first time', value: 'first_time' },
      { label: 'Less than 3 months', value: 'lt_3m' },
      { label: '3 to 6 months', value: '3_6m' },
      { label: '6 months to 1 year', value: '6_12m' },
      { label: '1 to 2 years', value: '1_2y' },
      { label: 'More than 2 years', value: 'gt_2y' },
      PREFER_NOT,
    ],
  },
  {
    field: 'want_more',
    title: 'What would you love more of in the new year?',
    options: [
      { label: 'More community runs', value: 'community_runs' },
      { label: 'More zone walks', value: 'zone_walks' },
      { label: 'More hikes and trips', value: 'hikes_trips' },
      { label: 'More coaching and guidance', value: 'coaching' },
      { label: 'Races and challenges', value: 'races_challenges' },
      { label: 'Talks and workshops (for example food and sleep)', value: 'workshops' },
      { label: 'Family and kids events', value: 'family_kids' },
      { label: 'Events in my area', value: 'events_my_area' },
      { label: 'Other', value: 'other' },
      PREFER_NOT,
    ],
  },
  {
    field: 'exercise_frequency',
    title: 'How often do you exercise now?',
    options: [
      { label: 'Not at all', value: 'none' },
      { label: 'Once or twice a week', value: '1_2' },
      { label: '3 or 4 times a week', value: '3_4' },
      { label: '5 or more times a week', value: '5_plus' },
      PREFER_NOT,
    ],
  },
]

export const ZONE_EXTRAS: AnswerOption[] = [
  { label: 'I am not sure', value: 'not_sure' },
  { label: 'Outside these zones', value: 'outside' },
  PREFER_NOT,
]

export function zoneOptions(zones: { name: string; slug: string; stretch?: string | null }[]): AnswerOption[] {
  return [
    ...zones.map((zone) => ({
      label: zone.stretch ? `Team ${zone.name} (${zone.stretch})` : `Team ${zone.name}`,
      value: zone.slug,
    })),
    ...ZONE_EXTRAS,
  ]
}

/** Drops blank answers, and the "Other" text unless "Other" is chosen. */
export function compactAnswers(answers: Partial<SignupAnswers> | undefined): Partial<SignupAnswers> {
  const result: Partial<SignupAnswers> = {}
  if (!answers) return result
  for (const [key, value] of Object.entries(answers) as [keyof SignupAnswers, string | undefined][]) {
    const trimmed = value?.trim()
    if (trimmed) result[key] = trimmed
  }
  if (result.hardest_now !== 'other') delete result.hardest_now_other
  return result
}

export const ANSWERS_PENDING_KEY = 'trfc_answers_pending'

/** Column names used in the admin Reach Out section. */
export const QUESTION_SHORT_TITLES: Record<AnswerField, string> = {
  hardest_now: 'Hardest right now',
  goal_3m: 'Wants most in 3 months',
  time_with_trfc: 'Time with TRFC',
  want_more: 'Wants more of',
  exercise_frequency: 'How often they exercise',
  zone: 'Zone',
}

const LABELS: Record<string, Map<string, string>> = Object.fromEntries([
  ...CHOICE_QUESTIONS.map((q) => [q.field, new Map(q.options.map((o) => [o.value, o.label]))]),
  ['zone', new Map(ZONE_EXTRAS.map((o) => [o.value, o.label]))],
])

/** The member-facing label for a saved value. Blank and "Prefer not to say" show as a dash. */
export function answerLabel(field: AnswerField, value: string | null | undefined): string {
  if (!value || value === 'prefer_not_to_say') return '-'
  return LABELS[field]?.get(value) ?? value
}

export type OutreachStatus = 'not_contacted' | 'contacted' | 'replied' | 'not_interested'

export const OUTREACH_STATUSES: { value: OutreachStatus; label: string }[] = [
  { value: 'not_contacted', label: 'Not contacted' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'replied', label: 'Replied' },
  { value: 'not_interested', label: 'Not interested' },
]

export function outreachStatusLabel(status: string | null | undefined): string {
  return OUTREACH_STATUSES.find((s) => s.value === status)?.label ?? 'Not contacted'
}
