import api from './index'

export interface PaymentInitiateRequest {
  phone: string
  amount: number
  orderId?: string
  ticketId?: string
  ticketBatchId?: string
  equipmentHireId?: string
}

export interface PaymentInitiateResponse {
  checkoutRequestId: string
  merchantRequestId: string
  responseCode: string
  customerMessage: string
}

export interface PaymentHistoryItem {
  id: string
  type: 'order' | 'ticket' | 'equipment_hire'
  amount: number | null
  payment_status: string
  mpesa_receipt: string | null
  checkout_request_id: string | null
  created_at: string
}

export async function initiateSTKPush(data: PaymentInitiateRequest) {
  const response = await api.post<PaymentInitiateResponse>(
    '/payments/mpesa/stkpush',
    data
  )
  return response.data
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

export async function initializePaystackPayment(data: {
  email: string
  amount: number
  ticketBatchId: string
}) {
  const response = await api.post<{
    accessCode: string
    reference: string
    authorizationUrl: string
    publicKey: string
  }>('/payments/paystack/initialize', data)
  return response.data
}

export async function verifyPaystackPayment(reference: string) {
  const response = await api.get<{
    status: string
    payment_status: string
    reference: string
    receipt?: string | null
    amount?: number
    channel?: string
    error?: string
  }>(`/payments/paystack/verify/${encodeURIComponent(reference)}`)
  return response.data
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
