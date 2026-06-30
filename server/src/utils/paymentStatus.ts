import { query } from '../config/db.js'

export interface LocalPaymentStatus {
  payment_status: 'paid' | 'failed' | 'pending'
  mpesa_receipt?: string | null
  source: 'callback' | 'order' | 'ticket' | 'equipment_hire'
}

export async function getLocalPaymentStatus(
  checkoutRequestId: string
): Promise<LocalPaymentStatus | null> {
  const callbackResult = await query(
    `SELECT payment_status, mpesa_receipt_number
     FROM payment_callbacks
     WHERE checkout_request_id = $1`,
    [checkoutRequestId]
  )
  if (callbackResult.rows.length > 0) {
    const row = callbackResult.rows[0]
    return {
      payment_status: row.payment_status === 'paid' ? 'paid' : 'failed',
      mpesa_receipt: row.mpesa_receipt_number,
      source: 'callback',
    }
  }

  const ticketResult = await query(
    `SELECT payment_status, mpesa_receipt
     FROM tickets
     WHERE checkout_request_id = $1
     LIMIT 1`,
    [checkoutRequestId]
  )
  if (ticketResult.rows.length > 0) {
    const row = ticketResult.rows[0]
    return {
      payment_status: row.payment_status,
      mpesa_receipt: row.mpesa_receipt,
      source: 'ticket',
    }
  }

  const orderResult = await query(
    `SELECT payment_status, mpesa_receipt
     FROM orders
     WHERE checkout_request_id = $1
     LIMIT 1`,
    [checkoutRequestId]
  )
  if (orderResult.rows.length > 0) {
    const row = orderResult.rows[0]
    return {
      payment_status: row.payment_status,
      mpesa_receipt: row.mpesa_receipt,
      source: 'order',
    }
  }

  const hireResult = await query(
    `SELECT payment_status, mpesa_receipt
     FROM equipment_hire
     WHERE checkout_request_id = $1
     LIMIT 1`,
    [checkoutRequestId]
  )
  if (hireResult.rows.length > 0) {
    const row = hireResult.rows[0]
    return {
      payment_status: row.payment_status,
      mpesa_receipt: row.mpesa_receipt,
      source: 'equipment_hire',
    }
  }

  return null
}

export function toStatusResponse(
  local: LocalPaymentStatus,
  checkoutRequestId: string
) {
  if (local.payment_status === 'paid') {
    return {
      ResultCode: 0,
      ResultDesc: 'The service request is processed successfully.',
      payment_status: 'paid',
      MpesaReceiptNumber: local.mpesa_receipt,
      CheckoutRequestID: checkoutRequestId,
    }
  }
  if (local.payment_status === 'failed') {
    return {
      ResultCode: 1,
      ResultDesc: 'Payment failed',
      payment_status: 'failed',
      CheckoutRequestID: checkoutRequestId,
    }
  }
  return {
    ResultCode: '1032',
    ResultDesc: 'Request processing',
    payment_status: 'pending',
    CheckoutRequestID: checkoutRequestId,
  }
}
