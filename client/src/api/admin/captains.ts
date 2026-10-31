import api from '../index'
import type { CommissionSourceType, CommissionStatus } from '../captains'

export interface AdminCaptain {
  user_id: string
  /** Legacy personal code; links using it credit the captain's zone. */
  referral_code: string
  payout_phone: string | null
  status: 'active' | 'suspended'
  created_at: string
  name: string
  email: string | null
  phone: string
  region_id: string
  region_name: string
  region_code: string
  is_lead: boolean
  team_members: number
}

export interface AdminCommission {
  id: string
  region_id: string
  referred_user_id: string | null
  source_type: CommissionSourceType
  source_id: string
  match_method: 'account' | 'email' | 'phone' | 'event'
  base_amount: number
  rate: number
  amount: number
  status: CommissionStatus
  payout_id: string | null
  approved_at: string | null
  created_at: string
  region_name: string
  region_code: string
  referral_code: string
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
}

export interface AdminPayout {
  id: string
  region_id: string
  captain_id: string | null
  amount: number
  mpesa_receipt: string | null
  note: string | null
  paid_at: string
  region_name: string
  region_code: string
  paid_to_name: string | null
  payout_phone: string | null
  paid_by_name: string | null
  commission_count: number
}

export interface CreateCaptainPayload {
  userId: string
  regionId: string
  payoutPhone?: string
}

export interface UpdateCaptainPayload {
  regionId?: string
  payoutPhone?: string
  status?: 'active' | 'suspended'
}

export interface CommissionFilters {
  regionId?: string
  status?: CommissionStatus | ''
  from?: string
  to?: string
}

const compact = <T extends object>(params: T) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))

export const getAdminCaptains = async (
  params: { regionId?: string; status?: string } = {}
): Promise<AdminCaptain[]> => {
  const response = await api.get('/admin/captains', { params: compact(params) })
  return response.data
}

export const createCaptain = async (data: CreateCaptainPayload) => {
  const response = await api.post('/admin/captains', data)
  return response.data as { user_id: string }
}

export const updateCaptain = async (id: string, data: UpdateCaptainPayload) => {
  const response = await api.put(`/admin/captains/${id}`, data)
  return response.data
}

export const removeCaptain = async (id: string) => {
  const response = await api.delete(`/admin/captains/${id}`)
  return response.data
}

export const getAdminCommissions = async (filters: CommissionFilters = {}): Promise<AdminCommission[]> => {
  const response = await api.get('/admin/captain-commissions', { params: compact(filters) })
  return response.data
}

export const approveCommissions = async (ids: string[]) => {
  const response = await api.post('/admin/captain-commissions/approve', { ids })
  return response.data as { approved: number }
}

export const reverseCommission = async (id: string) => {
  const response = await api.post(`/admin/captain-commissions/${id}/reverse`)
  return response.data
}

export const syncCommissions = async (days = 90) => {
  const response = await api.post('/admin/captain-commissions/sync', { days })
  return response.data as { created: number; days: number }
}

export const getAdminPayouts = async (regionId?: string): Promise<AdminPayout[]> => {
  const response = await api.get('/admin/captain-payouts', { params: compact({ regionId }) })
  return response.data
}

export const createPayout = async (data: {
  regionId: string
  commissionIds: string[]
  mpesaReceipt: string
  note?: string
}) => {
  const response = await api.post('/admin/captain-payouts', data)
  return response.data as { id: string; amount: number; paid_at: string }
}
