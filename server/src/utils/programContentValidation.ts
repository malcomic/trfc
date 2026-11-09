import { TO_BE_ADDED } from '../config/programSeed.js';
import {
  DAY_KINDS,
  QUESTION_TYPES,
  type CheckinQuestion,
  type DayKind,
  type DaySteps,
  type ProgramCardContent,
  type ProgramContent,
  type ProgramDay,
  type ProgramPageContent,
  type ProgramPlanContent,
  type ProgramWeekContent,
  type QuestionType,
} from '../types/programContent.js';

export const MAX_WEEKS = 52;
export const MAX_QUESTIONS = 12;
const MAX_OPTIONS = 10;
const MAX_LIST = 30;
const SHORT = 200;
const LONG = 2000;
const STORY = 6000;
const MAX_PRICE = 1_000_000;

export type Clean<T> = { ok: true; value: T } | { ok: false; error: string };

class InvalidContent extends Error {}

function fail(path: string, message: string): never {
  throw new InvalidContent(path ? `${path}: ${message}` : message);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function obj(v: unknown, path: string): Record<string, unknown> {
  if (!isObject(v)) fail(path, 'must be an object');
  return v;
}

function text(v: unknown, path: string, max = LONG): string {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'string') fail(path, 'must be text');
  const value = v.trim();
  if (value.length > max) fail(path, `must be ${max} characters or fewer`);
  return value;
}

function optionalText(v: unknown, path: string, max = LONG): string | undefined {
  const value = text(v, path, max);
  return value ? value : undefined;
}

function list<T>(v: unknown, path: string, item: (x: unknown, p: string) => T, max = MAX_LIST): T[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) fail(path, 'must be a list');
  if (v.length > max) fail(path, `can have at most ${max} items`);
  return v.map((x, i) => item(x, `${path}[${i}]`));
}

function textList(v: unknown, path: string, max = LONG): string[] {
  return list(v, path, (x, p) => text(x, p, max)).filter(Boolean);
}

function int(v: unknown, path: string, min: number, max: number): number {
  const n = typeof v === 'string' && /^\d+$/.test(v.trim()) ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < min || n > max) {
    fail(path, `must be a whole number from ${min} to ${max}`);
  }
  return n;
}

function url(v: unknown, path: string): string | null {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string' || v.length > 1000 || !/^https:\/\/[^\s]+$/.test(v.trim())) {
    fail(path, 'must be an https link');
  }
  return v.trim();
}

function isoDate(v: unknown, path: string): string | null {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) {
    fail(path, 'must be a date like 2026-12-05');
  }
  return v;
}

function wrap<T>(fn: () => T): Clean<T> {
  try {
    return { ok: true, value: fn() };
  } catch (error) {
    if (error instanceof InvalidContent) return { ok: false, error: error.message };
    throw error;
  }
}

function readPage(v: unknown): ProgramPageContent {
  const p = obj(v, 'page');
  return {
    title: text(p.title, 'page.title', SHORT),
    tagline: text(p.tagline, 'page.tagline', SHORT),
    price: int(p.price ?? 0, 'page.price', 0, MAX_PRICE),
    memberPrice: int(p.memberPrice ?? 0, 'page.memberPrice', 0, MAX_PRICE),
    startsLabel: text(p.startsLabel, 'page.startsLabel', SHORT),
    startsOn: isoDate(p.startsOn, 'page.startsOn'),
    chips: textList(p.chips, 'page.chips', 60),
    heroNote: text(p.heroNote, 'page.heroNote'),
    memberNote: optionalText(p.memberNote, 'page.memberNote'),
    forYou: textList(p.forYou, 'page.forYou'),
    forYouNote: optionalText(p.forYouNote, 'page.forYouNote'),
    whatYouGet: list(p.whatYouGet, 'page.whatYouGet', (x, path) => {
      const o = obj(x, path);
      return { lead: text(o.lead, `${path}.lead`, SHORT), rest: text(o.rest, `${path}.rest`) };
    }).filter((x) => x.lead || x.rest),
    howItWorks: list(p.howItWorks, 'page.howItWorks', (x, path) => {
      const o = obj(x, path);
      return {
        label: text(o.label, `${path}.label`, 60),
        title: text(o.title, `${path}.title`, SHORT),
        body: text(o.body, `${path}.body`),
      };
    }).filter((x) => x.title || x.body),
    outline: optionalText(p.outline, 'page.outline'),
    coachLine: text(p.coachLine, 'page.coachLine'),
    story: text(p.story, 'page.story', STORY),
    faqs: list(p.faqs, 'page.faqs', (x, path) => {
      const o = obj(x, path);
      return { q: text(o.q, `${path}.q`, SHORT), a: text(o.a, `${path}.a`) };
    }).filter((x) => x.q || x.a),
    join: (() => {
      const j = isObject(p.join) ? p.join : {};
      return {
        heading: text(j.heading, 'page.join.heading', SHORT),
        body: text(j.body, 'page.join.body'),
        footnote: text(j.footnote, 'page.join.footnote'),
      };
    })(),
    cta: text(p.cta, 'page.cta', 60),
    barCta: text(p.barCta, 'page.barCta', 60),
    shareNote: optionalText(p.shareNote, 'page.shareNote'),
    heroImage: url(p.heroImage, 'page.heroImage'),
  };
}

