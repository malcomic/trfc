import api from './index'

export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'reversed'
export type CommissionSourceType = 'order' | 'medal' | 'equipment_hire' | 'ticket' | 'event_share'

/** The zone a referral link belongs to. */
export interface Referrer {
  code: string
  zone: string
  region_id: string
}

export interface CaptainDirectoryEntry {
  id: string
  name: string
  region_id: string
  zone: string
  photo_url: string | null
}

export interface CaptainTeamMember {
  id: string
  name: string
  joined_at: string | null
  joined_via: 'zone_link' | 'chosen'
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
  team_members: number
  referred_sales: number
  pending_amount: number
  approved_amount: number
  paid_amount: number
  /** Active captains sharing the zone's payouts equally. */
  active_captains: number
  /** Total paid to this captain from zone payouts. */
  my_paid_amount: number
}

export interface CaptainProfile {
  user_id: string
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

export interface CaptainReferral {
  id: string
  name: string
  referred_at: string | null
  purchases: number
  total_spent: number
  commission_earned: number
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
  /** The zone's total for this payout. */
  amount: number
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

export const getMyTeam = async (): Promise<CaptainTeamMember[]> => {
  const response = await api.get('/captains/me/team')
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

export const getMyReferralQr = async (origin: string): Promise<{ link: string; dataUrl: string }> => {
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
