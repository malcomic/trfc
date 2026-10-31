import api from '../index'
import type { TicketCredit, WalletTransaction } from '../wallet'

export interface AdminWallet {
  user_id: string
  name: string | null
  email: string | null
  phone: string | null
  ticket_value: number
  next_expiry: string | null
  active_plans: number
  updated_at: string
}

export interface AdminWalletLedger {
  user: { id: string; name: string | null; email: string | null; phone: string | null }
  ticketValue: number
  upcoming: number
  credits: TicketCredit[]
  transactions: WalletTransaction[]
  total: number
  page: number
  limit: number
}

export type AdminPlanFilter = '' | 'active' | 'overdue' | 'completed' | 'expired'

export interface AdminPaymentPlan {
  id: string
  status: 'active' | 'completed' | 'cancelled' | 'expired' | 'moved'
  total_amount: number
  amount_paid: number
  deposit_amount: number | null
  deadline_at: string | null
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

export interface TicketRules {
  creditDays: number
  earlyNoticeHours: number
  depositPct: number
  depositRoundTo: number
  defaultDeadlineDays: number
  priorityReleaseDays: number
  markPresentHours: number
  captainProfitShareEnabled: boolean
  captainProfitSharePct: number
  termsVersion: string
}

export const getAdminWallets = async (params: { search?: string; page?: number } = {}) =>
  (await api.get('/admin/wallets', { params })).data as {
    wallets: AdminWallet[]
    /** Ticket value members hold in total. */
    outstanding: number
    wallet_count: number
    with_value: number
    page: number
    limit: number
  }

export const getAdminWalletLedger = async (userId: string, page = 1): Promise<AdminWalletLedger> =>
  (await api.get(`/admin/wallets/${userId}`, { params: { page } })).data

/** Adds ticket credit to a member (valid for the usual number of days from today). */
export const createAdminCredit = async (data: { userId: string; amount: number; note: string }) =>
  (await api.post('/admin/wallets/credits', data)).data

export const voidAdminCredit = async (creditId: string, note: string): Promise<{ voided: number }> =>
  (await api.post(`/admin/wallets/credits/${creditId}/void`, { note })).data

export const getTicketRules = async (): Promise<TicketRules> => (await api.get('/admin/ticket-rules')).data

export const updateTicketRules = async (rules: Partial<TicketRules>): Promise<TicketRules> =>
  (await api.put('/admin/ticket-rules', rules)).data

export const getAdminPaymentPlans = async (status: AdminPlanFilter = '', page = 1) =>
  (await api.get('/admin/wallets/plans', { params: { status: status || undefined, page } })).data as {
    plans: AdminPaymentPlan[]
    total: number
    page: number
    limit: number
  }
