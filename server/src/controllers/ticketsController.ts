import { Request, Response } from 'express'
import { query } from '../config/db.js'

export async function buyTicket(req: Request, res: Response) {
  try {
    const { eventId, quantity, phone } = req.body
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!eventId || !quantity || !phone) {
      return res
        .status(400)
        .json({ error: 'eventId, quantity, and phone are required' })
    }

    if (quantity <= 0 || quantity > 100) {
      return res
        .status(400)
        .json({ error: 'Quantity must be between 1 and 100' })
    }

    const eventResult = await query('SELECT * FROM events WHERE id = $1', [
      eventId,
    ])

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' })
    }

    const event = eventResult.rows[0]

    const ticketIds: string[] = []
    for (let i = 0; i < quantity; i++) {
      const ticketResult = await query(
        'INSERT INTO tickets (user_id, event_id, phone, payment_status) VALUES ($1, $2, $3, $4) RETURNING *',
        [userId, eventId, phone, 'pending']
      )
      ticketIds.push(ticketResult.rows[0].id)
    }

    res.status(201).json({
      ticketIds,
      quantity,
      eventTitle: event.title,
      eventDate: event.event_date,
      pricePerTicket: event.price,
      totalPrice: parseFloat(event.price) * quantity,
    })
  } catch (error) {
    console.error('Error buying ticket:', error)
    res.status(500).json({ error: 'Failed to create tickets' })
  }
}

export async function getUserTickets(req: Request, res: Response) {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const result = await query(
      `SELECT
        t.id, t.user_id, t.event_id, t.payment_status, t.mpesa_receipt,
        t.checkout_request_id, t.created_at,
        e.title as event_title, e.event_date, e.price, e.location
       FROM tickets t
       JOIN events e ON t.event_id = e.id
       WHERE t.user_id = $1
       ORDER BY t.created_at DESC`,
      [userId]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching user tickets:', error)
    res.status(500).json({ error: 'Failed to fetch tickets' })
  }
}

export async function getTicketById(req: Request, res: Response) {
  try {
    const { id } = req.params
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const result = await query(
      `SELECT
        t.id, t.user_id, t.event_id, t.payment_status, t.mpesa_receipt,
        t.checkout_request_id, t.created_at,
        e.title as event_title, e.event_date, e.price, e.location, e.description
       FROM tickets t
       JOIN events e ON t.event_id = e.id
       WHERE t.id = $1 AND t.user_id = $2`,
      [id, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching ticket:', error)
    res.status(500).json({ error: 'Failed to fetch ticket' })
  }
}

export async function updateTicketPaymentStatus(
  req: Request,
  res: Response
) {
  try {
    const { ticketId } = req.params
    const { paymentStatus, mpesaReceipt } = req.body

    if (!paymentStatus) {
      return res.status(400).json({ error: 'paymentStatus is required' })
    }

    const result = await query(
      'UPDATE tickets SET payment_status = $1, mpesa_receipt = $2 WHERE id = $3 RETURNING *',
      [paymentStatus, mpesaReceipt || null, ticketId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error updating ticket payment status:', error)
    res.status(500).json({ error: 'Failed to update ticket' })
  }
}
