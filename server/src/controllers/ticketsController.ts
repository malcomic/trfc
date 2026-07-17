import { Request, Response } from 'express'
import { query } from '../config/db.js'
import { config } from '../config/env.js'
import {
  generateQRCodeBuffer,
  generateQRCodeDataUrl,
  shortTicketCode,
} from '../utils/qrCodeGenerator.js'
import { generateTicketPDF } from '../utils/ticketPDFGenerator.js'
import { phonesMatch } from '../utils/phone.js'
import { randomUUID } from 'crypto'

function resolveAttendeeName(
  attendeeName: string | null | undefined,
  userName: string | null | undefined,
  email: string | null | undefined
): string {
  if (attendeeName && attendeeName.trim()) return attendeeName.trim()
  if (userName && userName.trim() && userName !== 'Guest') return userName.trim()
  if (email) {
    const local = email.split('@')[0]
    if (local) return local
  }
  return 'Guest'
}

export async function buyTicket(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId || req.body.eventId
    const { quantity, phone, email, attendeeName } = req.body
    let userId = req.user?.id ?? null

    if (userId) {
      const userCheck = await query('SELECT id FROM users WHERE id = $1', [userId])
      if (userCheck.rows.length === 0) {
        userId = null
      }
    }

    if (!eventId || !quantity || !email || !phone || !attendeeName) {
      return res.status(400).json({
        error: 'eventId, quantity, email, phone, and attendeeName are required',
      })
    }

    const normalizedName = String(attendeeName).trim()
    if (normalizedName.length < 2 || normalizedName.length > 150) {
      return res.status(400).json({
        error: 'Attendee name must be between 2 and 150 characters',
      })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'A valid email is required' })
    }

    if (!/^254\d{9}$/.test(String(phone))) {
      return res.status(400).json({
        error: 'Invalid phone number format. Expected format: 254XXXXXXXXX',
      })
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
        `INSERT INTO tickets (user_id, event_id, purchase_batch_id, phone, email, attendee_name, payment_provider, payment_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          userId,
          eventId,
          purchaseBatchId,
          phone,
          normalizedEmail,
          normalizedName,
          'mpesa',
          'pending',
        ]
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
      attendeeName: normalizedName,
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
        t.checkout_request_id, t.attendee_name, t.phone, t.email, t.created_at,
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
    const emailQuery =
      typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : undefined

    if (!checkoutRequestId) {
      return res.status(400).json({ error: 'checkoutRequestId is required' })
    }
    if (!phoneQuery && !emailQuery) {
      return res.status(400).json({ error: 'email or phone query parameter is required' })
    }

    const result = await query(
      `SELECT
        t.id, t.user_id, t.event_id, t.phone, t.email, t.attendee_name, t.payment_status,
        t.checkout_request_id, t.mpesa_receipt,
        COALESCE(NULLIF(TRIM(u.name), ''), NULL) as user_name,
        e.title as event_title, e.event_date, e.price, e.location
       FROM tickets t
       LEFT JOIN users u ON t.user_id = u.id
       JOIN events e ON t.event_id = e.id
       WHERE t.checkout_request_id = $1
       ORDER BY t.created_at ASC`,
      [checkoutRequestId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tickets not found for this payment reference' })
    }

    const ticket = result.rows[0]
    const phoneOk = phoneQuery && ticket.phone && phonesMatch(phoneQuery, ticket.phone)
    const emailOk =
      emailQuery && ticket.email && ticket.email.toLowerCase() === emailQuery

    if (!phoneOk && !emailOk) {
      return res.status(403).json({ error: 'Email or phone does not match ticket purchase' })
    }

    const quantity = result.rows.length
    const unitPrice = Number(ticket.price)
    const totalPrice = Math.round(unitPrice * quantity)
    const attendeeName = resolveAttendeeName(
      ticket.attendee_name,
      ticket.user_name,
      ticket.email
    )

    const tickets = await Promise.all(
      result.rows.map(async (row) => {
        const name = resolveAttendeeName(row.attendee_name, row.user_name, row.email)
        let qr_data_url: string | null = null
        if (row.payment_status === 'paid') {
          qr_data_url = await generateQRCodeDataUrl({
            ticketId: row.id,
            eventId: row.event_id,
            userId: row.user_id,
          })
        }
        return {
          id: row.id,
          short_code: shortTicketCode(row.id),
          attendee_name: name,
          payment_status: row.payment_status,
          qr_data_url,
        }
      })
    )

    res.json({
      event_title: ticket.event_title,
      event_date: ticket.event_date,
      location: ticket.location,
      unit_price: unitPrice,
      quantity,
      total_price: totalPrice,
      payment_status: ticket.payment_status,
      phone: ticket.phone,
      email: ticket.email,
      attendee_name: attendeeName,
      mpesa_receipt: ticket.mpesa_receipt,
      checkout_request_id: ticket.checkout_request_id,
      tickets,
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
        t.id, t.user_id, t.event_id, t.purchase_batch_id, t.phone, t.email, t.attendee_name,
        t.payment_status, t.mpesa_receipt, t.checkout_request_id, t.created_at,
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

async function buildTicketPdfBuffer(ticketId: string) {
  const ticketResult = await query(
    `SELECT
      t.id, t.user_id, t.event_id, t.payment_status, t.phone, t.email,
      t.attendee_name, t.mpesa_receipt,
      COALESCE(NULLIF(TRIM(u.name), ''), NULL) as user_name,
      e.title as event_title, e.event_date, e.location, e.price
     FROM tickets t
     LEFT JOIN users u ON t.user_id = u.id
     JOIN events e ON t.event_id = e.id
     WHERE t.id = $1`,
    [ticketId]
  )

  if (ticketResult.rows.length === 0) {
    return null
  }

  const ticket = ticketResult.rows[0]
  if (ticket.payment_status !== 'paid') {
    return { unpaid: true as const, ticket }
  }

  const userName = resolveAttendeeName(
    ticket.attendee_name,
    ticket.user_name,
    ticket.email
  )

  const qrCodeBuffer = await generateQRCodeBuffer({
    ticketId: ticket.id,
    eventId: ticket.event_id,
    userId: ticket.user_id,
  })

  const pdfBuffer = await generateTicketPDF({
    ticketId: ticket.id,
    shortCode: shortTicketCode(ticket.id),
    eventTitle: ticket.event_title,
    eventDate: ticket.event_date,
    eventLocation: ticket.location,
    eventPrice: parseFloat(ticket.price),
    userName,
    userPhone: ticket.phone || '',
    mpesaReceipt: ticket.mpesa_receipt || null,
    supportEmail: config.contact.email,
    supportPhone: config.contact.phone,
    qrCodeBuffer,
  })

  return { unpaid: false as const, ticket, pdfBuffer, userName }
}

export async function downloadTicketPDF(req: Request, res: Response) {
  try {
    const { ticketId } = req.params
    const userId = req.user?.id
    const phoneQuery = typeof req.query.phone === 'string' ? req.query.phone : undefined
    const emailQuery =
      typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : undefined

    if (!ticketId) {
      return res.status(400).json({ error: 'Ticket ID is required' })
    }

    const built = await buildTicketPdfBuffer(ticketId)
    if (!built) {
      return res.status(404).json({ error: 'Ticket not found' })
    }

    const ticket = built.ticket
    const isOwner = userId && ticket.user_id === userId
    const phoneOk = phoneQuery && ticket.phone && phonesMatch(phoneQuery, ticket.phone)
    const emailOk =
      emailQuery && ticket.email && ticket.email.toLowerCase() === emailQuery

    if (!isOwner && !phoneOk && !emailOk) {
      return res.status(403).json({
        error: 'Unauthorized. Sign in or verify with the email/phone used at checkout.',
      })
    }

    if (built.unpaid) {
      return res.status(403).json({
        error: 'Ticket is not yet paid. Please complete payment first.',
        status: ticket.payment_status,
      })
    }

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ticket-${shortTicketCode(ticketId)}.pdf"`
    )
    res.setHeader('Content-Length', built.pdfBuffer!.length)
    res.send(built.pdfBuffer)
  } catch (error) {
    console.error('Error downloading ticket PDF:', error)
    res.status(500).json({ error: 'Failed to generate ticket PDF' })
  }
}
