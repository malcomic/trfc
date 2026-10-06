import api from './index'
import type { FlashSalesResponse } from '../types'

export interface FlashAccessResponse {
  token: string
  expiresAt: string
}

export const requestFlashAccess = async (body: {
  checkoutRequestId?: string
  phone?: string
  email?: string
} = {}): Promise<FlashAccessResponse> => {
  const response = await api.post('/flash-sales/access', body)
  return response.data
}

export const getFlashSales = async (token?: string): Promise<FlashSalesResponse> => {
  const response = await api.get('/flash-sales', {
    headers: token ? { 'X-Flash-Access': token } : undefined,
  })
  return response.data
}

export const getFlashStatus = async (token?: string): Promise<{ eligible: boolean; expiresAt: string | null }> => {
  const response = await api.get('/flash-sales/status', {
    headers: token ? { 'X-Flash-Access': token } : undefined,
  })
  return response.data
}