function readCard(v: unknown): ProgramCardContent {
  const c = obj(v, 'card');
  return {
    tag: text(c.tag, 'card.tag', 60),
    blurb: text(c.blurb, 'card.blurb', 400),
    button: text(c.button, 'card.button', 60),
    category: text(c.category, 'card.category', 30),
    photoLabel: optionalText(c.photoLabel, 'card.photoLabel', 60),
    image: url(c.image, 'card.image'),
  };
}

function readQuestion(v: unknown, path: string): CheckinQuestion {
  const q = obj(v, path);
  const id = text(q.id, `${path}.id`, 30);
  if (!/^[a-z][a-z0-9_]*$/.test(id)) fail(`${path}.id`, 'must start with a letter and use only a-z, 0-9 and _');
  const type = q.type as QuestionType;
  if (!QUESTION_TYPES.includes(type)) fail(`${path}.type`, `must be one of ${QUESTION_TYPES.join(', ')}`);
  const options = type === 'text' ? undefined : textList(q.options, `${path}.options`, 80).slice(0, MAX_OPTIONS);
  if (options && new Set(options).size !== options.length) fail(`${path}.options`, 'has the same answer twice');
  return {
    id,
    label: text(q.label, `${path}.label`, SHORT),
    type,
    ...(options ? { options } : {}),
    required: q.required === true,
  };
}

function readPlan(v: unknown): ProgramPlanContent {
  const p = obj(v, 'plan');
  const g = isObject(p.graduation) ? p.graduation : {};
  const checkinQuestions = list(p.checkinQuestions, 'plan.checkinQuestions', readQuestion, MAX_QUESTIONS);
  const ids = checkinQuestions.map((q) => q.id);
  if (new Set(ids).size !== ids.length) fail('plan.checkinQuestions', 'two questions have the same id');
  return {
    howYourWeekWorks: textList(p.howYourWeekWorks, 'plan.howYourWeekWorks'),
    howWeeksOpen: textList(p.howWeeksOpen, 'plan.howWeeksOpen'),
    graduation: {
      heading: text(g.heading, 'plan.graduation.heading', SHORT),
      body: text(g.body, 'plan.graduation.body'),
    },
    checkinQuestions,
  };
}

function readSteps(v: unknown, path: string): DaySteps {
  const s = isObject(v) ? v : {};
  const steps: DaySteps = {
    warmUp: textList(s.warmUp, `${path}.warmUp`),
    coolDown: textList(s.coolDown, `${path}.coolDown`),
  };
  if (isObject(s.mainSet)) {
    const m = s.mainSet;
    const work = text(m.work, `${path}.mainSet.work`, SHORT);
    if (work) {
      const rest = optionalText(m.rest, `${path}.mainSet.rest`, SHORT);
      steps.mainSet = {
        label: text(m.label, `${path}.mainSet.label`, 80),
        rounds: int(m.rounds ?? 1, `${path}.mainSet.rounds`, 1, 100),
        work,
        ...(rest ? { rest } : {}),
      };
    }
  }
  if (s.durationMinutes !== undefined && s.durationMinutes !== null && s.durationMinutes !== '') {
    steps.durationMinutes = int(s.durationMinutes, `${path}.durationMinutes`, 1, 600);
  }
  return steps;
}

function readDay(v: unknown, path: string): ProgramDay {
  const d = obj(v, path);
  const kind = d.kind as DayKind;
  if (!DAY_KINDS.includes(kind)) fail(`${path}.kind`, `must be one of ${DAY_KINDS.join(', ')}`);
  return {
    day: int(d.day, `${path}.day`, 1, 7),
    kind,
    title: text(d.title, `${path}.title`, 120),
    steps: readSteps(d.steps, `${path}.steps`),
  };
}

