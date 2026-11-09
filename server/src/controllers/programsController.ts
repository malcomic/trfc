import { Request, Response } from 'express';
import { query } from '../config/db.js';
import type { ProgramContent, ProgramWeekContent } from '../types/programContent.js';
import { findProgram, getPublishedContent, type ProgramRow } from '../utils/programCatalog.js';
import {
  isWeekOpen,
  loadProgress,
  parsePositiveInt,
  requireEnrollment,
  validateCheckinAnswers,
} from '../utils/programProgress.js';
import { notifyCaptainOfCheckin } from '../utils/programCheckinNotify.js';

const QUIZ_KEYS = ['goal', 'experience', 'days'] as const;

export function sanitizeQuizAnswers(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const clean: Record<string, string> = {};
  for (const key of QUIZ_KEYS) {
    const v = source[key];
    if (typeof v === 'string' && v.length > 0 && v.length <= 20) clean[key] = v;
  }
  return Object.keys(clean).length > 0 ? clean : null;
}

/** Free published programs can be joined straight away. Paid programs open with M-Pesa joining. */
export function isEnrollable(row: ProgramRow, content: ProgramContent | null): boolean {
  return row.status === 'published' && !!content && Number(content.page?.price ?? 0) === 0;
}

export const enrollProgram = async (req: Request, res: Response) => {
  try {
    const { program: key, quizAnswers } = req.body ?? {};
    const row = await findProgram(key);
    if (!row) return res.status(400).json({ error: 'Unknown program' });
    const content = await getPublishedContent(row.id);
    if (!isEnrollable(row, content)) {
      return res.status(409).json({ error: 'Coming soon' });
    }
    const answers = sanitizeQuizAnswers(quizAnswers);
    const result = await query(
      `INSERT INTO program_enrollments (user_id, program, amount, quiz_answers)
       VALUES ($1, $2, 0, $3)
       ON CONFLICT (user_id, program)
       DO UPDATE SET status = 'active', quiz_answers = COALESCE(EXCLUDED.quiz_answers, program_enrollments.quiz_answers)
       RETURNING program, status, amount, enrolled_at`,
      [req.user!.id, row.id, answers ? JSON.stringify(answers) : null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to join the program' });
  }
};

export const getMyPrograms = async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT e.program, p.slug, p.name, e.status, e.amount, e.enrolled_at
       FROM program_enrollments e
       LEFT JOIN programs p ON p.id = e.program
       WHERE e.user_id = $1
       ORDER BY e.enrolled_at DESC`,
      [req.user!.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load your programs' });
  }
};

const MAX_ROUNDS = 100;

interface EnrolledProgram {
  row: ProgramRow;
  content: ProgramContent;
}

/**
 * Sends the error response and returns null unless the program exists, the user has joined it
 * and it has published content. Archived programs stay open to members who already joined.
 */
async function enrolledProgram(req: Request, res: Response): Promise<EnrolledProgram | null> {
  const row = await findProgram(req.params.program);
  if (!row) {
    res.status(400).json({ error: 'Unknown program' });
    return null;
  }
  if (!(await requireEnrollment(req.user!.id, row.id))) {
    res.status(403).json({ error: 'Join this program first' });
    return null;
  }
  const content = await getPublishedContent(row.id);
  if (!content) {
    res.status(404).json({ error: 'This program is not ready yet' });
    return null;
  }
  return { row, content };
}

function findWeek(content: ProgramContent, weekNumber: number): ProgramWeekContent | undefined {
  return content.weeks.find((w) => w.week === weekNumber);
}

export const getProgramPlan = async (req: Request, res: Response) => {
  try {
    const found = await enrolledProgram(req, res);
    if (!found) return;
    const { row, content } = found;
    const progress = await loadProgress(req.user!.id, row.id, content.weeks.length);
    res.json({
      program: row.id,
      slug: row.slug,
      name: row.name,
      howYourWeekWorks: content.plan.howYourWeekWorks,
      howWeeksOpen: content.plan.howWeeksOpen,
      graduation: content.plan.graduation,
      checkinQuestions: content.plan.checkinQuestions,
      weeks: content.weeks.map((w) => ({
        week_number: w.week,
        title: w.title,
        summary: w.summary,
        locked: !isWeekOpen(w.week, progress.currentWeek),
        checkedIn: progress.checkedInWeeks.includes(w.week),
      })),
      progress,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load your program' });
  }
};

export const getProgramWeek = async (req: Request, res: Response) => {
  try {
    const found = await enrolledProgram(req, res);
    if (!found) return;
    const { row, content } = found;
    const weekNumber = parsePositiveInt(req.params.week);
    if (!weekNumber) return res.status(400).json({ error: 'Unknown week' });
    const week = findWeek(content, weekNumber);
    if (!week) return res.status(404).json({ error: 'Unknown week' });
    const progress = await loadProgress(req.user!.id, row.id, content.weeks.length);
    if (!isWeekOpen(weekNumber, progress.currentWeek)) {
      return res.status(403).json({ error: 'This week opens after your Sunday check-in', locked: true });
    }
    const doneByDay = new Map(progress.completed.filter((c) => c.week === weekNumber).map((c) => [c.day, c]));
    res.json({
      week: {
        week_number: weekNumber,
        title: week.title,
        summary: week.summary,
        purpose: week.purpose,
        coach_note: week.coachNote,
        voice_note_url: week.voiceNoteUrl,
        tip: week.tip,
      },
      days: [...week.days]
        .sort((a, b) => a.day - b.day)
        .map((d) => {
          const p = doneByDay.get(d.day);
          return {
            day_number: d.day,
            kind: d.kind,
            title: d.title,
            steps: d.steps,
            done: p?.done ?? false,
            rounds_done: p?.rounds_done ?? 0,
          };
        }),
      checkedIn: progress.checkedInWeeks.includes(weekNumber),
      isCurrentWeek: weekNumber === progress.currentWeek && !progress.graduated,
      totalWeeks: progress.totalWeeks,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load this week' });
  }
};

export const getProgramProgress = async (req: Request, res: Response) => {
  try {
    const found = await enrolledProgram(req, res);
    if (!found) return;
    res.json(await loadProgress(req.user!.id, found.row.id, found.content.weeks.length));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load your progress' });
  }
};

export const setSessionProgress = async (req: Request, res: Response) => {
  try {
    const found = await enrolledProgram(req, res);
    if (!found) return;
    const { row, content } = found;
    const week = parsePositiveInt(req.params.week);
    const day = parsePositiveInt(req.params.day);
    if (!week || !day || day > 7) return res.status(400).json({ error: 'Unknown day' });

    const { done, roundsDone } = req.body ?? {};
    if (typeof done !== 'boolean') return res.status(400).json({ error: 'Say whether the day is done' });
    let rounds: number | null = null;
    if (roundsDone !== undefined) {
      if (!Number.isInteger(roundsDone) || roundsDone < 0 || roundsDone > MAX_ROUNDS) {
        return res.status(400).json({ error: 'Invalid rounds' });
      }
      rounds = roundsDone;
    }

    const weekContent = findWeek(content, week);
    if (!weekContent || !weekContent.days.some((d) => d.day === day)) {
      return res.status(404).json({ error: 'Unknown day' });
    }
    const progress = await loadProgress(req.user!.id, row.id, content.weeks.length);
    if (!isWeekOpen(week, progress.currentWeek)) {
      return res.status(403).json({ error: 'This week opens after your Sunday check-in', locked: true });
    }

    const result = await query(
      `INSERT INTO program_session_progress (user_id, program, week, day, rounds_done, completed_at)
       VALUES ($1, $2, $3, $4, COALESCE($5::int, 0), CASE WHEN $6::boolean THEN NOW() ELSE NULL END)
       ON CONFLICT (user_id, program, week, day) DO UPDATE SET
         rounds_done = COALESCE($5::int, program_session_progress.rounds_done),
         completed_at = CASE WHEN $6::boolean THEN COALESCE(program_session_progress.completed_at, NOW()) ELSE NULL END,
         updated_at = NOW()
       RETURNING week, day, rounds_done, completed_at IS NOT NULL AS done`,
      [req.user!.id, row.id, week, day, rounds, done]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save this workout' });
  }
};

export const submitCheckin = async (req: Request, res: Response) => {
  try {
    const found = await enrolledProgram(req, res);
    if (!found) return;
    const { row, content } = found;
    const week = parsePositiveInt(req.params.week);
    if (!week) return res.status(400).json({ error: 'Unknown week' });

    const totalWeeks = content.weeks.length;
    const progress = await loadProgress(req.user!.id, row.id, totalWeeks);
    if (progress.checkedInWeeks.includes(week)) {
      return res.status(409).json({ error: 'You already sent this check-in' });
    }
    if (progress.graduated || week !== progress.currentWeek) {
      return res.status(409).json({ error: 'You can only check in for your current week' });
    }

    const validation = validateCheckinAnswers(content.plan.checkinQuestions ?? [], req.body?.answers);
    if (!validation.ok) return res.status(400).json({ error: validation.error });

    const inserted = await query(
      `INSERT INTO program_checkins (user_id, program, week, answers)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, program, week) DO NOTHING
       RETURNING week`,
      [req.user!.id, row.id, week, JSON.stringify(validation.answers)]
    );
    if (!inserted.rows[0]) return res.status(409).json({ error: 'You already sent this check-in' });

    const next = await loadProgress(req.user!.id, row.id, totalWeeks);
    notifyCaptainOfCheckin(req.user!.id, row.id, week, validation.answers).catch((error) =>
      console.error('Check-in captain notice failed:', error)
    );
    res.status(201).json({
      week,
      nextWeek: next.graduated ? null : next.currentWeek,
      graduated: next.graduated,
      progress: next,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send your check-in' });
  }
};
