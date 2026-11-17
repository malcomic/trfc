import api from './index'

export type ReviewStatus = 'reviewed' | 'needs_clarification' | 'flagged'
export type ReviewActivityType = 'session' | 'checkin'
export type EngagementStatus = 'on_track' | 'needs_attention' | 'inactive' | 'completed'

export const ENGAGEMENT_STATUS_LABELS: Record<EngagementStatus, string> = {
  on_track: 'On Track',
  needs_attention: 'Needs Attention',
  inactive: 'Inactive',
  completed: 'Completed',
}

export const ENGAGEMENT_REASON_LABELS: Record<string, string> = {
  completed: 'Program completed',
  inactive_14d: 'No activity in 14+ days',
  calendar_lag: 'Behind calendar pace',
  missed_sessions: 'Missed sessions from earlier weeks',
  stuck_start: 'Enrolled but no sessions started',
}

export interface CoachMe {
  id: string
  name: string
  email: string
  phone: string | null
  status: string
  activatedAt: string
  applicationId: string | null
  assignedProgramCount: number
  assignedProgramIds: string[]
}

export interface CoachProgramSummary {
  id: string
  slug: string
  name: string
  status: string
  assignedAt: string
  enrolledCount: number
}

export interface CoachRosterParticipant {
  id: string
  name: string
  enrolledAt: string
  status: string
  currentWeek: number
  totalWeeks: number
  sessionsDone: number
  checkinsDone: number
  graduated: boolean
  unreviewedCount: number
  engagementStatus: EngagementStatus
  daysSinceActivity: number
  expectedWeek: number
  lastActivityAt: string
  engagementReasons: string[]
}

export interface CoachProgramDetail {
  id: string
  slug: string
  name: string
  status: string
  description: string | null
  objectives: string[]
  durationLabel: string | null
  totalWeeks: number
  enrolledCount: number
  participants: CoachRosterParticipant[]
}

export interface CoachReview {
  id: string
  activityType: ReviewActivityType
  week: number
  day: number | null
  status: ReviewStatus
  note: string | null
  reviewedAt: string
  updatedAt: string
}

export interface CoachFeedbackItem {
  id: string
  body: string
  relatedReviewId: string | null
  createdAt: string
}

export interface EngagementAttentionItem {
  participantId: string
  participantName: string
  programId: string
  programSlug: string
  programName: string
  engagementStatus: EngagementStatus
  daysSinceActivity: number
  currentWeek: number
  totalWeeks: number
  reasons: string[]
  lastActivityAt: string
}

export interface CoachParticipantDetail {
  id: string
  name: string
  program: { id: string; slug: string; name: string }
  enrolledAt: string
  enrollmentStatus: string
  engagementStatus: EngagementStatus
  daysSinceActivity: number
  expectedWeek: number
  lastActivityAt: string
  engagementReasons: string[]
  progress: {
    currentWeek: number
    totalWeeks: number
    completed: { week: number; day: number; rounds_done: number; done: boolean }[]
    checkedInWeeks: number[]
    graduated: boolean
  }
  completedActivities: {
    week: number
    day: number
    rounds_done: number
    done: boolean
    reviewStatus: ReviewStatus | null
    reviewNote: string | null
    reviewId: string | null
  }[]
  pendingActivities: { week: number; day: number }[]
  missedActivities: { week: number; day: number }[]
  checkins: {
    week: number
    answers: Record<string, string>
    submittedAt: string
    reviewStatus: ReviewStatus | null
    reviewNote: string | null
    reviewId: string | null
  }[]
  reviews: CoachReview[]
  feedback: CoachFeedbackItem[]
}

export interface ReviewQueueItem {
  participantId: string
  participantName: string
  programId: string
  programSlug: string
  programName: string
  activityType: ReviewActivityType
  week: number
  day: number | null
  activityAt: string
  roundsDone: number | null
}

