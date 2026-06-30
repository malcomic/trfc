interface EmailTemplateData {
  userEmail: string
  userName: string
  ticketId: string
  eventTitle: string
  eventDate: string
  eventLocation: string
  eventPrice: number
  qrCodeBase64?: string
}

/**
 * Build professional HTML email template for ticket confirmation
 */
export function buildTicketEmailHTML(data: EmailTemplateData): string {
  const formattedDate = new Date(data.eventDate).toLocaleDateString('en-KE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const formattedTime = new Date(data.eventDate).toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const qrCodeImg = data.qrCodeBase64
    ? `<img src="data:image/png;base64,${data.qrCodeBase64}" alt="QR Code" style="width: 150px; height: 150px; margin: 20px auto;" />`
    : ''

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f9fafb;
      margin: 0;
      padding: 0;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .header p {
      margin: 5px 0 0 0;
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      padding: 30px 20px;
    }
    .greeting {
      font-size: 16px;
      margin-bottom: 20px;
      color: #333;
    }
    .ticket-details {
      background-color: #f3f4f6;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .ticket-details h2 {
      margin: 0 0 15px 0;
      font-size: 18px;
      color: #333;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
      font-size: 14px;
    }
    .detail-label {
      color: #666;
      font-weight: 500;
    }
    .detail-value {
      color: #333;
      font-weight: 600;
    }
    .qr-code-section {
      text-align: center;
      margin: 30px 0;
      padding: 20px;
      background-color: #f9fafb;
      border-radius: 8px;
    }
    .qr-code-section p {
      margin: 10px 0;
      font-size: 13px;
      color: #666;
    }
    .download-button {
      display: inline-block;
      background-color: #667eea;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
      cursor: pointer;
    }
    .download-button:hover {
      background-color: #5568d3;
    }
    .instructions {
      background-color: #e0f2fe;
      border: 1px solid #0ea5e9;
      border-radius: 6px;
      padding: 15px;
      margin: 20px 0;
      font-size: 14px;
      color: #0c4a6e;
    }
    .footer {
      background-color: #f3f4f6;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      margin: 5px 0;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    .divider {
      height: 1px;
      background-color: #e5e7eb;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <h1>🎟️ Your Event Ticket</h1>
      <p>TRFC - Thika Road Fitness Community</p>
    </div>

    <!-- Content -->
    <div class="content">
      <p class="greeting">Hi <strong>${data.userName}</strong>,</p>

      <p>Great news! Your ticket purchase has been confirmed. Your QR code is ready for event entry.</p>

      <!-- Ticket Details -->
      <div class="ticket-details">
        <h2>Ticket Details</h2>
        <div class="detail-row">
          <span class="detail-label">Ticket ID:</span>
          <span class="detail-value">${data.ticketId}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Event:</span>
          <span class="detail-value">${data.eventTitle}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date:</span>
          <span class="detail-value">${formattedDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time:</span>
          <span class="detail-value">${formattedTime}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Location:</span>
          <span class="detail-value">${data.eventLocation}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Price:</span>
          <span class="detail-value">KES ${data.eventPrice.toFixed(2)}</span>
        </div>
      </div>

      <!-- QR Code -->
      ${
        qrCodeImg
          ? `
      <div class="qr-code-section">
        <p><strong>Scan to enter the event:</strong></p>
        ${qrCodeImg}
        <p>📱 Keep this QR code handy for event entry verification</p>
      </div>
      `
          : ''
      }

      <!-- Download Instructions -->
      <div class="instructions">
        <strong>📥 Download Your Ticket:</strong>
        <p>Visit the link below to download your ticket as a PDF for offline access:</p>
        <p style="text-align: center;">
          <a href="${process.env.FRONTEND_URL || 'https://trfc.com'}/payment-history" class="download-button">
            Download Ticket
          </a>
        </p>
      </div>

      <div class="divider"></div>

      <!-- Important Info -->
      <div class="instructions">
        <strong>⏰ Important Reminders:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Arrive 15 minutes before the event starts</li>
          <li>Bring a valid ID for verification</li>
          <li>Keep your QR code visible on your phone or printed</li>
          <li>One ticket per person only</li>
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>Questions? Contact us at <strong>support@trfc.com</strong> or call <strong>+254 (0) 700 000 000</strong></p>
      <p>
        <a href="${process.env.FRONTEND_URL || 'https://trfc.com'}">Visit TRFC Website</a>
      </p>
      <p>© 2026 TRFC - Thika Road Fitness Community. All rights reserved.</p>
      <p style="margin-top: 15px; color: #999;">
        This is an automated email. Please do not reply to this email.
      </p>
    </div>
  </div>
</body>
</html>
  `
}

/**
 * Build plain text fallback for email clients that don't support HTML
 */
export function buildTicketEmailText(data: EmailTemplateData): string {
  const formattedDate = new Date(data.eventDate).toLocaleDateString('en-KE')
  const formattedTime = new Date(data.eventDate).toLocaleTimeString('en-KE')

  return `
YOUR EVENT TICKET - TRFC

Hi ${data.userName},

Great news! Your ticket purchase has been confirmed.

TICKET DETAILS:
- Ticket ID: ${data.ticketId}
- Event: ${data.eventTitle}
- Date: ${formattedDate}
- Time: ${formattedTime}
- Location: ${data.eventLocation}
- Price: KES ${data.eventPrice.toFixed(2)}

DOWNLOAD YOUR TICKET:
Visit ${process.env.FRONTEND_URL || 'https://trfc.com'}/payment-history to download your ticket as a PDF.

IMPORTANT REMINDERS:
- Arrive 15 minutes before the event starts
- Bring a valid ID for verification
- Keep your QR code visible on your phone or printed
- One ticket per person only

Questions? Contact us at support@trfc.com or call +254 (0) 700 000 000

© 2026 TRFC - Thika Road Fitness Community
  `
}

export default {
  buildTicketEmailHTML,
  buildTicketEmailText,
}
