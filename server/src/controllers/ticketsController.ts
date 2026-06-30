import { Request, Response } from 'express'
import { query } from '../config/db.js'
<<<<<<< HEAD
import { generateQRCodeBuffer } from '../utils/qrCodeGenerator.js'
import { generateTicketPDF } from '../utils/ticketPDFGenerator.js'
=======
import { phonesMatch } from '../utils/phone.js'
import { randomUUID } from 'crypto'
>>>>>>> ae707d8c0a73e5527b29afbb8289c6a4bfcd1793

export async function buyTicket(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId || req.body.eventId
    const { quantity, phone } = req.body
    let userId = req.user?.id ?? null

    if (userId) {
      const userCheck = await query('SELECT id FROM users WHERE id = $1', [userId])
      if (userCheck.rows.length === 0) {
        userId = null
      }
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

    const eventResult = await query('SELECT * FROM events WHERE id = $1', [eventId])

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' })
    }

    const event = eventResult.rows[0]

    if (event.capacity != null) {
      const countResult = await query(
        `SELECT COUNT(*)::int AS cnt FROM tickets
         WHERE event_id = $1 AND payment_status IN ('pending', 'paid')`,
        [eventId]
      )
      const existing = countResult.rows[0].cnt
      if (existing + quantity > event.capacity) {
        return res.status(400).json({
          error: `Only ${Math.max(0, event.capacity - existing)} ticket(s) available`,
        })
      }
    }

    const purchaseBatchId = randomUUID()
    const ticketIds: string[] = []
    for (let i = 0; i < quantity; i++) {
      const ticketResult = await query(
        `INSERT INTO tickets (user_id, event_id, purchase_batch_id, phone, payment_status)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [userId, eventId, purchaseBatchId, phone, 'pending']
      )
      ticketIds.push(ticketResult.rows[0].id)
    }

    res.status(201).json({
      purchaseBatchId,
      ticketIds,
      quantity,
      eventTitle: event.title,
      eventDate: event.event_date,
      pricePerTicket: event.price,
      totalPrice: parseFloat(event.price) * quantity,
    })
  } catch (error: unknown) {
    const pgError = error as { code?: string; message?: string }
    console.error('Error buying ticket:', pgError?.message ?? error)
    if (pgError?.code === '42703') {
      return res.status(500).json({
        error: 'Database schema is out of date. Restart the server to apply migrations.',
      })
    }
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
        t.id, t.user_id, t.event_id, t.purchase_batch_id, t.payment_status, t.mpesa_receipt,
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

export async function getTicketsByCheckoutRequestId(req: Request, res: Response) {
  try {
    const { checkoutRequestId } = req.params
    const phoneQuery = typeof req.query.phone === 'string' ? req.query.phone : undefined

    if (!checkoutRequestId) {
      return res.status(400).json({ error: 'checkoutRequestId is required' })
    }
    if (!phoneQuery) {
      return res.status(400).json({ error: 'phone query parameter is required' })
    }

    const result = await query(
      `SELECT
        t.id, t.phone, t.payment_status, t.checkout_request_id,
        e.title as event_title, e.event_date, e.price
       FROM tickets t
       JOIN events e ON t.event_id = e.id
       WHERE t.checkout_request_id = $1`,
      [checkoutRequestId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tickets not found for this payment reference' })
    }

    const ticket = result.rows[0]
    if (!phonesMatch(phoneQuery, ticket.phone)) {
      return res.status(403).json({ error: 'Phone number does not match ticket purchase' })
    }

    const quantity = result.rows.length
    const totalPrice = Math.round(Number(ticket.price) * quantity)

    res.json({
      event_title: ticket.event_title,
      event_date: ticket.event_date,
      quantity,
      total_price: totalPrice,
      payment_status: ticket.payment_status,
      phone: ticket.phone,
      checkout_request_id: ticket.checkout_request_id,
    })
  } catch (error) {
    console.error('Error fetching tickets by checkout:', error)
    res.status(500).json({ error: 'Failed to fetch ticket details' })
  }
}

export async function getTicketById(req: Request, res: Response) {
  try {
    const { id } = req.params
    const phoneQuery = typeof req.query.phone === 'string' ? req.query.phone : undefined
    const userId = req.user?.id
    const isAdmin = req.user?.role === 'admin'

    const result = await query(
      `SELECT
        t.id, t.user_id, t.event_id, t.purchase_batch_id, t.phone, t.payment_status, t.mpesa_receipt,
        t.checkout_request_id, t.created_at,
        e.title as event_title, e.event_date, e.price, e.location, e.description
       FROM tickets t
       JOIN events e ON t.event_id = e.id
       WHERE t.id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' })
    }

    const ticket = result.rows[0]
    const isOwner = userId && ticket.user_id === userId
    const phoneVerified = phoneQuery && ticket.phone && phonesMatch(phoneQuery, ticket.phone)

    if (!isOwner && !isAdmin && !phoneVerified) {
      return res.json({
        id: ticket.id,
        status: ticket.payment_status,
        total: ticket.price,
        event_title: ticket.event_title,
        event_date: ticket.event_date,
        created_at: ticket.created_at,
      })
    }

    res.json(ticket)
  } catch (error) {
    console.error('Error fetching ticket:', error)
    res.status(500).json({ error: 'Failed to fetch ticket' })
  }
}

export async function updateTicketPaymentStatus(req: Request, res: Response) {
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

export async function downloadTicketPDF(req: Request, res: Response) {
  try {
    const { ticketId } = req.params
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!ticketId) {
      return res.status(400).json({ error: 'Ticket ID is required' })
    }

    // Fetch ticket with user and event details
    const ticketResult = await query(
      `SELECT
        t.id, t.user_id, t.event_id, t.payment_status, t.phone,
        u.name as user_name,
        e.title as event_title, e.event_date, e.location, e.price
       FROM tickets t
       JOIN users u ON t.user_id = u.id
       JOIN events e ON t.event_id = e.id
       WHERE t.id = $1 AND t.user_id = $2`,
      [ticketId, userId]
    )

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' })
    }

    const ticket = ticketResult.rows[0]

    // Only allow download if payment is completed
    if (ticket.payment_status !== 'paid') {
      return res.status(403).json({
        error: 'Ticket is not yet paid. Please complete payment first.',
        status: ticket.payment_status,
      })
    }

    // Generate QR code buffer for PDF
    const qrCodeBuffer = await generateQRCodeBuffer({
      ticketId: ticket.id,
      eventId: ticket.event_id,
      userId: ticket.user_id,
    })

    // Generate PDF
    const pdfBuffer = await generateTicketPDF({
      ticketId: ticket.id,
      eventTitle: ticket.event_title,
      eventDate: ticket.event_date,
      eventLocation: ticket.location,
      eventPrice: parseFloat(ticket.price),
      userName: ticket.user_name,
      userPhone: ticket.phone,
      qrCodeBuffer: qrCodeBuffer,
    })

    // Send PDF as downloadable file
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ticket-${ticketId}.pdf"`
    )
    res.setHeader('Content-Length', pdfBuffer.length)

    res.send(pdfBuffer)
  } catch (error) {
    console.error('Error downloading ticket PDF:', error)
    res.status(500).json({ error: 'Failed to generate ticket PDF' })
  }
}
