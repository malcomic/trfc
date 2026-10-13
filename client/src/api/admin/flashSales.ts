import api from '../index'
import type { FlashSale, FlashShareLink } from '../../types'

export interface CreatedFlashShareLink {
  id: string
  url: string
  expiresAt: string
  maxUses: number
  emailSent: boolean
  emailError?: string
}

export const getFlashShareLinks = async (): Promise<FlashShareLink[]> => {
  const response = await api.get('/admin/flash-share-links')
  return response.data
}

export const createFlashShareLink = async (data: {
  zone_id?: string | null
  email?: string
  max_uses?: number
}): Promise<CreatedFlashShareLink> => {
  const response = await api.post('/admin/flash-share-links', data)
  return response.data
}

export const revokeFlashShareLink = async (id: string) => {
  const response = await api.post(`/admin/flash-share-links/${id}/revoke`)
  return response.data
}

export interface FlashSalePayload {
  product_id: string
  sale_price: number
  quantity_limit: number | null
  starts_at: string
  ends_at: string | null
  sort_order: number
  is_active: boolean
}

export const getFlashSalesForAdmin = async (): Promise<FlashSale[]> => {
  const response = await api.get('/admin/flash-sales')
  return response.data
}

export const createFlashSale = async (data: FlashSalePayload) => {
  const response = await api.post('/flash-sales', data)
  return response.data
}

export const updateFlashSale = async (id: string, data: FlashSalePayload) => {
  const response = await api.put(`/flash-sales/${id}`, data)
  return response.data
}

export const deleteFlashSale = async (id: string) => {
  const response = await api.delete(`/flash-sales/${id}`)
  return response.data
}
