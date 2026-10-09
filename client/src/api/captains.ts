import api from './index'

export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'reversed'
export type CommissionSourceType = 'order' | 'medal' | 'equipment_hire'

export interface Referrer {
  code: string
  name: string
  region: string
}

export interface CaptainStats {
  referred_customers: number
  referred_sales: number
  pending_amount: number
  approved_amount: number
  paid_amount: number
}

export interface CaptainProfile {
  user_id: string
  referral_code: string
  commission_rate: number
  payout_phone: string | null
  status: 'active' | 'suspended'
  created_at: string
  name: string
  email: string | null
  phone: string
  region_id: string
  region_name: string
  region_code: string
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
}

export interface CaptainCommissionPage {
  commissions: CaptainCommission[]
  total: number
  page: number
  limit: number
}

export interface CaptainPayout {
  id: string
  amount: number
  mpesa_receipt: string | null
  note: string | null
  paid_at: string
  commission_count: number
}

export const SOURCE_LABELS: Record<CommissionSourceType, string> = {
  order: 'Shop order',
  medal: 'Medal',
  equipment_hire: 'Equipment hire',
}

export const getReferrer = async (code: string): Promise<Referrer> => {
  const response = await api.get(`/captains/ref/${encodeURIComponent(code)}`)
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
