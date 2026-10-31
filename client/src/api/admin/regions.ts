import api from '../index'

export interface Region {
  id: string
  name: string
  slug: string
  code: string
  is_active: boolean
  created_at: string
  captain_count: number
  /** Zone referral code; every referral and commission belongs to the zone. */
  referral_code: string
  commission_rate: number
  /** Captain who receives the zone's payouts. */
  lead_captain_id: string | null
  lead_captain_name: string | null
  lead_captain_phone: string | null
  referred_customers: number
  referred_sales: number
  pending_amount: number
  approved_amount: number
  paid_amount: number
}

export interface RegionPayload {
  name: string
  code: string
  is_active?: boolean
  referral_code?: string
  commission_rate?: number
  lead_captain_id?: string | null
}

export const getRegions = async (): Promise<Region[]> => {
  const response = await api.get('/admin/regions')
  return response.data
}

export const createRegion = async (data: RegionPayload): Promise<{ id: string }> => {
  const response = await api.post('/admin/regions', data)
  return response.data
}

export const updateRegion = async (id: string, data: RegionPayload): Promise<{ id: string }> => {
  const response = await api.put(`/admin/regions/${id}`, data)
  return response.data
}

export const deactivateRegion = async (id: string) => {
  const response = await api.delete(`/admin/regions/${id}`)
  return response.data
}
