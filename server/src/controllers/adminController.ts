import { Request, Response } from 'express'
import { query } from '../config/db.js'
import { attachTicketTypesToEvents } from '../utils/eventTicketTypes.js'

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
    const result = await query('SELECT * FROM products ORDER BY created_at DESC')
    res.json(result.rows)
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

export async function getAdminTickets(_req: Request, res: Response) {
  try {
    const result = await query(
      `SELECT
         t.*,
         e.title AS event_title,
         e.event_date,
         COALESCE(t.unit_price, ett.price, e.price) AS price,
         ett.name AS ticket_type_name,
         ett.id AS ticket_type_id
       FROM tickets t
       LEFT JOIN events e ON t.event_id = e.id
       LEFT JOIN event_ticket_types ett ON t.ticket_type_id = ett.id
       ORDER BY t.created_at DESC`
    )
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch tickets' })
  }
}
