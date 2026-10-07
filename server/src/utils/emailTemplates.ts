import { config } from '../config/env.js'
import { formatEventDate, formatEventTime } from './eventDate.js'

export interface TicketEmailItem {
  ticketId: string
}

export interface TicketBatchEmailData {
  userEmail: string
  userName: string
  eventTitle: string
  eventDate: string
  eventLocation: string
  pricePerTicket: number
  quantity: number
  totalPaid: number
  paymentReference: string
  tickets: TicketEmailItem[]
  confirmationUrl: string
  flashSalesUrl?: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * @deprecated Prefer buildTicketBatchEmailHTML for purchase confirmations.
 * Kept for single-ticket resend compatibility.
 */
export interface EmailTemplateData {
  userEmail: string
  userName: string
  ticketId: string
  eventTitle: string
  eventDate: string
  eventLocation: string
  eventPrice: number
  qrCodeBase64?: string
  paymentReference?: string
  flashSalesUrl?: string
}

export function buildTicketEmailHTML(data: EmailTemplateData): string {
  return buildTicketBatchEmailHTML({
    userEmail: data.userEmail,
    userName: data.userName,
    eventTitle: data.eventTitle,
    eventDate: data.eventDate,
    eventLocation: data.eventLocation,
    pricePerTicket: data.eventPrice,
    quantity: 1,
    totalPaid: data.eventPrice,
    paymentReference: data.paymentReference || data.ticketId,
    tickets: [{ ticketId: data.ticketId }],
    confirmationUrl: `${config.frontendUrl}/ticket-confirmation/${encodeURIComponent(
      data.paymentReference || data.ticketId
    )}?email=${encodeURIComponent(data.userEmail)}`,
    flashSalesUrl: data.flashSalesUrl,
  })
}

export function buildTicketEmailText(data: EmailTemplateData): string {
  return buildTicketBatchEmailText({
    userEmail: data.userEmail,
    userName: data.userName,
    eventTitle: data.eventTitle,
    eventDate: data.eventDate,
    eventLocation: data.eventLocation,
    pricePerTicket: data.eventPrice,
    quantity: 1,
    totalPaid: data.eventPrice,
    paymentReference: data.paymentReference || data.ticketId,
    tickets: [{ ticketId: data.ticketId }],
    confirmationUrl: `${config.frontendUrl}/ticket-confirmation/${encodeURIComponent(
      data.paymentReference || data.ticketId
    )}?email=${encodeURIComponent(data.userEmail)}`,
    flashSalesUrl: data.flashSalesUrl,
  })
}

export function buildTicketBatchEmailHTML(data: TicketBatchEmailData): string {
  const formattedDate = formatEventDate(data.eventDate)
  const formattedTime = formatEventTime(data.eventDate)
  const ticketList = data.tickets
    .map(
      (t, i) =>
        `<li style="margin: 6px 0;">Ticket ${i + 1}: <code style="font-size:12px;">${escapeHtml(t.ticketId)}</code></li>`
    )
    .join('')
  const greetingName =
    data.userName && data.userName !== 'Guest'
      ? escapeHtml(data.userName)
      : escapeHtml(data.userEmail.split('@')[0] || 'there')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket confirmation</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
  <div style="max-width:600px;margin:24px auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#0a0a0a;color:#ffffff;padding:28px 24px;text-align:center;">
      <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#f59e0b;">TRFC</p>
      <h1 style="margin:0;font-size:24px;font-weight:700;">You're confirmed</h1>
      <p style="margin:8px 0 0;font-size:14px;color:#d1d5db;">Thika Road Fitness Community</p>
    </div>

    <div style="padding:28px 24px;">
      <p style="margin:0 0 16px;font-size:16px;">Hi <strong>${greetingName}</strong>,</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#374151;">
        Your ticket purchase was successful. Your entry QR codes are in the PDF attachment${data.quantity > 1 ? 's' : ''} —
        open ${data.quantity > 1 ? 'them' : 'it'} on your phone (or print) for event entry.
        You can also view, download, and print your tickets anytime from the confirmation page below.
      </p>

      <div style="background:#f9fafb;border-left:4px solid #f59e0b;padding:16px;margin:0 0 20px;border-radius:4px;">
        <h2 style="margin:0 0 12px;font-size:16px;">Purchase summary</h2>
        <p style="margin:6px 0;font-size:14px;"><span style="color:#6b7280;">Event:</span> <strong>${escapeHtml(data.eventTitle)}</strong></p>
        <p style="margin:6px 0;font-size:14px;"><span style="color:#6b7280;">Date:</span> <strong>${formattedDate}</strong></p>
        <p style="margin:6px 0;font-size:14px;"><span style="color:#6b7280;">Time:</span> <strong>${formattedTime}</strong></p>
        <p style="margin:6px 0;font-size:14px;"><span style="color:#6b7280;">Venue:</span> <strong>${escapeHtml(data.eventLocation)}</strong></p>
        <p style="margin:6px 0;font-size:14px;"><span style="color:#6b7280;">Tickets:</span> <strong>${data.quantity}</strong> × KES ${data.pricePerTicket.toLocaleString('en-KE')}</p>
        <p style="margin:6px 0;font-size:14px;"><span style="color:#6b7280;">Total paid:</span> <strong>KES ${data.totalPaid.toLocaleString('en-KE')}</strong></p>
        <p style="margin:6px 0;font-size:14px;"><span style="color:#6b7280;">Payment ref:</span> <code style="font-size:12px;">${escapeHtml(data.paymentReference)}</code></p>
      </div>

      <div style="margin:0 0 20px;">
        <h2 style="margin:0 0 8px;font-size:16px;">Your tickets</h2>
        <ul style="margin:0;padding-left:20px;font-size:14px;color:#374151;">
          ${ticketList}
        </ul>
        <p style="margin:12px 0 0;font-size:13px;color:#6b7280;">
          PDF file${data.quantity > 1 ? 's are' : ' is'} attached to this email. Each PDF has a unique QR for entry.
        </p>
      </div>

      <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:6px;padding:14px;margin:0 0 20px;font-size:14px;color:#065f46;">
        <strong>What to bring</strong>
        <ul style="margin:8px 0 0;padding-left:20px;">
          <li>This email’s PDF ticket(s) on your phone, or a printed copy</li>
          <li>Arrive about 15 minutes early</li>
          <li>A valid ID if requested at the gate</li>
        </ul>
      </div>

      <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:14px;margin:0 0 24px;font-size:14px;color:#92400e;">
        <strong>See you there</strong>
        <p style="margin:8px 0 0;">
          ${escapeHtml(data.eventTitle)} — ${formattedDate} at ${formattedTime}, ${escapeHtml(data.eventLocation)}.
        </p>
      </div>

      <p style="text-align:center;margin:0 0 8px;">
        <a href="${escapeHtml(data.confirmationUrl)}"
           style="display:inline-block;background:#f59e0b;color:#111827;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:700;font-size:14px;">
          View your tickets
        </a>
      </p>
      <p style="text-align:center;font-size:12px;color:#6b7280;margin:0 0 16px;">
        Reopen this page anytime with your payment reference and the email used at checkout.
      </p>
      ${data.flashSalesUrl ? `
      <div style="background:#0a0a0a;color:#ffffff;border-radius:6px;padding:18px;margin:8px 0 0;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#f59e0b;">Ticket-holder exclusive</p>
        <p style="margin:0 0 14px;font-size:15px;">Flash deals on official TRFC merch — available for 24 hours.</p>
        <a href="${escapeHtml(data.flashSalesUrl)}"
           style="display:inline-block;background:#f59e0b;color:#111827;padding:10px 22px;text-decoration:none;border-radius:6px;font-weight:700;font-size:14px;">
          See your flash deals
        </a>
      </div>` : ''}
    </div>

    <div style="background:#f9fafb;padding:20px 24px;text-align:center;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb;">
      <p style="margin:0 0 8px;">
        Questions? Email <a href="mailto:${escapeHtml(config.contact.email)}" style="color:#b45309;">${escapeHtml(config.contact.email)}</a>
        or call <a href="tel:${escapeHtml(config.contact.phone.replace(/\s+/g, ''))}" style="color:#b45309;">${escapeHtml(config.contact.phone)}</a>
      </p>
      <p style="margin:0 0 8px;">
        <a href="${escapeHtml(config.frontendUrl)}" style="color:#b45309;">Visit the TRFC website</a>
      </p>
      <p style="margin:12px 0 0;color:#9ca3af;">This is an automated message — please do not reply to this email.</p>
      <p style="margin:8px 0 0;">© ${new Date().getFullYear()} TRFC — Thika Road Fitness Community</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

export function buildTicketBatchEmailText(data: TicketBatchEmailData): string {
  const formattedDate = formatEventDate(data.eventDate)
  const formattedTime = formatEventTime(data.eventDate)
  const greetingName =
    data.userName && data.userName !== 'Guest'
      ? data.userName
      : data.userEmail.split('@')[0] || 'there'
  const ticketLines = data.tickets
    .map((t, i) => `  ${i + 1}. ${t.ticketId}`)
    .join('\n')

  return `
TRFC — You're confirmed
Thika Road Fitness Community

Hi ${greetingName},

Your ticket purchase was successful. Open the attached PDF ticket(s) for your entry QR code(s).
You can also view, download, and print your tickets from the confirmation page.

PURCHASE SUMMARY
Event: ${data.eventTitle}
Date: ${formattedDate}
Time: ${formattedTime}
Venue: ${data.eventLocation}
Tickets: ${data.quantity} x KES ${data.pricePerTicket.toLocaleString('en-KE')}
Total paid: KES ${data.totalPaid.toLocaleString('en-KE')}
Payment ref: ${data.paymentReference}

YOUR TICKETS
${ticketLines}

WHAT TO BRING
- The PDF ticket(s) on your phone, or a printed copy
- Arrive about 15 minutes early
- A valid ID if requested at the gate

SEE YOU THERE
${data.eventTitle} — ${formattedDate} at ${formattedTime}, ${data.eventLocation}

View your tickets: ${data.confirmationUrl}
${data.flashSalesUrl ? `
TICKET-HOLDER FLASH DEALS (available for 24 hours)
${data.flashSalesUrl}
` : ''}
Support: ${config.contact.email} | ${config.contact.phone}
Website: ${config.frontendUrl}

This is an automated message — please do not reply.
© ${new Date().getFullYear()} TRFC — Thika Road Fitness Community
  `.trim()
}

export interface MedalBatchEmailData {
  userEmail: string
  userName: string
  tierName: string
  distanceKm: number
  pricePerMedal: number
  quantity: number
  totalPaid: number
  paymentReference: string
  mpesaReceipt?: string | null
  purchases: { purchaseId: string; shortCode: string }[]
  confirmationUrl: string
}

export function buildMedalBatchEmailHTML(data: MedalBatchEmailData): string {
  const purchaseList = data.purchases
    .map(
      (p, i) =>
        `<li style="margin: 6px 0;">Medal ${i + 1}: <code style="font-size:12px;">${escapeHtml(p.shortCode)}</code></li>`
    )
    .join('')
  const greetingName =
    data.userName && data.userName !== 'Guest'
      ? escapeHtml(data.userName)
      : escapeHtml(data.userEmail.split('@')[0] || 'there')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Medal confirmation</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
  <div style="max-width:600px;margin:24px auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#0a0a0a;color:#ffffff;padding:28px 24px;text-align:center;">
      <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#f59e0b;">TRFC</p>
      <h1 style="margin:0;font-size:24px;font-weight:700;">Medal confirmed</h1>
      <p style="margin:8px 0 0;font-size:14px;color:#d1d5db;">Thika Road Fitness Community</p>
    </div>

    <div style="padding:28px 24px;">
      <p style="margin:0 0 16px;font-size:16px;">Hi <strong>${greetingName}</strong>,</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#374151;">
        Your medal challenge purchase was successful. Your certificate QR code${data.quantity > 1 ? 's are' : ' is'} in the PDF attachment${data.quantity > 1 ? 's' : ''} —
        keep ${data.quantity > 1 ? 'them' : 'it'} as proof of entitlement.
        You can also view and download your certificate${data.quantity > 1 ? 's' : ''} anytime from the confirmation page below.
      </p>

      <div style="background:#f9fafb;border-left:4px solid #f59e0b;padding:16px;margin:0 0 20px;border-radius:4px;">
        <h2 style="margin:0 0 12px;font-size:16px;">Purchase summary</h2>
        <p style="margin:6px 0;font-size:14px;"><span style="color:#6b7280;">Medal:</span> <strong>${escapeHtml(data.tierName)}</strong></p>
        <p style="margin:6px 0;font-size:14px;"><span style="color:#6b7280;">Distance:</span> <strong>${data.distanceKm} km</strong></p>
        <p style="margin:6px 0;font-size:14px;"><span style="color:#6b7280;">Quantity:</span> <strong>${data.quantity}</strong> × KES ${data.pricePerMedal.toLocaleString('en-KE')}</p>
        <p style="margin:6px 0;font-size:14px;"><span style="color:#6b7280;">Total paid:</span> <strong>KES ${data.totalPaid.toLocaleString('en-KE')}</strong></p>
        ${
          data.mpesaReceipt
            ? `<p style="margin:6px 0;font-size:14px;"><span style="color:#6b7280;">M-Pesa receipt:</span> <strong>${escapeHtml(data.mpesaReceipt)}</strong></p>`
            : ''
        }
        <p style="margin:6px 0;font-size:14px;"><span style="color:#6b7280;">Payment ref:</span> <code style="font-size:12px;">${escapeHtml(data.paymentReference)}</code></p>
      </div>

      <div style="margin:0 0 20px;">
        <h2 style="margin:0 0 8px;font-size:16px;">Your medals</h2>
        <ul style="margin:0;padding-left:20px;font-size:14px;color:#374151;">
          ${purchaseList}
        </ul>
        <p style="margin:12px 0 0;font-size:13px;color:#6b7280;">
          PDF certificate${data.quantity > 1 ? 's are' : ' is'} attached. Each PDF has a unique QR for verification.
        </p>
      </div>

      <p style="text-align:center;margin:0 0 8px;">
        <a href="${escapeHtml(data.confirmationUrl)}"
           style="display:inline-block;background:#f59e0b;color:#111827;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:700;font-size:14px;">
          View your medals
        </a>
      </p>
      <p style="text-align:center;font-size:12px;color:#6b7280;margin:0 0 16px;">
        Reopen this page anytime with your payment reference and the email used at checkout.
      </p>
    </div>

    <div style="background:#f9fafb;padding:20px 24px;text-align:center;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb;">
      <p style="margin:0 0 8px;">
        Questions? Email <a href="mailto:${escapeHtml(config.contact.email)}" style="color:#b45309;">${escapeHtml(config.contact.email)}</a>
        or call <a href="tel:${escapeHtml(config.contact.phone.replace(/\s+/g, ''))}" style="color:#b45309;">${escapeHtml(config.contact.phone)}</a>
      </p>
      <p style="margin:0 0 8px;">
        <a href="${escapeHtml(config.frontendUrl)}" style="color:#b45309;">Visit the TRFC website</a>
      </p>
      <p style="margin:12px 0 0;color:#9ca3af;">This is an automated message — please do not reply to this email.</p>
      <p style="margin:8px 0 0;">© ${new Date().getFullYear()} TRFC — Thika Road Fitness Community</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

export function buildMedalBatchEmailText(data: MedalBatchEmailData): string {
  const greetingName =
    data.userName && data.userName !== 'Guest'
      ? data.userName
      : data.userEmail.split('@')[0] || 'there'
  const purchaseLines = data.purchases
    .map((p, i) => `  ${i + 1}. ${p.shortCode}`)
    .join('\n')

  return `
TRFC — Medal confirmed
Thika Road Fitness Community

Hi ${greetingName},

Your medal challenge purchase was successful. Open the attached PDF certificate(s) for your QR code(s).
You can also view and download your certificates from the confirmation page.

PURCHASE SUMMARY
Medal: ${data.tierName}
Distance: ${data.distanceKm} km
Quantity: ${data.quantity} x KES ${data.pricePerMedal.toLocaleString('en-KE')}
Total paid: KES ${data.totalPaid.toLocaleString('en-KE')}
${data.mpesaReceipt ? `M-Pesa receipt: ${data.mpesaReceipt}\n` : ''}Payment ref: ${data.paymentReference}

YOUR MEDALS
${purchaseLines}

View your medals: ${data.confirmationUrl}

Support: ${config.contact.email} | ${config.contact.phone}
Website: ${config.frontendUrl}

This is an automated message — please do not reply.
© ${new Date().getFullYear()} TRFC — Thika Road Fitness Community
  `.trim()
}

export interface OrderEmailItem {
  name: string
  quantity: number
  unitPrice: number
  isFlash: boolean
  size?: string | null
  distance?: string | null
}

function formatItemOptions(item: OrderEmailItem): string {
  return [item.size ? `Size: ${item.size}` : '', item.distance ? `Distance: ${item.distance}` : '']
    .filter(Boolean)
    .join(' · ')
}

export interface OrderEmailData {
  userEmail: string
  orderNumber: string
  orderDate: string
  items: OrderEmailItem[]
  totalPaid: number
  mpesaReceipt?: string | null
  phone?: string | null
  deliveryAddress?: string | null
  confirmationUrl: string
}

function formatKes(value: number): string {
  return `KES ${Math.round(value).toLocaleString('en-KE')}`
}

export function buildOrderConfirmationEmailHTML(data: OrderEmailData): string {
  const subtotal = data.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const deliveryFee = Math.max(0, data.totalPaid - subtotal)
  const greetingName = escapeHtml(data.userEmail.split('@')[0] || 'there')
  const itemRows = data.items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:14px;">
            ${escapeHtml(item.name)}
            ${item.isFlash ? '<span style="display:inline-block;margin-left:6px;padding:2px 6px;background:#fef3c7;color:#92400e;font-size:11px;font-weight:700;border-radius:3px;">Flash price</span>' : ''}
            ${formatItemOptions(item) ? `<div style="font-size:12px;color:#374151;margin-top:2px;">${escapeHtml(formatItemOptions(item))}</div>` : ''}
            <div style="font-size:12px;color:#6b7280;margin-top:2px;">${item.quantity} × ${formatKes(item.unitPrice)}</div>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:14px;text-align:right;white-space:nowrap;">
            ${formatKes(item.unitPrice * item.quantity)}
          </td>
        </tr>`
    )
    .join('')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order confirmation</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
  <div style="max-width:600px;margin:24px auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#0a0a0a;color:#ffffff;padding:28px 24px;text-align:center;">
      <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#f59e0b;">TRFC Shop</p>
      <h1 style="margin:0;font-size:24px;font-weight:700;">Order confirmed</h1>
      <p style="margin:8px 0 0;font-size:14px;color:#d1d5db;">Order #${escapeHtml(data.orderNumber)} · ${escapeHtml(data.orderDate)}</p>
    </div>

    <div style="padding:28px 24px;">
      <p style="margin:0 0 16px;font-size:16px;">Hi <strong>${greetingName}</strong>,</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#374151;">
        Thanks for your purchase — we've received your payment and your order is being prepared.
        It will be delivered within 2-3 business days after payment confirmation.
      </p>

      <h2 style="margin:0 0 8px;font-size:16px;">Your items</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 12px;">
        ${itemRows}
        ${
          deliveryFee > 0
            ? `<tr>
          <td style="padding:10px 0;font-size:14px;color:#6b7280;">Delivery</td>
          <td style="padding:10px 0;font-size:14px;text-align:right;color:#6b7280;">${formatKes(deliveryFee)}</td>
        </tr>`
            : ''
        }
        <tr>
          <td style="padding:12px 0 0;font-size:16px;font-weight:700;">Total paid</td>
          <td style="padding:12px 0 0;font-size:16px;font-weight:700;text-align:right;color:#b45309;">${formatKes(data.totalPaid)}</td>
        </tr>
      </table>

      <div style="background:#f9fafb;border-left:4px solid #f59e0b;padding:16px;margin:20px 0;border-radius:4px;">
        <h2 style="margin:0 0 12px;font-size:16px;">Payment &amp; delivery</h2>
        ${
          data.mpesaReceipt
            ? `<p style="margin:6px 0;font-size:14px;"><span style="color:#6b7280;">M-Pesa receipt:</span> <strong>${escapeHtml(data.mpesaReceipt)}</strong></p>`
            : ''
        }
        ${
          data.phone
            ? `<p style="margin:6px 0;font-size:14px;"><span style="color:#6b7280;">Phone:</span> ${escapeHtml(data.phone)}</p>`
            : ''
        }
        ${
          data.deliveryAddress
            ? `<p style="margin:6px 0;font-size:14px;"><span style="color:#6b7280;">Deliver to:</span> ${escapeHtml(data.deliveryAddress)}</p>`
            : ''
        }
      </div>

      <p style="text-align:center;margin:0 0 8px;">
        <a href="${escapeHtml(data.confirmationUrl)}"
           style="display:inline-block;background:#f59e0b;color:#111827;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:700;font-size:14px;">
          View your order
        </a>
      </p>
      <p style="text-align:center;font-size:12px;color:#6b7280;margin:0 0 16px;">
        You'll be asked for the phone number used at checkout.
      </p>
    </div>

    <div style="background:#f9fafb;padding:20px 24px;text-align:center;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb;">
      <p style="margin:0 0 8px;">
        Questions? Email <a href="mailto:${escapeHtml(config.contact.email)}" style="color:#b45309;">${escapeHtml(config.contact.email)}</a>
        or call <a href="tel:${escapeHtml(config.contact.phone.replace(/\s+/g, ''))}" style="color:#b45309;">${escapeHtml(config.contact.phone)}</a>
      </p>
      <p style="margin:0 0 8px;">
        <a href="${escapeHtml(config.frontendUrl)}" style="color:#b45309;">Visit the TRFC website</a>
      </p>
      <p style="margin:12px 0 0;color:#9ca3af;">This is an automated message — please do not reply to this email.</p>
      <p style="margin:8px 0 0;">© ${new Date().getFullYear()} TRFC — Thika Road Fitness Community</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

export function buildOrderConfirmationEmailText(data: OrderEmailData): string {
  const subtotal = data.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const deliveryFee = Math.max(0, data.totalPaid - subtotal)
  const itemLines = data.items
    .map(
      (item) =>
        `  - ${item.name}${formatItemOptions(item) ? ` [${formatItemOptions(item)}]` : ''}${item.isFlash ? ' (flash price)' : ''}: ${item.quantity} x ${formatKes(item.unitPrice)} = ${formatKes(item.unitPrice * item.quantity)}`
    )
    .join('\n')

  return `
TRFC Shop — Order confirmed
Order #${data.orderNumber} · ${data.orderDate}

Hi ${data.userEmail.split('@')[0] || 'there'},

Thanks for your purchase — we've received your payment and your order is being prepared.
It will be delivered within 2-3 business days after payment confirmation.

YOUR ITEMS
${itemLines}
${deliveryFee > 0 ? `Delivery: ${formatKes(deliveryFee)}\n` : ''}Total paid: ${formatKes(data.totalPaid)}

PAYMENT & DELIVERY
${data.mpesaReceipt ? `M-Pesa receipt: ${data.mpesaReceipt}\n` : ''}${data.phone ? `Phone: ${data.phone}\n` : ''}${data.deliveryAddress ? `Deliver to: ${data.deliveryAddress}\n` : ''}
View your order: ${data.confirmationUrl}

Support: ${config.contact.email} | ${config.contact.phone}
Website: ${config.frontendUrl}

This is an automated message — please do not reply.
© ${new Date().getFullYear()} TRFC — Thika Road Fitness Community
  `.trim()
}

export type FlashReminderStage = 1 | 2 | 3

export interface FlashReminderEmailData {
  salePrice: number
  regularPrice: number
  flashUrl: string
}

export const FLASH_REMINDER_SUBJECTS: Record<FlashReminderStage, string> = {
  1: '2nd Edition Jersey Flash Sale Goes Away After 24hrs',
  2: '12 HOURS LEFT - TRFC 2nd Edition Jersey Flash Sale',
  3: 'FEW HRS LEFT — Ends in 1 Hour',
}

const FLASH_REMINDER_BANNERS: Record<FlashReminderStage, string> = {
  1: '24-hour flash sale',
  2: '12 hours left',
  3: '1 hour left',
}

type FlashBlock =
  | { kind: 'p'; text: string; strong?: boolean }
  | { kind: 'heading'; text: string }
  | { kind: 'divider'; text: string }
  | { kind: 'price'; style: 'list' | 'instead' }
  | { kind: 'extras' }
  | { kind: 'cta' }

function formatKsh(value: number): string {
  return `Ksh ${Math.round(value).toLocaleString('en-KE')}`
}

function flashSaleStory(hoursLeft: number, data: FlashReminderEmailData): FlashBlock[] {
  return [
    { kind: 'p', text: "Heads up — in case you didn't notice, we've opened a 24-hour flash sale for the TRFC 2nd Edition Jersey." },
    { kind: 'p', text: "Because you're registered for our upcoming Community Run, you get first access before we open the jerseys to everyone else." },
    { kind: 'price', style: 'list' },
    { kind: 'p', text: "We've spent the last 4 months working on these designs, because we wanted to come back with something much better than the 1st Edition. And honestly, we think we nailed it." },
    { kind: 'p', text: 'Bad news: we only made 30 pieces of each colour.' },
    { kind: 'p', text: 'Your jersey also comes with:' },
    { kind: 'extras' },
    { kind: 'p', text: `Once the ${hoursLeft} hours are up, your ${formatKsh(data.salePrice)} price is gone.`, strong: true },
    { kind: 'cta' },
  ]
}

function flashReminderContent(
  stage: FlashReminderStage,
  data: FlashReminderEmailData
): { blocks: FlashBlock[]; ps: string } {
  const pickUpPs = 'Once you get your jersey you can pick it up on the community run day.'
  if (stage === 1) return { blocks: flashSaleStory(24, data), ps: pickUpPs }
  if (stage === 2) {
    return {
      blocks: [
        { kind: 'p', text: `12 hours left before the 2nd Edition Jersey price goes back to ${formatKsh(data.regularPrice)}.`, strong: true },
        { kind: 'cta' },
        { kind: 'divider', text: "Here's the email from our flash sale in case you missed it:" },
        { kind: 'heading', text: '12 HOURS LEFT' },
        ...flashSaleStory(12, data),
      ],
      ps: pickUpPs,
    }
  }
  return {
    blocks: [
      { kind: 'p', text: "There's only 1 hour left.", strong: true },
      { kind: 'p', text: 'In 1 hour, the TRFC 2nd Edition Jersey flash sale disappears for good.' },
      { kind: 'p', text: 'Right now, you can get the jersey for:' },
      { kind: 'price', style: 'instead' },
      { kind: 'p', text: 'And you also get:' },
      { kind: 'extras' },
      { kind: 'p', text: "You'll also be among the first people to wear the 2nd Edition before the official launch." },
      { kind: 'p', text: 'This is your last chance.', strong: true },
      { kind: 'cta' },
    ],
    ps: 'This is the last email, message, anything from us about the 2nd Edition Jersey sequence.',
  }
}

function flashBlockHtml(block: FlashBlock, data: FlashReminderEmailData): string {
  const url = escapeHtml(data.flashUrl)
  const sale = escapeHtml(formatKsh(data.salePrice))
  const regular = escapeHtml(formatKsh(data.regularPrice))
  switch (block.kind) {
    case 'p':
      return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${block.strong ? '#111827' : '#374151'};${block.strong ? 'font-weight:700;' : ''}">${escapeHtml(block.text)}</p>`
    case 'heading':
      return `<p style="margin:0 0 16px;font-size:20px;font-weight:800;letter-spacing:0.04em;color:#dc2626;">${escapeHtml(block.text)}</p>`
    case 'divider':
      return `<div style="border-top:1px dashed #d1d5db;margin:28px 0 20px;padding-top:16px;font-size:13px;font-style:italic;color:#6b7280;">${escapeHtml(block.text)}</div>`
    case 'price':
      return block.style === 'list'
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;">
          <tr><td style="padding:16px 20px;">
            <p style="margin:0;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#92400e;">Your price</p>
            <p style="margin:2px 0 10px;font-size:30px;font-weight:800;color:#b45309;">${sale}</p>
            <p style="margin:0;font-size:14px;color:#6b7280;">Regular price: <span style="text-decoration:line-through;">${regular}</span></p>
          </td></tr>
        </table>`
        : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;">
          <tr><td style="padding:16px 20px;text-align:center;">
            <span style="font-size:30px;font-weight:800;color:#b45309;">${sale}</span>
            <span style="font-size:15px;color:#6b7280;"> instead of <span style="text-decoration:line-through;">${regular}</span></span>
          </td></tr>
        </table>`
    case 'extras':
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
          <tr>
            <td width="50%" style="padding:0 6px 0 0;"><div style="background:#0a0a0a;color:#ffffff;border-radius:6px;padding:12px;text-align:center;font-size:14px;font-weight:700;">FREE Medal</div></td>
            <td width="50%" style="padding:0 0 0 6px;"><div style="background:#0a0a0a;color:#ffffff;border-radius:6px;padding:12px;text-align:center;font-size:14px;font-weight:700;">FREE TRFC Gift Bag</div></td>
          </tr>
        </table>`
    case 'cta':
      return `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:8px auto 24px;">
          <tr><td style="background:#f59e0b;border-radius:6px;">
            <a href="${url}" style="display:inline-block;padding:16px 36px;font-size:16px;font-weight:800;letter-spacing:0.08em;color:#111827;text-decoration:none;">GET MY JERSEY</a>
          </td></tr>
        </table>`
  }
}

function flashBlockText(block: FlashBlock, data: FlashReminderEmailData): string {
  switch (block.kind) {
    case 'p':
      return block.text
    case 'heading':
      return `**${block.text}**`
    case 'divider':
      return `---\n${block.text}`
    case 'price':
      return block.style === 'list'
        ? `Your price: ${formatKsh(data.salePrice)}\nRegular price: ${formatKsh(data.regularPrice)}`
        : `${formatKsh(data.salePrice)} instead of ${formatKsh(data.regularPrice)}`
    case 'extras':
      return 'FREE Medal + FREE TRFC Gift Bag'
    case 'cta':
      return `GET MY JERSEY: ${data.flashUrl}`
  }
}

export function buildFlashReminderEmailHTML(stage: FlashReminderStage, data: FlashReminderEmailData): string {
  const { blocks, ps } = flashReminderContent(stage, data)
  const body = blocks.map((block) => flashBlockHtml(block, data)).join('\n')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(FLASH_REMINDER_SUBJECTS[stage])}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
  <div style="max-width:600px;margin:24px auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#0a0a0a;color:#ffffff;padding:28px 24px;text-align:center;">
      <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#f59e0b;">TRFC 2nd Edition Drop</p>
      <h1 style="margin:0;font-size:24px;font-weight:800;">2nd Edition Jersey</h1>
    </div>
    <div style="background:#dc2626;color:#ffffff;padding:10px 24px;text-align:center;font-size:13px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">
      ${escapeHtml(FLASH_REMINDER_BANNERS[stage])}
    </div>

    <div style="padding:28px 24px;">
      ${body}
      <p style="text-align:center;font-size:12px;color:#6b7280;margin:-12px 0 24px;word-break:break-all;">
        Button not working? <a href="${escapeHtml(data.flashUrl)}" style="color:#b45309;">${escapeHtml(data.flashUrl)}</a>
      </p>

      <p style="margin:0 0 4px;font-size:15px;color:#374151;">See you at the run,</p>
      <p style="margin:0;font-size:15px;font-weight:700;">Coach Maurice</p>
      <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">TRFC</p>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#6b7280;"><strong>P.S.</strong> ${escapeHtml(ps)}</p>
    </div>

    <div style="background:#f9fafb;padding:20px 24px;text-align:center;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb;">
      <p style="margin:0 0 8px;">
        You're receiving this because you registered for a TRFC Community Run.
      </p>
      <p style="margin:0 0 8px;">
        Questions? Email <a href="mailto:${escapeHtml(config.contact.email)}" style="color:#b45309;">${escapeHtml(config.contact.email)}</a>
      </p>
      <p style="margin:8px 0 0;">© ${new Date().getFullYear()} TRFC — Thika Road Fitness Community</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

export function buildFlashReminderEmailText(stage: FlashReminderStage, data: FlashReminderEmailData): string {
  const { blocks, ps } = flashReminderContent(stage, data)
  return [
    ...blocks.map((block) => flashBlockText(block, data)),
    'See you at the run,\nCoach Maurice\nTRFC',
    `P.S. ${ps}`,
    `You're receiving this because you registered for a TRFC Community Run.\n© ${new Date().getFullYear()} TRFC — Thika Road Fitness Community`,
  ].join('\n\n')
}

export default {
  buildTicketEmailHTML,
  buildTicketEmailText,
  buildTicketBatchEmailHTML,
  buildTicketBatchEmailText,
  buildMedalBatchEmailHTML,
  buildMedalBatchEmailText,
  buildOrderConfirmationEmailHTML,
  buildOrderConfirmationEmailText,
  buildFlashReminderEmailHTML,
  buildFlashReminderEmailText,
}
