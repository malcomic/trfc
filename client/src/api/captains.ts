import api from './index'

export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'reversed'
export type CommissionSourceType = 'order' | 'medal' | 'equipment_hire' | 'ticket' | 'event_share'

/** Resolved referral: a zone link, or a captain's personal link (which also joins that zone). */
export interface Referrer {
  /** The code from the link (zone or personal). Send this back on register. */
  code: string
  /** The zone's own referral code. */
  zone_code: string
  zone: string
  region_id: string
  /** Set when the link is a captain's personal code. */
  captain_id: string | null
  captain_name: string | null
}

export interface CaptainDirectoryEntry {
  id: string
  name: string
  region_id: string
  zone: string
  photo_url: string | null
}

export interface CaptainTeamProgram {
  program: string
  status: string
  sessions_done: number
  weeks_checked_in: number
}

export interface CaptainTeamMember {
  id: string
  name: string
  zone: string | null
  joined_at: string | null
  joined_via: 'zone_link' | 'chosen'
  /** True when the member chose this captain; otherwise they are in the captain's zone. */
  is_my_member: boolean
  signed_up_at: string
  saturdays_attended: number
  /** The last Saturday (YYYY-MM-DD) the member was checked in, if ever. */
  last_seen: string | null
  /** Saturdays with a run since the member was last seen (or signed up). */
  missed_saturdays: number
  status: MemberStatus
  /** Couch to 5K only. */
  programs: CaptainTeamProgram[]
  /** Only present while the member has turned on WhatsApp sharing with this captain. */
  whatsapp: string | null
}

export type MemberStatus = 'new' | 'active' | 'missing'

export const MEMBER_STATUS_OPTIONS: { value: MemberStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'active', label: 'Active' },
  { value: 'missing', label: 'Missing' },
]

export interface TeamFilters {
  q?: string
  status?: MemberStatus
}

export interface CaptainTeamExportRow {
  name: string
  status: MemberStatus
  missed_saturdays: number
  saturdays_attended: number
  last_seen: string | null
  signed_up_at: string
}

export interface CaptainZoneOverview {
  total_members: number
  joined_this_week: number
  joined_via_link: number
  no_captain_count: number
  new_count: number
  active_count: number
  missing_count: number
  last_four_saturdays: { date: string; attended: number }[]
}

export interface CaptainLinkStats {
  days: number
  opened: number
  opened_total: number
  finished: number
  finished_total: number
}

export interface CaptainZoneSummary {
  id: string
  name: string
  code: string
  referral_code: string
  commission_rate: number
  lead_captain_name: string | null
  is_lead: boolean
}

export interface CaptainStats {
  referred_customers: number
  /** Members who chose this captain; their shop purchases earn this captain commission. */
  team_members: number
  /** Totals of this captain's own commissions plus the zone's shared money. */
  referred_sales: number
  pending_amount: number
  approved_amount: number
  paid_amount: number
  /** This captain's own shop commissions, never shared. */
  my_pending_amount: number
  my_approved_amount: number
  my_commission_paid_amount: number
  /** Zone money (event profit shares), paid by each captain's members' used tickets. */
  zone_pending_amount: number
  zone_approved_amount: number
  zone_paid_amount: number
  /** Active captains in the zone who can receive zone event-share payouts. */
  active_captains: number
  /** Total paid to this captain, from their own commissions and their share of zone payouts. */
  my_paid_amount: number
}

export interface CaptainProfile {
  user_id: string
  /** This captain's personal referral code (their own link). */
  referral_code: string
  payout_phone: string | null
  /** Shown to members when they choose a captain. */
  photo_url: string | null
  status: 'active' | 'suspended'
  created_at: string
  name: string
  email: string | null
  phone: string
  region_id: string
  region_name: string
  region_code: string
  zone: CaptainZoneSummary
  stats: CaptainStats
}

export interface ReferralQr {
  code: string
  link: string
  dataUrl: string
}

