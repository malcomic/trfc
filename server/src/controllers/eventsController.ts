import { Request, Response } from 'express'
import { query } from '../config/db.js'
import {
  attachTicketTypesToEvents,
  getEventTicketTypes,
} from '../utils/eventTicketTypes.js'

export const getEvents = async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM events WHERE is_active = true ORDER BY event_date ASC'
    )
    const events = await attachTicketTypesToEvents(result.rows, true)
    res.json(events)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch events' })
  }
}

export const getEventById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const result = await query('SELECT * FROM events WHERE id = $1', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' })
    }
    const [event] = await attachTicketTypesToEvents(result.rows, true)
    res.json(event)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch event' })
  }
}

export const createEvent = async (req: Request, res: Response) => {
  try {
    const { title, description, location, event_date, image_url } = req.body
    const result = await query(
      `INSERT INTO events (title, description, location, event_date, price, capacity, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, description, location, event_date, 0, null, image_url]
    )
    const [event] = await attachTicketTypesToEvents(result.rows, false)
    res.status(201).json(event)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to create event' })
  }
}

export const updateEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { title, description, location, event_date, image_url, is_active } = req.body
    const result = await query(
      `UPDATE events
       SET title = $1, description = $2, location = $3, event_date = $4,
           image_url = $5, is_active = $6
       WHERE id = $7 RETURNING *`,
      [title, description, location, event_date, image_url, is_active, id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' })
    }
    const [event] = await attachTicketTypesToEvents(result.rows, false)
    res.json(event)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to update event' })
  }
}

export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await query('DELETE FROM events WHERE id = $1', [id])
    res.json({ message: 'Event deleted' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to delete event' })
  }
}

export async function createEventTicketType(req: Request, res: Response) {
  try {
    const { eventId } = req.params
    const { name, description, price, capacity, sort_order, is_active } = req.body

    const trimmedName = String(name || '').trim()
    if (!trimmedName) {
      return res.status(400).json({ error: 'Name is required' })
    }

    const typePrice = Number(price)
    if (!Number.isFinite(typePrice) || typePrice < 0) {
      return res.status(400).json({ error: 'price must be a non-negative number' })
    }

    const eventCheck = await query('SELECT id FROM events WHERE id = $1', [eventId])
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' })
    }

    const cap =
      capacity === null || capacity === undefined || capacity === ''
        ? null
        : Number(capacity)
    if (cap != null && (!Number.isFinite(cap) || cap < 0)) {
      return res.status(400).json({ error: 'capacity must be a non-negative number or null' })
    }

    const order = Number.isFinite(Number(sort_order)) ? Number(sort_order) : 0
    const active = typeof is_active === 'boolean' ? is_active : true

    const result = await query(
      `INSERT INTO event_ticket_types
         (event_id, name, description, price, capacity, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [eventId, trimmedName, description || null, typePrice, cap, order, active]
    )

    const types = await getEventTicketTypes(eventId, false)
    const created = types.find((t) => t.id === result.rows[0].id)
    res.status(201).json(created || result.rows[0])
  } catch (error: unknown) {
    const pgError = error as { code?: string }
    console.error('Error creating ticket type:', error)
    if (pgError?.code === '23505') {
      return res.status(400).json({ error: 'A ticket type with this name already exists for the event' })
    }
    res.status(500).json({ error: 'Failed to create ticket type' })
  }
}

export async function updateEventTicketType(req: Request, res: Response) {
  try {
    const { eventId, typeId } = req.params
    const { name, description, price, capacity, sort_order, is_active } = req.body

    const trimmedName = String(name || '').trim()
    if (!trimmedName) {
      return res.status(400).json({ error: 'Name is required' })
    }

    const typePrice = Number(price)
    if (!Number.isFinite(typePrice) || typePrice < 0) {
      return res.status(400).json({ error: 'price must be a non-negative number' })
    }

    const cap =
      capacity === null || capacity === undefined || capacity === ''
        ? null
        : Number(capacity)
    if (cap != null && (!Number.isFinite(cap) || cap < 0)) {
      return res.status(400).json({ error: 'capacity must be a non-negative number or null' })
    }

    const order = Number.isFinite(Number(sort_order)) ? Number(sort_order) : 0
    const active = typeof is_active === 'boolean' ? is_active : true

    const result = await query(
      `UPDATE event_ticket_types
       SET name = $1, description = $2, price = $3, capacity = $4,
           sort_order = $5, is_active = $6
       WHERE id = $7 AND event_id = $8
       RETURNING *`,
      [trimmedName, description || null, typePrice, cap, order, active, typeId, eventId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket type not found' })
    }

    const types = await getEventTicketTypes(eventId, false)
    const updated = types.find((t) => t.id === typeId)
    res.json(updated || result.rows[0])
  } catch (error: unknown) {
    const pgError = error as { code?: string }
    console.error('Error updating ticket type:', error)
    if (pgError?.code === '23505') {
      return res.status(400).json({ error: 'A ticket type with this name already exists for the event' })
    }
    res.status(500).json({ error: 'Failed to update ticket type' })
  }
}

export async function deleteEventTicketType(req: Request, res: Response) {
  try {
    const { eventId, typeId } = req.params

    const ticketCheck = await query(
      `SELECT COUNT(*)::int AS cnt FROM tickets WHERE ticket_type_id = $1`,
      [typeId]
    )
    if (ticketCheck.rows[0].cnt > 0) {
      await query(
        `UPDATE event_ticket_types SET is_active = false WHERE id = $1 AND event_id = $2`,
        [typeId, eventId]
      )
      return res.json({
        deactivated: true,
        message: 'Ticket type has purchases; deactivated instead of deleted',
      })
    }

    const result = await query(
      `DELETE FROM event_ticket_types WHERE id = $1 AND event_id = $2 RETURNING id`,
      [typeId, eventId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket type not found' })
    }

    res.json({ deleted: true })
  } catch (error) {
    console.error('Error deleting ticket type:', error)
    res.status(500).json({ error: 'Failed to delete ticket type' })
  }
}
