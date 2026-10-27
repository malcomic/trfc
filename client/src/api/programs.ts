import api from './index';
import type { ProgramId } from '../content/programs';
import type { DaysAnswer, ExperienceAnswer, GoalAnswer } from '../content/quiz';

export interface ProgramEnrollment {
  program: ProgramId;
  status: string;
  amount: number;
  enrolled_at: string;
}

export interface EnrollQuizAnswers {
  goal: GoalAnswer;
  experience: ExperienceAnswer;
  days: DaysAnswer;
}

export const enrollProgram = async (
  program: ProgramId,
  quizAnswers?: EnrollQuizAnswers | null
): Promise<ProgramEnrollment> => {
  const response = await api.post('/programs/enroll', { program, quizAnswers: quizAnswers ?? undefined });
  return response.data;
};

export const getMyPrograms = async (): Promise<ProgramEnrollment[]> => {
  const response = await api.get('/programs/mine');
  return Array.isArray(response.data) ? response.data : [];
};
