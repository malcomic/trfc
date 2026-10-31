import api from './index'
import type { WalletTxType } from './payments'

/** Why a member has ticket value. */
export type CreditReason =
  | 'no_show'
  | 'cancelled_early'
  | 'missed_deadline'
  | 'event_cancelled'
  | 'late_payment'
  | 'moved'
  | 'legacy'
  | 'admin'

export const CREDIT_REASON_LABELS: Record<CreditReason, string> = {
  no_show: 'No-show',
  cancelled_early: 'Cancelled early',
  missed_deadline: 'Payment deadline missed',
  event_cancelled: 'Event cancelled by TRFC',
  late_payment: 'Payment after the ticket closed',
  moved: 'Moved to another event',
  legacy: 'Moved from your earlier TRFC wallet',
  admin: 'Added by TRFC',
}

export const TICKET_VALUE_NOTE = 'Event tickets only. Cannot be transferred or cashed out.'

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
  reason: CreditReason | null
  created_at: string
}

export interface TicketCredit {
  id: string
  reason: CreditReason
  amount: number
  remaining: number
  held: number
  available_from: string
  expires_at: string
  status: 'active' | 'used' | 'expired' | 'voided'
  event_title: string | null
  event_date: string | null
  days_left: number
  available: boolean
  created_at: string
}

export interface WalletSummary {
  /** Ticket value the member can use right now. */
  ticketValue: number
  /** Credit from a recent missed event that appears the morning after it. */
  upcoming: number
  credits: TicketCredit[]
  creditDays: number
  transactions: WalletTransaction[]
}

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

export type CreditCheckoutResult =
  | { status: 'paid'; references: string[]; total: number; creditUsed: number }
  | {
      status: 'mpesa'
      checkoutRequestId: string
      customerMessage?: string
      total: number
      creditUsed: number
      mpesaAmount: number
    }

export interface PlanInstallment {
  id: string
  seq: number
  amount: number
  due_at: string
  paid_at: string | null
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
  deposit_amount: number | null
  /** Everything must be paid by this time, or the seat is released and what was paid becomes ticket value. */
  deadline_at: string | null
  installment_count: number
  status: 'active' | 'completed' | 'cancelled' | 'expired' | 'moved'
  created_at: string
  completed_at: string | null
  /** An M-Pesa prompt for this plan was sent in the last few minutes and hasn't been answered yet. */
  payment_in_progress: boolean
  installments: PlanInstallment[]
}

export interface ScheduleItem {
  seq: number
  amount: number
  due_at: string
}

export interface PlanPreview {
  deposit: number
  deadline: string
  remaining: number
  depositPct: number
  deadlineDays: number
  schedule: ScheduleItem[]
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

export const getPayableBatches = async (): Promise<PayableBatch[]> => (await api.get('/wallet/payable')).data

/** Pays bookings with ticket value first; any difference is asked for by M-Pesa. */
export const payWithCredit = async (data: {
  purchaseBatchIds: string[]
  useCredit?: boolean
  phone?: string
}): Promise<CreditCheckoutResult> => (await api.post('/wallet/checkout', data)).data

/** `dates` are the member's chosen dates for the payments after the first ('YYYY-MM-DD'). */
export const previewPlanSchedule = async (params: {
  eventId: string
  total: number
  dates?: string[]
}): Promise<PlanPreview> =>
  (
    await api.get('/wallet/plans/preview', {
      params: { eventId: params.eventId, total: params.total, dates: (params.dates ?? []).map(endOfDayIso).join(',') },
    })
  ).data

export const createPlan = async (data: { purchaseBatchId: string; dates?: string[] }): Promise<PaymentPlan> =>
  (await api.post('/wallet/plans', { purchaseBatchId: data.purchaseBatchId, dates: (data.dates ?? []).map(endOfDayIso) }))
    .data

export const getPlans = async (): Promise<PaymentPlan[]> => (await api.get('/wallet/plans')).data

export type PlanPayResult =
  | {
      source: 'credit'
      plan: PaymentPlan
      amount: number
      completed: boolean
      reference: string | null
      checkoutRequestId?: undefined
    }
  | ({ source: 'mpesa'; amount: number } & MpesaStart)

export const payPlan = async (
  planId: string,
  data: { mode: 'next' | 'all'; source: 'credit' | 'mpesa'; phone?: string }
): Promise<PlanPayResult> => (await api.post(`/wallet/plans/${planId}/pay`, data)).data

/** Gives up a part-paid ticket: what was paid becomes ticket value straight away. */
export const releasePlan = async (
  planId: string
): Promise<{ credited: number; expiresAt: string | null; eventTitle: string }> =>
  (await api.post(`/wallet/plans/${planId}/release`)).data

/**
 * Moves a part-paid ticket to a new booking for another event: the old seat is released, what was paid
 * becomes ticket value and pays the new booking (oldest value first). Any difference is asked for by M-Pesa.
 */
export const movePlan = async (
  planId: string,
  data: { purchaseBatchId: string; phone?: string }
): Promise<CreditCheckoutResult & { moved: number; fromEvent: string }> =>
  (await api.post(`/wallet/plans/${planId}/move`, data)).data

export interface PendingMove {
  planId: string
  eventId: string
  eventTitle: string
  amountPaid: number
}

const PENDING_MOVE_KEY = 'trfc_pending_move'

/** Remembers a part-paid ticket the member wants to move while they pick the new event. */
export function setPendingMove(move: PendingMove | null) {
  try {
    if (move) sessionStorage.setItem(PENDING_MOVE_KEY, JSON.stringify(move))
    else sessionStorage.removeItem(PENDING_MOVE_KEY)
  } catch {
    /* storage unavailable */
  }
}

export function getPendingMove(): PendingMove | null {
  try {
    const raw = sessionStorage.getItem(PENDING_MOVE_KEY)
    return raw ? (JSON.parse(raw) as PendingMove) : null
  } catch {
    return null
  }
}

export interface CancelTicketResult {
  credited: number
  cancelledTicketIds: string[]
  eventTitle: string
  noticeStatus: 'cancelled_early' | 'no_show'
  availableFrom: string | null
  expiresAt: string | null
}

export const cancelTicket = async (ticketId: string): Promise<CancelTicketResult> =>
  (await api.post(`/events/tickets/${ticketId}/cancel`)).data

/** A picked payment date counts until 11:59 pm Nairobi that day. */
function endOfDayIso(day: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? `${day}T23:59:00+03:00` : day
}

export function formatCreditDate(value: string | Date): string {
  return new Date(value).toLocaleDateString('en-KE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Nairobi',
  })
}
