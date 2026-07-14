import { query } from '../config/db.js'
import { config } from '../config/env.js'
import { sendEmail } from './emailService.js'
import {
  buildTicketBatchEmailHTML,
  buildTicketBatchEmailText,
  buildTicketEmailHTML,
  buildTicketEmailText,
} from './emailTemplates.js'
import { generateQRCodeBase64, generateQRCodeBuffer } from './qrCodeGenerator.js'
import { generateTicketPDF } from './ticketPDFGenerator.js'

function displayName(userName: string | null | undefined, email: string): string {
  if (userName && userName.trim() && userName !== 'Guest') {
    return userName.trim()
  }
  const local = email.split('@')[0]
  return local || 'there'
}

/**
 * Send one confirmation email for all paid tickets under a payment reference.
 */
export async function sendTicketBatchEmail(reference: string): Promise<void> {
  try {
    const result = await query(
      `SELECT
        t.id, t.user_id, t.event_id, t.phone, t.email as ticket_email,
        t.checkout_request_id,
        COALESCE(u.email, t.email) as email,
        COALESCE(NULLIF(TRIM(u.name), ''), NULL) as user_name,
        e.title as event_title, e.event_date, e.location, e.price
       FROM tickets t
       LEFT JOIN users u ON t.user_id = u.id
       JOIN events e ON t.event_id = e.id
       WHERE t.checkout_request_id = $1 AND t.payment_status = 'paid'
       ORDER BY t.created_at ASC`,
      [reference]
    )

    if (result.rows.length === 0) {
      console.error(`⚠️  No paid tickets found for email batch reference: ${reference}`)
      return
    }

    const rows = result.rows
    const email = rows[0].email as string | null
    if (!email) {
      console.error(`⚠️  No email for ticket batch reference ${reference}`)
      return
    }

    const userName = displayName(rows[0].user_name, email)
    const eventTitle = rows[0].event_title as string
    const eventDate = rows[0].event_date as string
    const eventLocation = rows[0].location as string
    const pricePerTicket = parseFloat(rows[0].price)
    const quantity = rows.length
    const totalPaid = Math.round(pricePerTicket * quantity)

    const attachments: Array<{
      filename: string
      content: Buffer
      contentType: string
    }> = []

    for (const ticket of rows) {
      const qrCodeBuffer = await generateQRCodeBuffer({
        ticketId: ticket.id,
        eventId: ticket.event_id,
        userId: ticket.user_id,
      })

      const pdfBuffer = await generateTicketPDF({
        ticketId: ticket.id,
        eventTitle,
        eventDate,
        eventLocation,
        eventPrice: pricePerTicket,
        userName,
        userPhone: ticket.phone,
        qrCodeBuffer,
      })

      attachments.push({
        filename: `ticket-${ticket.id}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      })
    }

    const confirmationUrl = `${config.frontendUrl}/ticket-confirmation/${encodeURIComponent(
      reference
    )}?email=${encodeURIComponent(email)}`

    const templateData = {
      userEmail: email,
      userName,
      eventTitle,
      eventDate,
      eventLocation,
      pricePerTicket,
      quantity,
      totalPaid,
      paymentReference: reference,
      tickets: rows.map((t) => ({ ticketId: t.id as string })),
      confirmationUrl,
    }

    const emailResult = await sendEmail({
      to: email,
      subject:
        quantity > 1
          ? `Your TRFC tickets — ${eventTitle}`
          : `Your TRFC ticket — ${eventTitle}`,
      html: buildTicketBatchEmailHTML(templateData),
      text: buildTicketBatchEmailText(templateData),
      attachments,
    })

    if (emailResult.success) {
      console.log(
        `✅ Ticket batch email sent to ${email} for reference ${reference} (${quantity} ticket(s), messageId=${emailResult.messageId})`
      )
    } else {
      console.error(
        `⚠️  Failed to send ticket batch email to ${email} for reference ${reference}: ${emailResult.error}`
      )
    }
  } catch (error: any) {
    console.error(
      `⚠️  Error in sendTicketBatchEmail for ${reference}: ${error.message}`
    )
  }
}

/**
 * Single-ticket email (e.g. resend). Prefer sendTicketBatchEmail for purchases.
 */
export async function sendTicketEmail(ticketId: string): Promise<void> {
  try {
    const ticketResult = await query(
      `SELECT
        t.id, t.user_id, t.event_id, t.phone, t.email as ticket_email,
        t.checkout_request_id,
        COALESCE(u.email, t.email) as email,
        COALESCE(NULLIF(TRIM(u.name), ''), NULL) as user_name,
        e.title as event_title, e.event_date, e.location, e.price
       FROM tickets t
       LEFT JOIN users u ON t.user_id = u.id
       JOIN events e ON t.event_id = e.id
       WHERE t.id = $1`,
      [ticketId]
    )

    if (ticketResult.rows.length === 0) {
      console.error(`⚠️  Ticket not found for email sending: ${ticketId}`)
      return
    }

    const ticket = ticketResult.rows[0]
    if (!ticket.email) {
      console.error(`⚠️  No email on ticket or user for ticket ${ticketId}`)
      return
    }

    const userName = displayName(ticket.user_name, ticket.email)
    const reference = (ticket.checkout_request_id as string) || ticket.id

    const qrCodeBase64 = await generateQRCodeBase64({
      ticketId: ticket.id,
      eventId: ticket.event_id,
      userId: ticket.user_id,
    })

    const qrCodeBuffer = await generateQRCodeBuffer({
      ticketId: ticket.id,
      eventId: ticket.event_id,
      userId: ticket.user_id,
    })

    const pdfBuffer = await generateTicketPDF({
      ticketId: ticket.id,
      eventTitle: ticket.event_title,
      eventDate: ticket.event_date,
      eventLocation: ticket.location,
      eventPrice: parseFloat(ticket.price),
      userName,
      userPhone: ticket.phone,
      qrCodeBuffer,
    })

    const templateData = {
      userEmail: ticket.email as string,
      userName,
      ticketId: ticket.id as string,
      eventTitle: ticket.event_title as string,
      eventDate: ticket.event_date as string,
      eventLocation: ticket.location as string,
      eventPrice: parseFloat(ticket.price),
      qrCodeBase64,
      paymentReference: reference,
    }

    const emailResult = await sendEmail({
      to: ticket.email,
      subject: `Your TRFC ticket — ${ticket.event_title}`,
      html: buildTicketEmailHTML(templateData),
      text: buildTicketEmailText(templateData),
      attachments: [
        {
          filename: `ticket-${ticket.id}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    })

    if (emailResult.success) {
      console.log(
        `✅ Ticket email sent to ${ticket.email} for ticket ${ticketId} (messageId=${emailResult.messageId})`
      )
    } else {
      console.error(
        `⚠️  Failed to send ticket email to ${ticket.email} for ${ticketId}: ${emailResult.error}`
      )
    }
  } catch (error: any) {
    console.error(`⚠️  Error in sendTicketEmail for ${ticketId}: ${error.message}`)
  }
}
