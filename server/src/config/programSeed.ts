import type {
  CheckinQuestion,
  DaySteps,
  ProgramContent,
  ProgramDay,
  ProgramPlanContent,
  ProgramWeekContent,
} from '../types/programContent.js';

export const TO_BE_ADDED = '[To be added]';

const REST_DAY: Omit<ProgramDay, 'day'> = {
  kind: 'rest',
  title: 'Rest day',
  steps: { warmUp: [], coolDown: ['Gentle stretching for 10 minutes if you feel stiff.'] },
};

const COMMUNITY_DAY: Omit<ProgramDay, 'day'> = {
  kind: 'community',
  title: 'Saturday community run',
  steps: {
    warmUp: ['Meet your zone at the start point.', 'Warm up with the group.'],
    mainSet: { label: 'Community run', rounds: 1, work: "Run and walk at this week's pace with the group" },
    coolDown: ['Stretch with the group.'],
  },
};

/** Day 1 is Monday, day 7 is Sunday. */
export function placeholderDays(): ProgramDay[] {
  const session = (day: number): ProgramDay => ({
    day,
    kind: 'run',
    title: '[Session to be added]',
    steps: { warmUp: [TO_BE_ADDED], coolDown: [TO_BE_ADDED] },
  });
  return [
    session(1),
    session(2),
    session(3),
    { day: 4, ...REST_DAY },
    session(5),
    { day: 6, ...COMMUNITY_DAY },
    { day: 7, ...REST_DAY },
  ];
}

export function placeholderWeek(week: number, title = `Week ${week}`): ProgramWeekContent {
  return {
    week,
    title,
    summary: TO_BE_ADDED,
    purpose: TO_BE_ADDED,
    coachNote: TO_BE_ADDED,
    voiceNoteUrl: null,
    tip: TO_BE_ADDED,
    days: placeholderDays(),
  };
}

export const DEFAULT_CHECKIN_QUESTIONS: CheckinQuestion[] = [
  { id: 'feel', label: 'How did this week feel?', type: 'choice', options: ['Easy', 'Just right', 'Hard', 'Too hard'], required: true },
  { id: 'workouts', label: 'How many workouts did you finish?', type: 'choice', options: ['All of them', 'Most of them', 'A few', 'None'], required: true },
  { id: 'saturday', label: 'Did you come to the Saturday community run?', type: 'choice', options: ['Yes', 'No'], required: true },
  { id: 'pain', label: 'Any pain or injury?', type: 'choice', options: ['No', 'A little', 'Yes, it stopped me'], required: true },
  { id: 'note', label: 'Anything you want your captain to know?', type: 'text', required: false },
];

export function defaultPlan(lengthWeeks: number): ProgramPlanContent {
  return {
    howYourWeekWorks: [
      'Each week has a short guide and a few workouts. Tick them off when you finish.',
      'Saturday is the community run. You train with the whole TRFC family.',
      'On Sunday you do a 2-minute check-in. Your captain sees it.',
    ],
    howWeeksOpen: [
      'Week 1 is open now.',
      'The next week opens when you send your Sunday check-in.',
      'Missed a day? That is fine. Do it the next day, or carry on.',
    ],
    graduation: {
      heading: 'Graduation at the community run',
      body: `After Week ${lengthWeeks} you graduate at the next community run, with the whole community cheering you on.`,
    },
    checkinQuestions: DEFAULT_CHECKIN_QUESTIONS,
  };
}

/** Starting content for a program an admin creates from scratch. */
export function blankProgramContent(name: string, lengthWeeks = 4): ProgramContent {
  return {
    page: {
      title: name,
      tagline: '',
      price: 0,
      memberPrice: 0,
      startsLabel: 'Soon',
      startsOn: null,
      chips: [`${lengthWeeks} weeks`],
      heroNote: '',
      forYou: [],
      whatYouGet: [],
      howItWorks: [],
      coachLine: '',
      story: '',
      faqs: [],
      join: { heading: '', body: '', footnote: '' },
      cta: 'Make my free account and start',
      barCta: 'Start free',
      heroImage: null,
    },
    card: { tag: '', blurb: '', button: 'Learn more', category: '', image: null },
    plan: defaultPlan(lengthWeeks),
    weeks: Array.from({ length: lengthWeeks }, (_, i) => placeholderWeek(i + 1)),
  };
}

const WEEK_1_JOG: DaySteps = {
  warmUp: ['Walk briskly for 5 minutes.', 'Swing your arms and roll your shoulders.'],
  mainSet: { label: 'Jog and walk', rounds: 8, work: 'Jog slowly for 1 minute', rest: 'Walk for 90 seconds' },
  coolDown: ['Walk for 5 minutes.', 'Stretch your calves, thighs and hips.'],
  durationMinutes: 30,
};

export const COUCH_TO_5K_PLAN: ProgramPlanContent = {
  howYourWeekWorks: [
    'You train 5 days and rest 2 days each week.',
    'Saturday is the community run. You run with the whole TRFC family.',
    'Each workout takes about 30 minutes. Tick it off when you finish.',
    'On Sunday you do a 2-minute check-in. Your captain sees it.',
  ],
  howWeeksOpen: [
    'Week 1 is open now.',
    'The next week opens when you send your Sunday check-in.',
    'Missed a day? That is fine. Do it the next day, or carry on.',
  ],
  graduation: {
    heading: 'Graduation at the community run',
    body: 'After Week 8 you graduate at the next community run, on the 2nd Saturday of the month. You run your first 5K with the whole community cheering you on.',
  },
  checkinQuestions: DEFAULT_CHECKIN_QUESTIONS,
};

export const COUCH_TO_5K_WEEKS: ProgramWeekContent[] = [
  {
    week: 1,
    title: "Let's start",
    summary: 'Get used to jogging.',
    purpose:
      'This week is about showing up. You jog for 1 minute, then walk. Your body learns that running is normal. Nobody is timing you.',
    coachNote: 'Go slow. Slower than you think. If you can talk while you jog, you are at the right pace.',
    voiceNoteUrl: null,
    tip: 'Wear shoes you can move in. You do not need new ones yet. Drink water before and after each workout.',
    days: [
      { day: 1, kind: 'run', title: 'Your first jog', steps: WEEK_1_JOG },
      {
        day: 2,
        kind: 'run',
        title: 'Easy walk',
        steps: {
          warmUp: ['Walk slowly for 3 minutes.'],
          mainSet: { label: 'Brisk walk', rounds: 1, work: 'Walk briskly for 20 minutes' },
          coolDown: ['Walk slowly for 3 minutes.', 'Stretch your calves and thighs.'],
          durationMinutes: 26,
        },
      },
      { day: 3, kind: 'run', title: 'Jog again', steps: WEEK_1_JOG },
      { day: 4, ...REST_DAY },
      { day: 5, kind: 'run', title: 'Last jog of the week', steps: WEEK_1_JOG },
      { day: 6, ...COMMUNITY_DAY },
      { day: 7, ...REST_DAY },
    ],
  },
  placeholderWeek(2, 'Find your rhythm'),
  placeholderWeek(3, 'Run a little longer'),
  placeholderWeek(4, 'You are a runner now'),
  placeholderWeek(5, 'Your first 20 minutes'),
  placeholderWeek(6, 'Build your endurance'),
  placeholderWeek(7, 'Get ready for 5K'),
  placeholderWeek(8, 'Graduation week'),
];
