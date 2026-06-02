import { query } from '../config/db.js'
import { phonesMatch } from './phone.js'
import { getGrandTotal } from './shipping.js'

export async function validatePaymentReference(
  orderId?: string,
  ticketId?: string,
  ticketBatchId?: string,
  equipmentHireId?: string,
  phone?: string,
  amount?: number
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
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
      `SELECT t.*, e.price FROM tickets t
       JOIN events e ON t.event_id = e.id
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
    const expectedTotal = Math.round(Number(ticket.price) * batch.length)
    if (amount != null && expectedTotal !== Math.round(amount)) {
      return { ok: false, status: 400, error: 'Amount does not match ticket batch total' }
    }
    return { ok: true }
  }

  if (ticketId) {
    const result = await query(
      `SELECT t.*, e.price FROM tickets t
       JOIN events e ON t.event_id = e.id
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

  return { ok: false, status: 400, error: 'One of orderId, ticketBatchId, ticketId, or equipmentHireId is required' }
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
}

export { markEntitiesFailedByCheckoutId }
