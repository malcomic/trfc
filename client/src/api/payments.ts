import api from './index'

export interface PaymentInitiateRequest {
  phone: string
  amount: number
  orderId?: string
  ticketId?: string
  ticketBatchId?: string
  equipmentHireId?: string
  medalBatchId?: string
  signupId?: string
}

export interface PaymentInitiateResponse {
  checkoutRequestId: string
  merchantRequestId: string
  responseCode: string
  customerMessage: string
}

export type WalletTxType =
  | 'credit_added'
  | 'credit_used'
  | 'credit_expired'
  | 'credit_voided'
  | 'ticket_payment_mpesa'
  | 'installment'
  // Older history rows
  | 'topup'
  | 'ticket_payment'
  | 'cancellation_credit'
  | 'plan_expiry_credit'
  | 'adjustment'

export interface PaymentHistoryItem {
  id: string
  type: 'order' | 'ticket' | 'equipment_hire' | 'medal' | 'wallet'
  amount: number | null
  payment_status: string
  mpesa_receipt: string | null
  checkout_request_id: string | null
  created_at: string
  /** Wallet rows only */
  wallet_type?: WalletTxType
  wallet_amount?: number
  note?: string | null
}

export const WALLET_TX_LABELS: Record<WalletTxType, string> = {
  credit_added: 'Ticket value added',
  credit_used: 'Ticket value used',
  credit_expired: 'Ticket value ended',
  credit_voided: 'Ticket value removed',
  ticket_payment_mpesa: 'Tickets paid by M-Pesa',
  installment: 'Part payment for a ticket',
  topup: 'Earlier M-Pesa payment',
  ticket_payment: 'Tickets paid with ticket value',
  cancellation_credit: 'Ticket value from a cancelled ticket',
  plan_expiry_credit: 'Ticket value from an unfinished payment',
  adjustment: 'Change by TRFC',
}

export function paymentTypeLabel(item: Pick<PaymentHistoryItem, 'type' | 'wallet_type'>): string {
  if (item.type === 'wallet') return item.wallet_type ? WALLET_TX_LABELS[item.wallet_type] : 'Ticket value'
  switch (item.type) {
    case 'order':
      return 'Product Order'
    case 'ticket':
      return 'Event Ticket'
    case 'equipment_hire':
      return 'Equipment Hire'
    case 'medal':
      return 'Medal Challenge'
    default:
      return item.type
  }
}

export async function initiateSTKPush(data: PaymentInitiateRequest) {
  const response = await api.post<PaymentInitiateResponse>(
    '/payments/mpesa/stkpush',
    data
  )
  return response.data
}

export async function initiateTicketPayment(data: {
  phone: string
  amount: number
  ticketBatchId: string
}) {
  return initiateSTKPush({
    ...data,
    ticketBatchId: data.ticketBatchId,
  })
}

export async function checkPaymentStatus(checkoutRequestId: string) {
  const response = await api.get(`/payments/status/${checkoutRequestId}`)
  return response.data
}

export async function pollPaymentStatus(
  checkoutRequestId: string,
  options = { interval: 5000, timeout: 300000 }
): Promise<any> {
  const startTime = Date.now()

  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const status = await checkPaymentStatus(checkoutRequestId)

        if (
          status.ResultCode === '0' ||
          status.ResultCode === 0 ||
          status.payment_status === 'paid'
        ) {
          clearInterval(interval)
          resolve(status)
        }

        if (Date.now() - startTime > options.timeout) {
          clearInterval(interval)
          reject(
            new Error(
              'Payment status check timeout. Please verify payment manually.'
            )
          )
        }
      } catch (error) {
        if (Date.now() - startTime > options.timeout) {
          clearInterval(interval)
          reject(error)
        }
      }
    }, options.interval)
  })
}

export async function getPaymentHistory(): Promise<PaymentHistoryItem[]> {
  const response = await api.get<PaymentHistoryItem[]>('/payments/history')
  return response.data
}

export async function initiateMedalPayment(data: {
  phone: string
  amount: number
  medalBatchId: string
}) {
  return initiateSTKPush({
    ...data,
    medalBatchId: data.medalBatchId,
  })
}

export async function initiateSignupPayment(data: {
  phone: string
  amount: number
  signupId: string
}) {
  return initiateSTKPush(data)
}

export async function initiateEquipmentPayment(data: {
  phone: string
  amount: number
  equipmentHireId: string
}) {
  return initiateSTKPush({
    ...data,
    equipmentHireId: data.equipmentHireId,
  })
}
