import api from '../index'
import type { MedalTier, MedalOption } from '../medals'

export async function getAdminMedals() {
  const response = await api.get<MedalTier[]>('/admin/medals')
  return response.data
}

export async function updateAdminMedalTier(
  id: string,
  data: {
    name: string
    description?: string | null
    benefits: string[]
    image_url?: string | null
    sort_order?: number
    is_active?: boolean
  }
) {
  const response = await api.put(`/admin/medals/${id}`, data)
  return response.data
}

export async function upsertAdminMedalOption(
  tierId: string,
  data: {
    id?: string
    distance_km: number
    price: number
    capacity?: number | null
    is_active?: boolean
  }
) {
  const response = await api.post<MedalOption>(`/admin/medals/${tierId}/options`, data)
  return response.data
}

export async function deleteAdminMedalOption(tierId: string, optionId: string) {
  const response = await api.delete(`/admin/medals/${tierId}/options/${optionId}`)
  return response.data
}

export interface AdminMedalPurchase {
  id: string
  buyer_name: string | null
  email: string | null
  phone: string | null
  payment_status: string
  mpesa_receipt: string | null
  checkout_request_id: string | null
  purchase_batch_id: string | null
  created_at: string
  redeemed_at?: string | null
  redeemed_by?: string | null
  distance_km: number
  price: number
  tier_name: string
  tier_slug: string
}

export async function getAdminMedalPurchases() {
  const response = await api.get<AdminMedalPurchase[]>('/admin/medals/purchases')
  return response.data
}
