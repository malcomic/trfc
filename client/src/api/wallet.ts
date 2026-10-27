import api from './index'
import type { WalletTxType } from './payments'

export interface WalletTransaction {
  id: string
  type: WalletTxType
  amount: number
  mpesa_amount: number | null
  balance_after: number | null
  status: 'pending' | 'completed' | 'failed'
  reference_type: string | null
  reference_id: string | null
  checkout_request_id: string | null
  mpesa_receipt: string | null
  note: string | null
  created_at: string
}

export interface WalletSummary {
  balance: number
  /** Most the wallet may hold; derived from upcoming event prices and set by admins. */
  cap: number
  /** How much more can be topped up right now (cap minus balance and unconfirmed top-ups). */
  headroom: number
  transactions: WalletTransaction[]
}

export const MIN_TOPUP = 10
export const MAX_TOPUP = 150_000

export interface PayableBatch {
  purchase_batch_id: string
  event_id: string
  event_title: string
  event_date: string
  location: string | null
  ticket_type_name: string | null
  quantity: number
  total: number
  created_at: string
}

export interface WalletCheckoutResult {
  references: string[]
  total: number
  balance: number
}

export interface PlanInstallment {
  id: string
  seq: number
  amount: number
  due_at: string
  paid_at: string | null
  /** An M-Pesa prompt for this installment was sent in the last few minutes and hasn't been answered yet. */
  in_progress: boolean
}

export interface PaymentPlan {
  id: string
  purchase_batch_id: string
  event_id: string
  event_title: string
  event_date: string
  location: string | null
  quantity: number
  total_amount: number
  amount_paid: number
  installment_count: number
  status: 'active' | 'completed' | 'cancelled' | 'expired'
  created_at: string
  completed_at: string | null
  installments: PlanInstallment[]
}

export interface ScheduleItem {
  seq: number
  amount: number
  due_at: string
}

export interface MpesaStart {
  checkoutRequestId: string
  customerMessage?: string
}

export const getWallet = async (): Promise<WalletSummary> => (await api.get('/wallet')).data

export const getWalletTransactions = async (
  page = 1,
  limit = 20
): Promise<{ transactions: WalletTransaction[]; total: number; page: number; limit: number }> =>
  (await api.get('/wallet/transactions', { params: { page, limit } })).data

export const topUpWallet = async (data: {
  amount: number
  phone: string
}): Promise<MpesaStart & { amount: number; cap: number; headroom: number }> =>
  (await api.post('/wallet/topup', data)).data

export const getPayableBatches = async (): Promise<PayableBatch[]> => (await api.get('/wallet/payable')).data

export const payFromWallet = async (purchaseBatchIds: string[]): Promise<WalletCheckoutResult> =>
  (await api.post('/wallet/checkout', { purchaseBatchIds })).data

export const previewPlanSchedule = async (params: {
  eventId: string
  total: number
  installments: number
}): Promise<{ schedule: ScheduleItem[] }> => (await api.get('/wallet/plans/preview', { params })).data

export const createPlan = async (data: { purchaseBatchId: string; installments: number }): Promise<PaymentPlan> =>
  (await api.post('/wallet/plans', data)).data

export const getPlans = async (): Promise<PaymentPlan[]> => (await api.get('/wallet/plans')).data

export type PlanPayResult =
  | {
      source: 'wallet'
      plan: PaymentPlan
      balance: number
      amount: number
      completed: boolean
      reference: string | null
      checkoutRequestId?: undefined
    }
  | ({ source: 'mpesa'; amount: number } & MpesaStart)

export const payPlan = async (
  planId: string,
  data: { mode: 'next' | 'all'; source: 'wallet' | 'mpesa'; phone?: string }
): Promise<PlanPayResult> => (await api.post(`/wallet/plans/${planId}/pay`, data)).data

export const cancelTicket = async (
  ticketId: string
): Promise<{ credited: number; balance: number; cancelledTicketIds: string[] }> =>
  (await api.post(`/events/tickets/${ticketId}/cancel`)).data

/** Pulls the shortfall out of a 402 response from wallet payments, if that's what the error was. */
export function getShortfall(err: any): number | null {
  if (err?.response?.status !== 402) return null
  const shortfall = Number(err.response.data?.shortfall)
  return Number.isFinite(shortfall) ? shortfall : null
}
