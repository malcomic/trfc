import { query } from '../config/db.js'
import { phonesMatch } from './phone.js'
import { activateSignupsByCheckoutId } from './signupActivation.js'

export async function validatePaymentReference(
  orderId?: string,
  ticketId?: string,
  ticketBatchId?: string,
  equipmentHireId?: string,
  phone?: string,
  amount?: number,
  medalBatchId?: string,
  signupId?: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (signupId) {
    const result = await query(
      `SELECT s.amount, s.tier, s.payment_status, u.phone_normalized
       FROM signups s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [signupId]
    )
    if (result.rows.length === 0) {
      return { ok: false, status: 404, error: 'Signup not found' }
    }
    const signup = result.rows[0]
    if (signup.tier === 'free' || Number(signup.amount) <= 0) {
      return { ok: false, status: 400, error: 'This signup does not require payment' }
    }
    if (signup.payment_status === 'paid') {
      return { ok: false, status: 409, error: 'This signup has already been paid' }
    }
    if (phone && signup.phone_normalized && !phonesMatch(phone, signup.phone_normalized)) {
      return { ok: false, status: 403, error: 'Phone number does not match signup' }
    }
    if (amount != null && Math.round(Number(signup.amount)) !== Math.round(amount)) {
      return { ok: false, status: 400, error: 'Amount does not match signup price' }
    }
    return { ok: true }
  }

  if (orderId) {
    const result = await query('SELECT * FROM orders WHERE id = $1', [orderId])
    if (result.rows.length === 0) {
      return { ok: false, status: 404, error: 'Order not found' }
    }
    const order = result.rows[0]
    if (phone && order.phone && !phonesMatch(phone, order.phone)) {
      return { ok: false, status: 403, error: 'Phone number does not match order' }
    }
    if (amount != null && Math.round(Number(order.total_amount)) !== Math.round(amount)) {
      return { ok: false, status: 400, error: 'Amount does not match order total' }
    }
    return { ok: true }
  }

  if (ticketBatchId) {
    const result = await query(
      `SELECT
         t.*,
         COALESCE(t.unit_price, ett.price, e.price) AS price
       FROM tickets t
       JOIN events e ON t.event_id = e.id
       LEFT JOIN event_ticket_types ett ON t.ticket_type_id = ett.id
       WHERE t.purchase_batch_id = $1`,
      [ticketBatchId]
    )
    if (result.rows.length === 0) {
      return { ok: false, status: 404, error: 'Ticket batch not found' }
    }
    const batch = result.rows
    const ticket = batch[0]
    if (phone && ticket.phone && !phonesMatch(phone, ticket.phone)) {
      return { ok: false, status: 403, error: 'Phone number does not match ticket batch' }
    }
    const expectedTotal = Math.round(
      batch.reduce((sum: number, row: { price: number | string }) => sum + Number(row.price), 0)
    )
    if (amount != null && expectedTotal !== Math.round(amount)) {
      return { ok: false, status: 400, error: 'Amount does not match ticket batch total' }
    }
    return { ok: true }
  }

  if (medalBatchId) {
    const result = await query(
      `SELECT p.*, o.price FROM medal_purchases p
       JOIN medal_options o ON p.medal_option_id = o.id
       WHERE p.purchase_batch_id = $1`,
      [medalBatchId]
    )
    if (result.rows.length === 0) {
      return { ok: false, status: 404, error: 'Medal batch not found' }
    }
    const batch = result.rows
    const purchase = batch[0]
    if (phone && purchase.phone && !phonesMatch(phone, purchase.phone)) {
      return { ok: false, status: 403, error: 'Phone number does not match medal batch' }
    }
    const expectedTotal = Math.round(Number(purchase.price) * batch.length)
    if (amount != null && expectedTotal !== Math.round(amount)) {
      return { ok: false, status: 400, error: 'Amount does not match medal batch total' }
    }
    return { ok: true }
  }

  if (ticketId) {
    const result = await query(
      `SELECT
         t.*,
         COALESCE(t.unit_price, ett.price, e.price) AS price
       FROM tickets t
       JOIN events e ON t.event_id = e.id
       LEFT JOIN event_ticket_types ett ON t.ticket_type_id = ett.id
       WHERE t.id = $1`,
      [ticketId]
    )
    if (result.rows.length === 0) {
      return { ok: false, status: 404, error: 'Ticket not found' }
    }
    const ticket = result.rows[0]
    if (phone && ticket.phone && !phonesMatch(phone, ticket.phone)) {
      return { ok: false, status: 403, error: 'Phone number does not match ticket' }
    }
    if (amount != null && Math.round(Number(ticket.price)) !== Math.round(amount)) {
      return { ok: false, status: 400, error: 'Amount does not match ticket price' }
    }
    return { ok: true }
  }

  if (equipmentHireId) {
    const result = await query('SELECT * FROM equipment_hire WHERE id = $1', [equipmentHireId])
    if (result.rows.length === 0) {
      return { ok: false, status: 404, error: 'Equipment hire not found' }
    }
    const hire = result.rows[0]
    if (phone && hire.phone && !phonesMatch(phone, hire.phone)) {
      return { ok: false, status: 403, error: 'Phone number does not match hire record' }
    }
    if (amount != null && Math.round(Number(hire.total_cost)) !== Math.round(amount)) {
      return { ok: false, status: 400, error: 'Amount does not match hire total' }
    }
    return { ok: true }
  }

  return {
    ok: false,
    status: 400,
    error:
      'One of orderId, ticketBatchId, ticketId, equipmentHireId, medalBatchId, or signupId is required',
  }
}

export function isMpesaSuccessCode(code: unknown): boolean {
  return code === 0 || code === '0'
}

export async function markEntitiesPaidByCheckoutId(
  checkoutRequestId: string,
  mpesaReceipt?: string | null
): Promise<number> {
  const orderResult = await query(
    `UPDATE orders
     SET payment_status = 'paid', mpesa_receipt = COALESCE($2, mpesa_receipt)
     WHERE checkout_request_id = $1 AND payment_status = 'pending'`,
    [checkoutRequestId, mpesaReceipt || null]
  )
  const ticketResult = await query(
    `UPDATE tickets
     SET payment_status = 'paid', mpesa_receipt = COALESCE($2, mpesa_receipt)
     WHERE checkout_request_id = $1 AND payment_status = 'pending'`,
    [checkoutRequestId, mpesaReceipt || null]
  )
  const hireResult = await query(
    `UPDATE equipment_hire
     SET payment_status = 'paid', mpesa_receipt = COALESCE($2, mpesa_receipt)
     WHERE checkout_request_id = $1 AND payment_status = 'pending'`,
    [checkoutRequestId, mpesaReceipt || null]
  )
  const medalResult = await query(
    `UPDATE medal_purchases
     SET payment_status = 'paid', mpesa_receipt = COALESCE($2, mpesa_receipt)
     WHERE checkout_request_id = $1 AND payment_status = 'pending'`,
    [checkoutRequestId, mpesaReceipt || null]
  )
  const signupCount = await activateSignupsByCheckoutId(checkoutRequestId, mpesaReceipt || null)

  return (
    (orderResult.rowCount || 0) +
    (ticketResult.rowCount || 0) +
    (hireResult.rowCount || 0) +
    (medalResult.rowCount || 0) +
    signupCount
  )
}

async function markEntitiesFailedByCheckoutId(checkoutRequestId: string) {
  await query(
    `UPDATE orders SET payment_status = 'failed' WHERE checkout_request_id = $1 AND payment_status = 'pending'`,
    [checkoutRequestId]
  )
  await query(
    `UPDATE tickets SET payment_status = 'failed' WHERE checkout_request_id = $1 AND payment_status = 'pending'`,
    [checkoutRequestId]
  )
  await query(
    `UPDATE equipment_hire SET payment_status = 'failed' WHERE checkout_request_id = $1 AND payment_status = 'pending'`,
    [checkoutRequestId]
  )
  await query(
    `UPDATE medal_purchases SET payment_status = 'failed' WHERE checkout_request_id = $1 AND payment_status = 'pending'`,
    [checkoutRequestId]
  )
  await query(
    `UPDATE signups SET payment_status = 'failed' WHERE checkout_request_id = $1 AND payment_status = 'pending'`,
    [checkoutRequestId]
  )
}

export { markEntitiesFailedByCheckoutId }
