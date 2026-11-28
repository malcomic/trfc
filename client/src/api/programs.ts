import api from './index';
import type { FinderAnswers } from '../content/finder/types';
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

export type EnrollQuizPayload =
  | EnrollQuizAnswers
  | { version: number; answers: FinderAnswers | Record<string, unknown>; derived?: unknown }

export const enrollProgram = async (
  program: ProgramId,
  quizAnswers?: EnrollQuizPayload | null
): Promise<ProgramEnrollment> => {
  const response = await api.post('/programs/enroll', { program, quizAnswers: quizAnswers ?? undefined });
  return response.data;
};

export const getMyPrograms = async (): Promise<ProgramEnrollment[]> => {
  const response = await api.get('/programs/mine');
  return Array.isArray(response.data) ? response.data : [];
};

export type DayKind = 'run' | 'strength' | 'rest' | 'community';

export interface DaySteps {
  warmUp: string[];
  mainSet?: { label: string; rounds: number; work: string; rest?: string };
  coolDown: string[];
  durationMinutes?: number;
}

export interface CheckinQuestion {
  id: string;
  label: string;
  type: 'choice' | 'scale' | 'text';
  options?: string[];
  required: boolean;
}

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

export interface PlanWeekSummary {
  week_number: number;
  title: string;
  summary: string;
  locked: boolean;
  checkedIn: boolean;
}

export interface ProgramPlan {
  program: ProgramId;
  slug: string;
  name: string;
  howYourWeekWorks: string[];
  howWeeksOpen: string[];
  graduation: { heading?: string; body?: string };
  checkinQuestions: CheckinQuestion[];
  weeks: PlanWeekSummary[];
  progress: ProgramProgress;
}

export interface ProgramDay {
  day_number: number;
  kind: DayKind;
  title: string;
  steps: DaySteps;
  done: boolean;
  rounds_done: number;
}

export interface ProgramWeekDetail {
  week: {
    week_number: number;
    title: string;
    summary: string;
    purpose: string;
    coach_note: string;
    voice_note_url: string | null;
    tip: string;
  };
  days: ProgramDay[];
  checkedIn: boolean;
  isCurrentWeek: boolean;
  totalWeeks: number;
}

export interface SessionResult {
  week: number;
  day: number;
  rounds_done: number;
  done: boolean;
}

export interface CheckinResult {
  week: number;
  nextWeek: number | null;
  graduated: boolean;
  progress: ProgramProgress;
}

export const getProgramPlan = async (program: ProgramId): Promise<ProgramPlan> => {
  const response = await api.get(`/programs/${encodeURIComponent(program)}/plan`);
  return response.data;
};

export const getProgramWeek = async (program: ProgramId, week: number): Promise<ProgramWeekDetail> => {
  const response = await api.get(`/programs/${program}/weeks/${week}`);
  return response.data;
};

export const getProgramProgress = async (program: ProgramId): Promise<ProgramProgress> => {
  const response = await api.get(`/programs/${program}/progress`);
  return response.data;
};

export const setSessionDone = async (
  program: ProgramId,
  week: number,
  day: number,
  body: { done: boolean; roundsDone?: number }
): Promise<SessionResult> => {
  const response = await api.put(`/programs/${program}/sessions/${week}/${day}`, body);
  return response.data;
};

export const sendCheckin = async (
  program: ProgramId,
  week: number,
  answers: Record<string, string>
): Promise<CheckinResult> => {
  const response = await api.post(`/programs/${program}/checkins/${week}`, { answers });
  return response.data;
};

export interface CoachingFeedbackItem {
  id: string
  body: string
  relatedReviewId: string | null
  createdAt: string
  coachName: string
}

export const getCoachingFeedback = async (program: ProgramId): Promise<CoachingFeedbackItem[]> => {
  const response = await api.get<{ feedback: CoachingFeedbackItem[] }>(`/programs/${program}/coaching-feedback`)
  return response.data.feedback
}

export interface ProgramCoachMessage {
  id: string
  senderId: string
  body: string
  createdAt: string
  readAt: string | null
  mine: boolean
}

export interface ProgramMessagesResponse {
  conversation: {
    id: string
    programId: string
    participantId: string
    lastMessageAt: string
  } | null
  messages: ProgramCoachMessage[]
  coach: { userId: string; name: string } | null
  unreadCount?: number
}

export const getProgramMessages = async (program: ProgramId): Promise<ProgramMessagesResponse> => {
  const response = await api.get<ProgramMessagesResponse>(`/programs/${program}/messages`)
  return response.data
}

export const postProgramMessage = async (
  program: ProgramId,
  body: string
): Promise<{ message: ProgramCoachMessage; coach: { userId: string; name: string } }> => {
  const response = await api.post<{ message: ProgramCoachMessage; coach: { userId: string; name: string } }>(
    `/programs/${program}/messages`,
    { body }
  )
  return response.data
}

export const getProgramMessagesUnreadCount = async (program: ProgramId): Promise<number> => {
  const response = await api.get<{ count: number }>(`/programs/${program}/messages/unread-count`)
  return response.data.count
}