export interface CaptainReferralQr {
  /** Zone link (also exposed as link/dataUrl for older callers). */
  link: string
  dataUrl: string
  zone: ReferralQr
  personal: ReferralQr
}

export interface CaptainReferral {
  id: string
  name: string
  referred_at: string | null
}

export interface CaptainCommission {
  id: string
  source_type: CommissionSourceType
  base_amount: number
  rate: number
  amount: number
  status: CommissionStatus
  created_at: string
  approved_at: string | null
  /** `personal`: this captain's own commission. `zone`: split between the zone's captains. */
  kind: 'personal' | 'zone'
  customer_name: string
  event_title?: string | null
  used_tickets?: number | null
}

export interface CaptainCommissionPage {
  commissions: CaptainCommission[]
  total: number
  page: number
  limit: number
}

export interface CaptainPayout {
  id: string
  /** The payout's total: the zone's total, or this captain's own commissions when `personal`. */
  amount: number
  personal: boolean
  note: string | null
  paid_at: string
  commission_count: number
  captain_count: number
  /** This captain's share; null if they were not a captain of the zone when it was paid. */
  my_amount: number | null
  my_receipt: string | null
}

export const SOURCE_LABELS: Record<CommissionSourceType, string> = {
  order: 'Shop order',
  medal: 'Medal',
  equipment_hire: 'Equipment hire',
  ticket: 'Event ticket',
  event_share: 'Event profit share',
}

export const getReferrer = async (code: string): Promise<Referrer> => {
  const response = await api.get(`/captains/ref/${encodeURIComponent(code)}`)
  return response.data
}

export const getCaptainDirectory = async (): Promise<CaptainDirectoryEntry[]> => {
  const response = await api.get('/captains/directory')
  return response.data
}

/** Counts one open of a zone link for this browser. Fire-and-forget; failures are ignored. */
export const recordReferralVisit = (code: string, visitorId: string): void => {
  api.post(`/captains/ref/${encodeURIComponent(code)}/visit`, { visitorId }).catch(() => {})
}

export const getMyTeam = async (filters: TeamFilters = {}): Promise<CaptainTeamMember[]> => {
  const response = await api.get('/captains/me/team', { params: filters })
  return response.data
}

/** The list to copy or export. The server logs every call for the admin access log. */
export const exportMyTeam = async (
  action: 'copy' | 'export',
  filters: TeamFilters = {}
): Promise<CaptainTeamExportRow[]> => {
  const response = await api.get('/captains/me/team/export', { params: { ...filters, action } })
  return response.data
}

export const getMyZoneOverview = async (): Promise<CaptainZoneOverview> => {
  const response = await api.get('/captains/me/overview')
  return response.data
}

export const getMyLinkStats = async (days = 30): Promise<CaptainLinkStats> => {
  const response = await api.get('/captains/me/link-stats', { params: { days } })
  return response.data
}

export const getMyCaptainProfile = async (): Promise<CaptainProfile> => {
  const response = await api.get('/captains/me')
  return response.data
}

export const getMyReferrals = async (): Promise<CaptainReferral[]> => {
  const response = await api.get('/captains/me/referrals')
  return response.data
}

export const getMyCommissions = async (
  params: { status?: CommissionStatus; page?: number; limit?: number } = {}
): Promise<CaptainCommissionPage> => {
  const response = await api.get('/captains/me/commissions', { params })
  return response.data
}

export const getMyReferralQr = async (origin: string): Promise<CaptainReferralQr> => {
  const response = await api.get('/captains/me/qr', { params: { origin } })
  return response.data
}

export const getMyPayouts = async (): Promise<CaptainPayout[]> => {
  const response = await api.get('/captains/me/payouts')
  return response.data
}

export const uploadMyCaptainPhoto = async (file: File): Promise<{ photo_url: string }> => {
  const formData = new FormData()
  formData.append('photo', file)
  const response = await api.put('/captains/me/photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export const removeMyCaptainPhoto = async (): Promise<{ photo_url: null }> => {
  const response = await api.delete('/captains/me/photo')
  return response.data
}
