export const DAY_KINDS = ['run', 'strength', 'rest', 'community'] as const;
export type DayKind = (typeof DAY_KINDS)[number];

export const QUESTION_TYPES = ['choice', 'scale', 'text'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export interface DaySteps {
  warmUp: string[];
  mainSet?: { label: string; rounds: number; work: string; rest?: string };
  coolDown: string[];
  durationMinutes?: number;
}

export interface CheckinQuestion {
  id: string;
  label: string;
  type: QuestionType;
  options?: string[];
  required: boolean;
}

export interface ProgramDay {
  day: number;
  kind: DayKind;
  title: string;
  steps: DaySteps;
}

export interface ProgramWeekContent {
  week: number;
  title: string;
  summary: string;
  purpose: string;
  coachNote: string;
  voiceNoteUrl: string | null;
  tip: string;
  /** Always 7 days, Monday first. */
  days: ProgramDay[];
}

export interface ProgramPageContent {
  title: string;
  tagline: string;
  price: number;
  memberPrice: number;
  startsLabel: string;
  startsOn: string | null;
  chips: string[];
  heroNote: string;
  memberNote?: string;
  forYou: string[];
  forYouNote?: string;
  whatYouGet: { lead: string; rest: string }[];
  howItWorks: { label: string; title: string; body: string }[];
  outline?: string;
  coachLine: string;
  story: string;
  faqs: { q: string; a: string }[];
  join: { heading: string; body: string; footnote: string };
  cta: string;
  barCta: string;
  shareNote?: string;
  heroImage?: string | null;
}

export interface ProgramCardContent {
  tag: string;
  blurb: string;
  button: string;
  /** Browse filter label, for example "Hiking". Empty means the program only shows under All (and Free when free). */
  category: string;
  photoLabel?: string;
  image?: string | null;
}

export interface ProgramPlanContent {
  howYourWeekWorks: string[];
  howWeeksOpen: string[];
  graduation: { heading: string; body: string };
  checkinQuestions: CheckinQuestion[];
}

export interface ProgramContent {
  page: ProgramPageContent;
  card: ProgramCardContent;
  plan: ProgramPlanContent;
  weeks: ProgramWeekContent[];
  /** Reserved for admin-chosen quiz matching; nothing reads it yet. */
  quiz?: { goals?: string[]; experience?: string[] };
}
