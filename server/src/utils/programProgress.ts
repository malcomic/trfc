import { query } from '../config/db.js';
import type { CheckinQuestion } from '../types/programContent.js';
import { getPublishedContent } from './programCatalog.js';

export interface CompletedDay {
  week: number;
  day: number;
  rounds_done: number;
  done: boolean;
}

export interface ProgramProgress {
  currentWeek: number;
  totalWeeks: number;
  completed: CompletedDay[];
  checkedInWeeks: number[];
  graduated: boolean;
}

const MAX_TEXT_ANSWER = 1000;

/** Week N + 1 opens when week N's check-in is sent. */
export function currentWeekFrom(checkinCount: number, totalWeeks: number): number {
  if (totalWeeks <= 0) return 1;
  return Math.min(totalWeeks, Math.max(0, checkinCount) + 1);
}

export function isWeekOpen(week: number, currentWeek: number): boolean {
  return Number.isInteger(week) && week >= 1 && week <= currentWeek;
}

export function parsePositiveInt(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function requireEnrollment(userId: string, program: string): Promise<boolean> {
  const result = await query(
    `SELECT 1 FROM program_enrollments WHERE user_id = $1 AND program = $2 AND status = 'active'`,
    [userId, program]
  );
  return result.rows.length > 0;
}

export async function getTotalWeeks(program: string): Promise<number> {
  const content = await getPublishedContent(program);
  return content?.weeks?.length ?? 0;
}

/** Pass totalWeeks when the caller already has the published content, to skip a lookup. */
export async function loadProgress(userId: string, program: string, knownTotalWeeks?: number): Promise<ProgramProgress> {
  const [totalWeeks, checkins, sessions] = await Promise.all([
    knownTotalWeeks ?? getTotalWeeks(program),
    query(`SELECT week FROM program_checkins WHERE user_id = $1 AND program = $2 ORDER BY week`, [userId, program]),
    query(
      `SELECT week, day, rounds_done, completed_at IS NOT NULL AS done
       FROM program_session_progress
       WHERE user_id = $1 AND program = $2
       ORDER BY week, day`,
      [userId, program]
    ),
  ]);
  const checkedInWeeks = checkins.rows.map((r: { week: number }) => Number(r.week));
  return {
    currentWeek: currentWeekFrom(checkedInWeeks.length, totalWeeks),
    totalWeeks,
    completed: sessions.rows.map((r: CompletedDay) => ({
      week: Number(r.week),
      day: Number(r.day),
      rounds_done: Number(r.rounds_done),
      done: Boolean(r.done),
    })),
    checkedInWeeks,
    graduated: totalWeeks > 0 && checkedInWeeks.length >= totalWeeks,
  };
}

export type CheckinValidation = { ok: true; answers: Record<string, string> } | { ok: false; error: string };

/** Keeps only answers to known questions; choice answers must be one of the listed options. */
export function validateCheckinAnswers(questions: CheckinQuestion[], answers: unknown): CheckinValidation {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return { ok: false, error: 'Please answer the check-in questions' };
  }
  const source = answers as Record<string, unknown>;
  const clean: Record<string, string> = {};
  for (const q of questions) {
    const raw = source[q.id];
    const value = typeof raw === 'string' ? raw.trim() : typeof raw === 'number' ? String(raw) : '';
    if (!value) {
      if (q.required) return { ok: false, error: `Please answer: ${q.label}` };
      continue;
    }
    if ((q.type === 'choice' || q.type === 'scale') && q.options?.length && !q.options.includes(value)) {
      return { ok: false, error: `Please pick an answer for: ${q.label}` };
    }
    if (value.length > MAX_TEXT_ANSWER) return { ok: false, error: `Your answer to "${q.label}" is too long` };
    clean[q.id] = value;
  }
  return { ok: true, answers: clean };
}