function readWeek(v: unknown, path: string, weekNumber?: number): ProgramWeekContent {
  const w = obj(v, path);
  const days = list(w.days, `${path}.days`, readDay, 7);
  const dayNumbers = days.map((d) => d.day).sort();
  if (days.length !== 7 || dayNumbers.some((n, i) => n !== i + 1)) {
    fail(`${path}.days`, 'must have one entry for each day, Monday to Sunday');
  }
  return {
    week: weekNumber ?? int(w.week, `${path}.week`, 1, MAX_WEEKS),
    title: text(w.title, `${path}.title`, 120),
    summary: text(w.summary, `${path}.summary`, 400),
    purpose: text(w.purpose, `${path}.purpose`),
    coachNote: text(w.coachNote, `${path}.coachNote`),
    voiceNoteUrl: url(w.voiceNoteUrl, `${path}.voiceNoteUrl`),
    tip: text(w.tip, `${path}.tip`),
    days: [...days].sort((a, b) => a.day - b.day),
  };
}

export const cleanPage = (v: unknown) => wrap(() => readPage(v));
export const cleanCard = (v: unknown) => wrap(() => readCard(v));
export const cleanPlan = (v: unknown) => wrap(() => readPlan(v));
export const cleanWeek = (v: unknown, weekNumber: number) => wrap(() => readWeek(v, `weeks[${weekNumber - 1}]`, weekNumber));

/** Weeks are renumbered 1..N in order, so a removed week never leaves a gap. */
export function cleanContent(v: unknown): Clean<ProgramContent> {
  return wrap(() => {
    const c = obj(v, '');
    const weeks = list(c.weeks, 'weeks', (x, p) => obj(x, p), MAX_WEEKS).map((w, i) =>
      readWeek(w, `weeks[${i}]`, i + 1)
    );
    const content: ProgramContent = {
      page: readPage(c.page),
      card: readCard(c.card),
      plan: readPlan(c.plan),
      weeks,
    };
    if (isObject(c.quiz)) {
      content.quiz = {
        goals: textList(c.quiz.goals, 'quiz.goals', 30),
        experience: textList(c.quiz.experience, 'quiz.experience', 30),
      };
    }
    return content;
  });
}

export interface PublishIssue {
  where: string;
  message: string;
}

export interface PublishCheck {
  errors: PublishIssue[];
  warnings: PublishIssue[];
}

const hasPlaceholder = (s: string | undefined) => !!s && s.includes(TO_BE_ADDED.slice(1, -1));

/** Errors block publishing. Warnings (unfinished weeks, missing images) only need confirming. */
export function checkForPublish(content: ProgramContent): PublishCheck {
  const errors: PublishIssue[] = [];
  const warnings: PublishIssue[] = [];
  const { page, card, plan, weeks } = content;

  if (!page.title) errors.push({ where: 'Public page', message: 'Add a title' });
  if (!page.tagline) errors.push({ where: 'Public page', message: 'Add a tagline' });
  if (!page.cta) errors.push({ where: 'Public page', message: 'Add the join button text' });
  if (page.price > 0 && page.memberPrice > page.price) {
    errors.push({ where: 'Public page', message: 'The member price is higher than the full price' });
  }
  if (!card.blurb) errors.push({ where: 'Browse card', message: 'Add a short description' });
  if (!card.button) errors.push({ where: 'Browse card', message: 'Add the button text' });
  if (weeks.length === 0) errors.push({ where: 'Weekly plan', message: 'Add at least one week' });
  if (plan.checkinQuestions.length === 0) {
    errors.push({ where: 'Check-in questions', message: 'Add at least one question' });
  }
  plan.checkinQuestions.forEach((q, i) => {
    const where = `Check-in question ${i + 1}`;
    if (!q.label) errors.push({ where, message: 'Add the question text' });
    if (q.type !== 'text' && (q.options?.length ?? 0) < 2) {
      errors.push({ where, message: 'Add at least two answers to pick from' });
    }
  });

  weeks.forEach((w) => {
    const where = `Week ${w.week}`;
    if (!w.title) errors.push({ where, message: 'Add a title' });
    w.days.forEach((d) => {
      if (!d.title) errors.push({ where: `${where}, day ${d.day}`, message: 'Add a title' });
    });
    const unfinished =
      [w.summary, w.purpose, w.coachNote, w.tip, ...w.days.map((d) => d.title)].some(hasPlaceholder) ||
      w.days.some((d) => [...d.steps.warmUp, ...d.steps.coolDown].some(hasPlaceholder));
    if (unfinished) warnings.push({ where, message: 'Still has "[To be added]" text' });
  });

  if (!page.heroImage) warnings.push({ where: 'Public page', message: 'No hero image yet' });
  if (!card.image) warnings.push({ where: 'Browse card', message: 'No card image yet' });
  if (!card.category) {
    warnings.push({ where: 'Browse card', message: 'No category, so it only shows under All in Browse' });
  }
  return { errors, warnings };
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

export function idFromSlug(slug: string): string {
  return slug.replace(/-/g, '_').slice(0, 40);
}
