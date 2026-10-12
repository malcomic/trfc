import { Request, Response } from 'express'
import { query } from '../config/db.js'
import { attachTicketTypesToEvents } from '../utils/eventTicketTypes.js'
import { getAdminProductList } from './productsController.js'
import { isUuid } from '../utils/zones.js'
import { resendTicketBatch, sendTicketEmail } from '../utils/ticketEmail.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function getAdminEvents(_req: Request, res: Response) {
  try {
    const result = await query('SELECT * FROM events ORDER BY event_date ASC')
    const events = await attachTicketTypesToEvents(result.rows, false)
    res.json(events)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch events' })
  }
}

export async function getAdminProducts(_req: Request, res: Response) {
  try {
    res.json(await getAdminProductList())
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch products' })
  }
}

export async function getAdminEquipmentHire(req: Request, res: Response) {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined
    let sql = 'SELECT * FROM equipment_hire'
    const params: string[] = []
    if (status && status !== 'all') {
      sql += ' WHERE payment_status = $1'
      params.push(status)
    }
    sql += ' ORDER BY created_at DESC'
    const result = await query(sql, params)
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch equipment hire records' })
  }
}

export async function getAdminTickets(req: Request, res: Response) {
  try {
    const zoneId = typeof req.query.zoneId === 'string' && isUuid(req.query.zoneId) ? req.query.zoneId : null
    const result = await query(
      `SELECT
         t.*,
         e.title AS event_title,
         e.event_date,
         COALESCE(t.unit_price, ett.price, e.price) AS price,
         ett.name AS ticket_type_name,
         ett.id AS ticket_type_id,
         z.name AS zone_name
       FROM tickets t
       LEFT JOIN events e ON t.event_id = e.id
       LEFT JOIN event_ticket_types ett ON t.ticket_type_id = ett.id
       LEFT JOIN regions z ON z.id = t.zone_id
       WHERE ($1::uuid IS NULL OR t.zone_id = $1::uuid)
       ORDER BY t.created_at DESC`,
      [zoneId]
    )
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch tickets' })
  }
}

export async function resendAdminTicket(req: Request, res: Response) {
  try {
    const { id } = req.params
    if (!isUuid(id)) {
      return res.status(404).json({ error: 'Ticket not found' })
    }

    const rawEmail = (req.body as { email?: unknown } | undefined)?.email
    const newEmail = typeof rawEmail === 'string' && rawEmail.trim() ? rawEmail.trim().toLowerCase() : undefined
    if (newEmail && !EMAIL_PATTERN.test(newEmail)) {
      return res.status(400).json({ error: 'Enter a valid email address' })
    }

    const ticketResult = await query(
      'SELECT id, email, payment_status, checkout_request_id FROM tickets WHERE id = $1',
      [id]
    )
    const ticket = ticketResult.rows[0]
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' })
    }
    if (ticket.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Only paid tickets can be resent' })
    }

    if (ticket.checkout_request_id) {
      const result = await resendTicketBatch({
        ref: ticket.checkout_request_id,
        newEmail,
        changedByType: 'admin',
        changedBy: req.user?.id ?? null,
      })
      if (!result.ok) {
        const status = result.reason === 'not_found' ? 404 : result.reason === 'cooldown' ? 429 : 502
        return res.status(status).json({ error: result.error })
      }
      return res.json({ success: true, email: result.email })
    }

    if (newEmail && newEmail !== ticket.email?.toLowerCase()) {
      await query('UPDATE tickets SET email = $1 WHERE id = $2', [newEmail, id])
      console.log(`✉️  Ticket ${id} email changed by admin ${req.user?.id}: ${ticket.email ?? '(none)'} -> ${newEmail}`)
    }
    const sent = await sendTicketEmail(id)
    if (!sent.success) {
      return res.status(502).json({ error: sent.error || 'Email delivery failed' })
    }
    res.json({ success: true, email: newEmail || ticket.email })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to resend ticket' })
  }
}