export interface ReviewAttentionItem extends CoachReview {
  participantId: string
  participantName: string
  programId: string
  programSlug: string
  programName: string
}

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  reviewed: 'Reviewed',
  needs_clarification: 'Needs clarification',
  flagged: 'Flagged',
}

export async function getCoachMe(): Promise<CoachMe> {
  return (await api.get<CoachMe>('/coaches/me')).data
}

export async function listCoachPrograms(): Promise<CoachProgramSummary[]> {
  return (await api.get<{ programs: CoachProgramSummary[] }>('/coaches/me/programs')).data.programs
}

export async function getCoachProgram(program: string): Promise<CoachProgramDetail> {
  return (await api.get<CoachProgramDetail>(`/coaches/me/programs/${encodeURIComponent(program)}`)).data
}

export async function getCoachParticipant(program: string, userId: string): Promise<CoachParticipantDetail> {
  return (
    await api.get<CoachParticipantDetail>(
      `/coaches/me/programs/${encodeURIComponent(program)}/participants/${encodeURIComponent(userId)}`
    )
  ).data
}

export async function getReviewQueue(program?: string) {
  return (
    await api.get<{
      items: ReviewQueueItem[]
      attention: ReviewAttentionItem[]
      unreviewedCount: number
    }>('/coaches/me/reviews/queue', { params: program ? { program } : undefined })
  ).data
}

export async function getEngagementAttention(params?: {
  program?: string
  status?: string
}): Promise<{ items: EngagementAttentionItem[] }> {
  return (
    await api.get<{ items: EngagementAttentionItem[] }>('/coaches/me/engagement/attention', {
      params,
    })
  ).data
}

export interface CoachMessage {
  id: string
  senderId: string
  body: string
  createdAt: string
  readAt: string | null
  mine: boolean
}

export interface CoachConversationSummary {
  conversationId: string
  programId: string
  programSlug: string
  programName: string
  participantId: string
  participantName: string
  lastMessageAt: string
  lastMessagePreview: string
  unreadCount: number
}

export interface CoachThread {
  conversation: {
    id: string
    programId: string
    participantId: string
    lastMessageAt: string
  } | null
  messages: CoachMessage[]
}

export async function getCoachInbox(): Promise<{ items: CoachConversationSummary[] }> {
  return (await api.get<{ items: CoachConversationSummary[] }>('/coaches/me/inbox')).data
}

export async function getCoachInboxUnreadCount(): Promise<number> {
  return (await api.get<{ count: number }>('/coaches/me/inbox/unread-count')).data.count
}

export async function getCoachThread(program: string, userId: string): Promise<CoachThread> {
  return (
    await api.get<CoachThread>(
      `/coaches/me/programs/${encodeURIComponent(program)}/participants/${encodeURIComponent(userId)}/messages`
    )
  ).data
}

export async function postCoachMessage(
  program: string,
  userId: string,
  body: string
): Promise<{ message: CoachMessage }> {
  return (
    await api.post<{ message: CoachMessage }>(
      `/coaches/me/programs/${encodeURIComponent(program)}/participants/${encodeURIComponent(userId)}/messages`,
      { body }
    )
  ).data
}

export async function upsertCoachReview(
  program: string,
  userId: string,
  body: { activityType: ReviewActivityType; week: number; day?: number | null; status: ReviewStatus; note?: string | null }
): Promise<CoachReview> {
  return (
    await api.put<{ review: CoachReview }>(
      `/coaches/me/programs/${encodeURIComponent(program)}/participants/${encodeURIComponent(userId)}/reviews`,
      body
    )
  ).data.review
}

export async function postCoachFeedback(
  program: string,
  userId: string,
  body: { body: string; relatedReviewId?: string | null }
): Promise<CoachFeedbackItem> {
  return (
    await api.post<{ feedback: CoachFeedbackItem }>(
      `/coaches/me/programs/${encodeURIComponent(program)}/participants/${encodeURIComponent(userId)}/feedback`,
      body
    )
  ).data.feedback
}
