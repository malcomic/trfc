import api from './index'

export interface CheckinEvent {
  id: string
  title: string
  event_date: string
  location: string | null
  is_community_run: boolean
  checked_in: number
  points_kind?: string
  ends_at?: string | null
  headcount?: number | null
}

export type MemberCheckinStatus =
  | 'valid'
  | 'already_checked_in'
  | 'not_found'
  | 'wrong_zone'
  | 'not_eligible'
  | 'outside_window'
  | 'self_scan'
  | 'season_frozen'

export interface MemberCheckinResult {
  kind: 'member'
  status: MemberCheckinStatus
  member: { id: string; name: string | null; zone: string | null; paidMember?: boolean } | null
  checkedInAt: string | null
  ticketCheckedIn?: boolean
  pointsAwarded?: number
}

export function isMemberPayload(value: string): boolean {
  const v = value.trim().toLowerCase()
  return v.startsWith('member:') || v.startsWith('memberpass:')
}

/** A typed member code: 10 characters with no 0/O/1/I, e.g. ABCDE-FGHJK. Ticket short codes are 8. */
export function looksLikeMemberCode(value: string): boolean {
  return /^[A-HJ-NP-Z2-9]{10}$/.test(value.toUpperCase().replace(/[\s-]/g, ''))
}

export const listCheckinEvents = async (): Promise<CheckinEvent[]> => (await api.get('/checkins/events')).data

export interface ScannedMember {
  id: string
  name: string | null
  scanned_at: string
  saturdays_attended: number
}

export const listScannedMembers = async (eventId: string): Promise<ScannedMember[]> =>
  (await api.get(`/checkins/events/${encodeURIComponent(eventId)}/scanned`)).data

export const setCheckinHeadcount = async (eventId: string, count: number) =>
  (await api.put(`/checkins/events/${encodeURIComponent(eventId)}/headcount`, { count })).data

export const recordFinishTime = async (eventId: string, userId: string, seconds: number) =>
  (await api.post(`/checkins/events/${encodeURIComponent(eventId)}/finish-time`, { userId, seconds })).data

type CheckinBody = { eventId: string; payload?: string; code?: string }

export const lookupMemberCheckin = async (body: CheckinBody): Promise<MemberCheckinResult> => ({
  kind: 'member',
  ...(await api.post('/checkins/lookup', body)).data,
})

/** Resolves for 409/403/404 too, since those bodies describe the member's status. */
export const admitMemberCheckin = async (body: CheckinBody): Promise<MemberCheckinResult> => {
  const response = await api.post('/checkins/admit', body, {
    validateStatus: (status) => status < 300 || status === 403 || status === 404 || status === 409,
  })
  if (response.status !== 200 && !response.data?.status) {
    throw new Error(response.data?.error || 'Check-in failed')
  }
  return { kind: 'member', ...response.data }
}

export const MEMBER_STATUS_LABELS: Record<MemberCheckinStatus, string> = {
  valid: 'Checked in',
  already_checked_in: 'Already checked in',
  not_found: 'Member not found',
  wrong_zone: 'Not your zone',
  not_eligible: 'Membership not active',
  outside_window: 'Outside scan window',
  self_scan: 'Cannot scan yourself',
  season_frozen: 'Season is frozen',
}
