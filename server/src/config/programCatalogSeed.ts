import type { ProgramContent } from '../types/programContent.js';
import { COUCH_TO_5K_PLAN, COUCH_TO_5K_WEEKS, defaultPlan, placeholderWeek } from './programSeed.js';

export interface CatalogSeedProgram {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  content: ProgramContent;
}

const PAID_CTA = 'Make my free account, then join';

function paidWeeklyItems(recovery: string) {
  return [
    { lead: 'A weekly guide', rest: ' with your tasks for the week.' },
    { lead: 'A weekly tracking sheet', rest: ' that you fill in.' },
    { lead: 'Recovery nutrition and stretches', rest: recovery },
    { lead: 'A captain', rest: ' who checks on you every week.' },
  ];
}

const placeholderWeeks = (n: number) => Array.from({ length: n }, (_, i) => placeholderWeek(i + 1));

/** The four programs that existed in code before the admin builder, copied as their first published version. */
export const CORE_PROGRAMS: CatalogSeedProgram[] = [
  {
    id: 'foundations',
    slug: 'couch-to-5k',
    name: 'Couch to 5K',
    sortOrder: 1,
    content: {
      page: {
        title: 'Never Run Before? Finish Your First 5K in 8 Weeks: The Couch to 5K Challenge',
        tagline:
          'You train 5 days and rest 2 days each week. On Saturday you run with the whole community. By Week 8, you run 5K.',
        price: 0,
        memberPrice: 0,
        startsLabel: 'January 2027',
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
        outline: 'Week by week outline: Coach Maurice to add what happens in Weeks 1 to 8',
        shareNote:
          'Already run a lot? Share this program with a family member or a friend. We want as many people as we can running.',
        coachLine:
          'I have also picked plans that were too big for me, and I have also quit. That is why this program starts small.',
        story:
          'She could barely jog for one minute when she first came to a Saturday run. X weeks later, she finished a first 5K.',
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
        heroImage: null,
      },
      card: {
        tag: 'Free',
        blurb: 'Train 5 days, rest 2, and run with the community on Saturday. By Week 8, you run 5K.',
        button: 'Start free',
        category: '',
        photoLabel: 'Saturday community run',
        image: null,
      },
      plan: COUCH_TO_5K_PLAN,
      weeks: COUCH_TO_5K_WEEKS,
    },
  },
  {
    id: 'fat_loss',
    slug: 'fat-loss',
    name: 'Fat Loss & Fitness',
    sortOrder: 2,
    content: {
      page: {
        title: 'Clothes Not Fitting Anymore? Busy Adults, Fit Back in Your Clothes in 12 Weeks Transformation',
        tagline:
          'A 12-week plan for people with a full schedule. You follow one clear step each week, and your captain checks on you.',
        price: 3497,
        memberPrice: 2972,
        startsLabel: 'January 2027',
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
        outline: 'Week by week outline: Coach Maurice to add what happens in Weeks 1 to 12',
        coachLine:
          'I have picked plans that were too big for me, and I have quit. That is why I match this program to where you are today.',
        story: 'clothes fit again after X weeks',
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
        heroImage: null,
      },
      card: {
        tag: 'Fat Loss',
        blurb: 'A 12-week plan for people with a full schedule. One clear step each week, and a captain who checks on you.',
        button: 'Learn more',
        category: 'Fat Loss',
        photoLabel: 'Group workout',
        image: null,
      },
      plan: defaultPlan(12),
      weeks: placeholderWeeks(12),
    },
  },
  {
    id: 'endurance',
    slug: 'endurance',
    name: 'Endurance & Race Prep',
    sortOrder: 3,
    content: {
      page: {
        title: 'Finished a 5K? Now Run Your First 10K in 10 Weeks Program',
        tagline:
          'You can already run 5K. Now you go further, one step at a time, with a captain and the whole community beside you.',
        price: 1697,
        memberPrice: 1445,
        startsLabel: 'January 2027',
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
        outline: 'Week by week outline: Coach Maurice to add what happens in Weeks 1 to 10',
        coachLine:
          'I have picked plans that were too big for me, and I have quit. That is why this program adds distance slowly.',
        story: 'first 10K after X weeks',
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
        heroImage: null,
      },
      card: {
        tag: 'Endurance',
        blurb: 'You can already run 5K. Now you go further, one step at a time, ready for your first race.',
        button: 'Learn more',
        category: 'Endurance',
        photoLabel: 'Runners on Thika Road',
        image: null,
      },
      plan: defaultPlan(10),
      weeks: placeholderWeeks(10),
    },
  },
  {
    id: 'hiking',
    slug: 'hiking',
    name: 'Hiking',
    sortOrder: 4,
    content: {
      page: {
        title: 'Never Hiked Before? Climb Your First Peak with Confidence in 6 Weeks Challenge',
        tagline:
          'Get your legs, your lungs and your confidence ready. You train with your captain and the community, then you climb.',
        price: 997,
        memberPrice: 847,
        startsLabel: 'January 2027',
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
        outline: 'Week by week outline and which hikes are in this program: Coach Maurice to add',
        coachLine:
          'I have picked plans that were too big for me, and I have quit. That is why this program starts where you are.',
        story: 'first peak climbed after X weeks',
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
        heroImage: null,
      },
      card: {
        tag: 'Hiking',
        blurb: 'Get your legs, lungs and confidence ready. You train with your captain, then you climb with us.',
        button: 'Learn more',
        category: 'Hiking',
        photoLabel: 'Hike day',
        image: null,
      },
      plan: defaultPlan(6),
      weeks: placeholderWeeks(6),
    },
  },
];

