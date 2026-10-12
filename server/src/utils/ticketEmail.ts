import { query } from '../config/db.js'
import { config } from '../config/env.js'
import { sendEmail } from './emailService.js'
import {
  buildTicketBatchEmailHTML,
  buildTicketBatchEmailText,
  buildTicketEmailChangedHTML,
  buildTicketEmailChangedText,
  buildTicketEmailHTML,
  buildTicketEmailText,
} from './emailTemplates.js'
import {
  generateQRCodeBase64,
  generateQRCodeBuffer,
  shortTicketCode,
} from './qrCodeGenerator.js'
import { generateTicketPDF } from './ticketPDFGenerator.js'
import { buildFlashSalesUrl } from './flashAccess.js'
import { maskEmail } from './ticketLookup.js'

export interface TicketEmailResult {
  success: boolean
  error?: string
}

function displayName(
  attendeeName: string | null | undefined,
  userName: string | null | undefined,
  email: string
): string {
  if (attendeeName && attendeeName.trim()) return attendeeName.trim()
  if (userName && userName.trim() && userName !== 'Guest') return userName.trim()
  const local = email.split('@')[0]
  return local || 'there'
}

/**
 * Send one confirmation email for all paid tickets under a payment reference.
 */
export async function sendTicketBatchEmail(reference: string): Promise<TicketEmailResult> {
  try {
    const result = await query(
      `SELECT
        t.id, t.user_id, t.event_id, t.phone, t.email as ticket_email,
        t.attendee_name, t.mpesa_receipt, t.checkout_request_id, t.unit_price,
        COALESCE(NULLIF(TRIM(t.email), ''), u.email) as email,
        COALESCE(NULLIF(TRIM(u.name), ''), NULL) as user_name,
        e.title as event_title, e.event_date, e.location,
        COALESCE(t.unit_price, ett.price, e.price) as price,
        ett.name as ticket_type_name
       FROM tickets t
       LEFT JOIN users u ON t.user_id = u.id
       JOIN events e ON t.event_id = e.id
       LEFT JOIN event_ticket_types ett ON t.ticket_type_id = ett.id
       WHERE t.checkout_request_id = $1 AND t.payment_status = 'paid'
       ORDER BY t.created_at ASC`,
      [reference]
    )

    if (result.rows.length === 0) {
      console.error(`⚠️  No paid tickets found for email batch reference: ${reference}`)
      return { success: false, error: 'No paid tickets found for this payment reference' }
    }

    const rows = result.rows
    const email = rows[0].email as string | null
    if (!email) {
      console.error(`⚠️  No email for ticket batch reference ${reference}`)
      return { success: false, error: 'No email address on this purchase' }
    }

    const userName = displayName(rows[0].attendee_name, rows[0].user_name, email)
    const eventTitle = rows[0].event_title as string
    const eventDate = rows[0].event_date as string
    const eventLocation = rows[0].location as string
    const pricePerTicket = parseFloat(rows[0].price)
    const quantity = rows.length
    const totalPaid = Math.round(pricePerTicket * quantity)
    const mpesaReceipt = (rows[0].mpesa_receipt as string) || null

    const attachments: Array<{
      filename: string
      content: Buffer
      contentType: string
    }> = []

    for (const ticket of rows) {
      const ticketName = displayName(ticket.attendee_name, ticket.user_name, email)
      const qrCodeBuffer = await generateQRCodeBuffer({
        ticketId: ticket.id,
        eventId: ticket.event_id,
        userId: ticket.user_id,
      })

      const pdfBuffer = await generateTicketPDF({
        ticketId: ticket.id,
        shortCode: shortTicketCode(ticket.id),
        eventTitle,
        eventDate,
        eventLocation,
        eventPrice: pricePerTicket,
        userName: ticketName,
        userPhone: ticket.phone,
        mpesaReceipt: ticket.mpesa_receipt || mpesaReceipt,
        supportEmail: config.contact.email,
        supportPhone: config.contact.phone,
        qrCodeBuffer,
      })

      attachments.push({
        filename: `ticket-${shortTicketCode(ticket.id)}.pdf`,
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
      flashSalesUrl: await buildFlashSalesUrl(rows[0].id as string),
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
      return { success: true }
    }
    console.error(
      `⚠️  Failed to send ticket batch email to ${email} for reference ${reference}: ${emailResult.error}`
    )
    return { success: false, error: String(emailResult.error || 'Email delivery failed') }
  } catch (error: any) {
    console.error(
      `⚠️  Error in sendTicketBatchEmail for ${reference}: ${error.message}`
    )
    return { success: false, error: error.message }
  }
}

/**
 * Single-ticket email (e.g. resend). Prefer sendTicketBatchEmail for purchases.
 */
export async function sendTicketEmail(ticketId: string): Promise<TicketEmailResult> {
  try {
    const ticketResult = await query(
      `SELECT
        t.id, t.user_id, t.event_id, t.phone, t.email as ticket_email,
        t.attendee_name, t.mpesa_receipt, t.checkout_request_id, t.unit_price,
        COALESCE(NULLIF(TRIM(t.email), ''), u.email) as email,
        COALESCE(NULLIF(TRIM(u.name), ''), NULL) as user_name,
        e.title as event_title, e.event_date, e.location,
        COALESCE(t.unit_price, ett.price, e.price) as price,
        ett.name as ticket_type_name
       FROM tickets t
       LEFT JOIN users u ON t.user_id = u.id
       JOIN events e ON t.event_id = e.id
       LEFT JOIN event_ticket_types ett ON t.ticket_type_id = ett.id
       WHERE t.id = $1`,
      [ticketId]
    )

    if (ticketResult.rows.length === 0) {
      console.error(`⚠️  Ticket not found for email sending: ${ticketId}`)
      return { success: false, error: 'Ticket not found' }
    }

    const ticket = ticketResult.rows[0]
    if (!ticket.email) {
      console.error(`⚠️  No email on ticket or user for ticket ${ticketId}`)
      return { success: false, error: 'No email address on this ticket' }
    }

    const userName = displayName(ticket.attendee_name, ticket.user_name, ticket.email)
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
      shortCode: shortTicketCode(ticket.id),
      eventTitle: ticket.event_title,
      eventDate: ticket.event_date,
      eventLocation: ticket.location,
      eventPrice: parseFloat(ticket.price),
      userName,
      userPhone: ticket.phone,
      mpesaReceipt: ticket.mpesa_receipt,
      supportEmail: config.contact.email,
      supportPhone: config.contact.phone,
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
      flashSalesUrl: await buildFlashSalesUrl(ticket.id as string),
    }

    const emailResult = await sendEmail({
      to: ticket.email,
      subject: `Your TRFC ticket — ${ticket.event_title}`,
      html: buildTicketEmailHTML(templateData),
      text: buildTicketEmailText(templateData),
      attachments: [
        {
          filename: `ticket-${shortTicketCode(ticket.id)}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    })

    if (emailResult.success) {
      console.log(
        `✅ Ticket email sent to ${ticket.email} for ticket ${ticketId} (messageId=${emailResult.messageId})`
      )
      return { success: true }
    }
    console.error(
      `⚠️  Failed to send ticket email to ${ticket.email} for ${ticketId}: ${emailResult.error}`
    )
    return { success: false, error: String(emailResult.error || 'Email delivery failed') }
  } catch (error: any) {
    console.error(`⚠️  Error in sendTicketEmail for ${ticketId}: ${error.message}`)
    return { success: false, error: error.message }
  }
}

const resendCooldown = new Map<string, number>()
export const RESEND_COOLDOWN_MS = 60_000
export const MAX_GUEST_EMAIL_CHANGES = 3

export type ResendTicketBatchResult =
  | { ok: true; email: string; emailChanged: boolean }
  | { ok: false; reason: 'not_found' | 'cooldown' | 'send_failed'; error: string; retryAfterSec?: number }

export async function countGuestEmailChanges(reference: string): Promise<number> {
  const result = await query(
    `SELECT COUNT(*)::int AS count FROM ticket_email_changes
     WHERE checkout_request_id = $1 AND changed_by_type = 'guest'`,
    [reference]
  )
  return Number(result.rows[0]?.count ?? 0)
}

async function sendTicketEmailChangedNotice(oldEmail: string, newEmail: string, eventTitle: string) {
  const data = { eventTitle, maskedNewEmail: maskEmail(newEmail) || newEmail }
  const result = await sendEmail({
    to: oldEmail,
    subject: `Your TRFC ticket email was changed — ${eventTitle}`,
    html: buildTicketEmailChangedHTML(data),
    text: buildTicketEmailChangedText(data),
  })
  if (!result.success) {
    console.error(`⚠️  Failed to send email-change notice to ${oldEmail}: ${result.error}`)
  }
}

/**
 * Optionally moves a paid purchase to a new email (with an audit row), then resends its tickets.
 * Shared by the guest "Find my tickets" flow and the admin resend action.
 */
export async function resendTicketBatch(params: {
  ref: string
  newEmail?: string
  changedByType: 'guest' | 'admin'
  changedBy?: string | null
}): Promise<ResendTicketBatchResult> {
  const { ref, changedByType, changedBy } = params
  const newEmail = params.newEmail?.trim().toLowerCase() || undefined

  const current = await query(
    `SELECT COALESCE(NULLIF(TRIM(t.email), ''), u.email) AS email, e.title AS event_title
     FROM tickets t
     LEFT JOIN users u ON t.user_id = u.id
     JOIN events e ON t.event_id = e.id
     WHERE t.checkout_request_id = $1 AND t.payment_status = 'paid'
     ORDER BY t.created_at ASC
     LIMIT 1`,
    [ref]
  )
  if (current.rows.length === 0) {
    return { ok: false, reason: 'not_found', error: 'No paid tickets found for this purchase' }
  }

  const now = Date.now()
  const lastSent = resendCooldown.get(ref) || 0
  if (now - lastSent < RESEND_COOLDOWN_MS) {
    const retryAfterSec = Math.ceil((RESEND_COOLDOWN_MS - (now - lastSent)) / 1000)
    return {
      ok: false,
      reason: 'cooldown',
      error: `Please wait ${retryAfterSec} second(s) before resending`,
      retryAfterSec,
    }
  }
  resendCooldown.set(ref, now)

  const oldEmail = (current.rows[0].email as string | null) || null
  const eventTitle = current.rows[0].event_title as string
  const emailChanged = Boolean(newEmail && newEmail !== oldEmail?.toLowerCase())

  if (emailChanged) {
    await query(
      `UPDATE tickets SET email = $1 WHERE checkout_request_id = $2 AND payment_status = 'paid'`,
      [newEmail, ref]
    )
    await query(
      `INSERT INTO ticket_email_changes (checkout_request_id, old_email, new_email, changed_by_type, changed_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [ref, oldEmail, newEmail, changedByType, changedBy || null]
    )
    console.log(
      `✉️  Ticket email for ${ref} changed by ${changedByType}${changedBy ? ` ${changedBy}` : ''}: ${oldEmail ?? '(none)'} -> ${newEmail}`
    )
  }

  const sent = await sendTicketBatchEmail(ref)
  if (!sent.success) {
    return { ok: false, reason: 'send_failed', error: sent.error || 'Email delivery failed' }
  }

  if (emailChanged && oldEmail) {
    await sendTicketEmailChangedNotice(oldEmail, newEmail!, eventTitle).catch((error: Error) => {
      console.error(`⚠️  Error sending email-change notice for ${ref}: ${error.message}`)
    })
  }

  return { ok: true, email: (newEmail || oldEmail) as string, emailChanged }
}
