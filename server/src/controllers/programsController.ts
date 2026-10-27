import { Request, Response } from 'express';
import { query } from '../config/db.js';

export const PROGRAM_IDS = ['foundations', 'fat_loss', 'endurance', 'hiking'] as const;
export type ProgramId = (typeof PROGRAM_IDS)[number];

/** Programs that can be joined without payment. Paid programs open with M-Pesa joining. */
export const ENROLLABLE: readonly ProgramId[] = ['foundations'];

const QUIZ_KEYS = ['goal', 'experience', 'days'] as const;

export function isProgramId(value: unknown): value is ProgramId {
  return typeof value === 'string' && (PROGRAM_IDS as readonly string[]).includes(value);
}

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

export const enrollProgram = async (req: Request, res: Response) => {
  try {
    const { program, quizAnswers } = req.body ?? {};
    if (!isProgramId(program)) {
      return res.status(400).json({ error: 'Unknown program' });
    }
    if (!ENROLLABLE.includes(program)) {
      return res.status(409).json({ error: 'Coming soon' });
    }
    const answers = sanitizeQuizAnswers(quizAnswers);
    const result = await query(
      `INSERT INTO program_enrollments (user_id, program, amount, quiz_answers)
       VALUES ($1, $2, 0, $3)
       ON CONFLICT (user_id, program)
       DO UPDATE SET status = 'active', quiz_answers = COALESCE(EXCLUDED.quiz_answers, program_enrollments.quiz_answers)
       RETURNING program, status, amount, enrolled_at`,
      [req.user!.id, program, answers ? JSON.stringify(answers) : null]
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
      `SELECT program, status, amount, enrolled_at
       FROM program_enrollments
       WHERE user_id = $1
       ORDER BY enrolled_at DESC`,
      [req.user!.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load your programs' });
  }
};
