import api from '../index'
import type { WalletTransaction } from '../wallet'

export interface AdminWallet {
  user_id: string
  name: string | null
  email: string | null
  phone: string | null
  balance: number
  active_plans: number
  updated_at: string
}

export interface AdminWalletLedger {
  user: { id: string; name: string | null; email: string | null; phone: string | null }
  balance: number
  transactions: WalletTransaction[]
  total: number
  page: number
  limit: number
}

export type AdminPlanFilter = '' | 'active' | 'overdue' | 'completed' | 'expired'

export interface AdminPaymentPlan {
  id: string
  status: 'active' | 'completed' | 'cancelled' | 'expired'
  total_amount: number
  amount_paid: number
  installment_count: number
  created_at: string
  completed_at: string | null
  user_id: string
  user_name: string | null
  user_email: string | null
  event_title: string
  event_date: string
  quantity: number
  next_due_at: string | null
}

export const getAdminWallets = async (params: { search?: string; page?: number } = {}) =>
  (await api.get('/admin/wallets', { params })).data as {
    wallets: AdminWallet[]
    liability: number
    funded: number
    page: number
    limit: number
  }

export const getAdminWalletLedger = async (userId: string, page = 1): Promise<AdminWalletLedger> =>
  (await api.get(`/admin/wallets/${userId}`, { params: { page } })).data

export const createWalletAdjustment = async (data: { userId: string; amount: number; note: string }) =>
  (await api.post('/admin/wallets/adjustments', data)).data as WalletTransaction

export const getAdminPaymentPlans = async (status: AdminPlanFilter = '', page = 1) =>
  (await api.get('/admin/wallets/plans', { params: { status: status || undefined, page } })).data as {
    plans: AdminPaymentPlan[]
    total: number
    page: number
    limit: number
  }