const lit = (value: string) => `'${value.replace(/'/g, "''")}'`;

/**
 * Creates the core programs and their first published version once.
 * For Couch to 5K, plan and weeks already saved in the older program_plans tables are carried over.
 */
export function buildCatalogSeedSql(programs: CatalogSeedProgram[] = CORE_PROGRAMS): string {
  return programs
    .map((p) => {
      const content = lit(JSON.stringify(p.content));
      const id = lit(p.id);
      return `
      INSERT INTO programs (id, slug, name, status, is_core, sort_order)
      VALUES (${id}, ${lit(p.slug)}, ${lit(p.name)}, 'published', true, ${p.sortOrder})
      ON CONFLICT (id) DO NOTHING;

      DO $seed$
      DECLARE c JSONB := ${content}::jsonb;
      BEGIN
        IF EXISTS (SELECT 1 FROM program_versions WHERE program_id = ${id}) THEN
          RETURN;
        END IF;
        -- Nested IFs: Postgres resolves every table in one expression up front, so the
        -- existence check cannot share an expression with a query on program_plans.
        IF to_regclass('public.program_plans') IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM program_plans WHERE program = ${id}) THEN
          SELECT c || jsonb_build_object('plan', jsonb_build_object(
                   'howYourWeekWorks', how_your_week_works,
                   'howWeeksOpen', how_weeks_open,
                   'graduation', graduation,
                   'checkinQuestions', checkin_questions))
            INTO c FROM program_plans WHERE program = ${id};
          SELECT c || jsonb_build_object('weeks', COALESCE(jsonb_agg(jsonb_build_object(
                   'week', w.week_number, 'title', w.title, 'summary', w.summary, 'purpose', w.purpose,
                   'coachNote', w.coach_note, 'voiceNoteUrl', w.voice_note_url, 'tip', w.tip,
                   'days', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                              'day', d.day_number, 'kind', d.kind, 'title', d.title, 'steps', d.steps)
                            ORDER BY d.day_number), '[]'::jsonb)
                            FROM program_days d
                            WHERE d.program = w.program AND d.week_number = w.week_number)
                 ) ORDER BY w.week_number), c->'weeks'))
            INTO c FROM program_weeks w WHERE w.program = ${id};
        END IF;
        END IF;
        INSERT INTO program_versions (program_id, state, content, published_at)
        VALUES (${id}, 'published', c, NOW());
      END $seed$;`;
    })
    .join('\n');
}
