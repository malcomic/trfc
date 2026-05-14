import { query } from '../config/db.js'

export async function checkDuplicateCallback(
  checkoutRequestId: string
): Promise<boolean> {
  const result = await query(
    'SELECT id FROM payment_callbacks WHERE checkout_request_id = $1',
    [checkoutRequestId]
  )
  return result.rows.length > 0
}

export async function storeCbResponse(
  checkoutRequestId: string,
  mpesaReceiptNumber: string | null,
  merchantRequestId: string,
  responseBody: any,
  paymentStatus: string
): Promise<void> {
  await query(
    `INSERT INTO payment_callbacks
     (checkout_request_id, mpesa_receipt_number, merchant_request_id, response_body, payment_status)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      checkoutRequestId,
      mpesaReceiptNumber,
      merchantRequestId,
      JSON.stringify(responseBody),
      paymentStatus,
    ]
  )
}

export async function getStoredResponse(
  checkoutRequestId: string
): Promise<any | null> {
  const result = await query(
    'SELECT response_body FROM payment_callbacks WHERE checkout_request_id = $1',
    [checkoutRequestId]
  )
  if (result.rows.length === 0) {
    return null
  }
  return result.rows[0].response_body
}
