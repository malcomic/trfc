import { query } from '../config/db.js'
import { phonesMatch } from './phone.js'

export async function validatePaymentReference(
  orderId?: string,
  ticketId?: string,
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
      // For batch tickets, amount may be total - skip strict match for multi-ticket batches
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

  return { ok: false, status: 400, error: 'One of orderId, ticketId, or equipmentHireId is required' }
}
