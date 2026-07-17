import PDFDocument from 'pdfkit'

interface TicketPDFData {
  ticketId: string
  shortCode: string
  eventTitle: string
  eventDate: string
  eventLocation: string
  eventPrice: number
  userName: string
  userPhone: string
  mpesaReceipt?: string | null
  supportEmail?: string
  supportPhone?: string
  qrCodeBuffer: Buffer
}

const COLORS = {
  night: '#0a0a0a',
  ash: '#1a1a1a',
  chalk: '#f5f5f5',
  fog: '#9ca3af',
  accent: '#f59e0b',
  white: '#ffffff',
}

/**
 * Generate a branded landscape A5 PDF ticket
 */
export function generateTicketPDF(data: TicketPDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // A5 landscape: 595.28 x 419.53 (points)
      const doc = new PDFDocument({
        size: [595.28, 419.53],
        margin: 0,
      })

      const chunks: Buffer[] = []
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => {
        resolve(Buffer.concat(chunks))
      })
      doc.on('error', (error: Error) => {
        console.error('❌ Error generating PDF:', error.message)
        reject(error)
      })

      const pageW = 595.28
      const pageH = 419.53
      const pad = 24
      const stubW = 180
      const mainW = pageW - stubW

      // Background
      doc.rect(0, 0, pageW, pageH).fill(COLORS.night)

      // Accent top bar
      doc.rect(0, 0, pageW, 6).fill(COLORS.accent)

      // Stub panel (right)
      doc.rect(mainW, 0, stubW, pageH).fill(COLORS.ash)
      doc
        .moveTo(mainW, 0)
        .lineTo(mainW, pageH)
        .strokeColor(COLORS.accent)
        .lineWidth(2)
        .stroke()

      // --- Main content ---
      doc.fillColor(COLORS.accent).font('Helvetica-Bold').fontSize(10)
      doc.text('TRFC', pad, 28, { characterSpacing: 3 })

      doc.fillColor(COLORS.fog).font('Helvetica').fontSize(8)
      doc.text('THIKA ROAD FITNESS COMMUNITY', pad, 44)

      doc.fillColor(COLORS.chalk).font('Helvetica-Bold').fontSize(18)
      doc.text(data.eventTitle, pad, 72, {
        width: mainW - pad * 2,
        ellipsis: true,
      })

      const eventDate = new Date(data.eventDate)
      const dateStr = eventDate.toLocaleDateString('en-KE', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
      const timeStr = eventDate.toLocaleTimeString('en-KE', {
        hour: '2-digit',
        minute: '2-digit',
      })

      let y = 110
      const labelX = pad
      const valueX = pad + 70

      const row = (label: string, value: string, maxWidth = 220) => {
        doc.fillColor(COLORS.fog).font('Helvetica').fontSize(8)
        doc.text(label.toUpperCase(), labelX, y, { characterSpacing: 1 })
        doc.fillColor(COLORS.chalk).font('Helvetica-Bold').fontSize(10)
        doc.text(value, valueX, y - 1, { width: maxWidth })
        y += 22
      }

      row('Date', dateStr)
      row('Time', timeStr)
      row('Venue', data.eventLocation || 'TBA')
      row('Price', `KES ${Number(data.eventPrice).toLocaleString('en-KE')}`)

      // Attendee block
      y += 8
      doc.rect(pad, y, mainW - pad * 2, 56).fill(COLORS.ash)
      doc.fillColor(COLORS.fog).font('Helvetica').fontSize(8)
      doc.text('ATTENDEE', pad + 12, y + 10, { characterSpacing: 1 })
      doc.fillColor(COLORS.chalk).font('Helvetica-Bold').fontSize(14)
      doc.text(data.userName, pad + 12, y + 24, {
        width: mainW - pad * 2 - 24,
        ellipsis: true,
      })
      if (data.userPhone) {
        doc.fillColor(COLORS.fog).font('Helvetica').fontSize(9)
        doc.text(data.userPhone, pad + 12, y + 42)
      }

      // Footer instructions
      const footerY = pageH - 48
      doc
        .moveTo(pad, footerY)
        .lineTo(mainW - pad, footerY)
        .strokeColor('#333')
        .lineWidth(1)
        .stroke()

      doc.fillColor(COLORS.fog).font('Helvetica').fontSize(7)
      const supportBits = [
        'Present QR at entry',
        'One ticket per person',
        'Bring valid ID if asked',
      ]
      if (data.supportEmail) supportBits.push(data.supportEmail)
      if (data.supportPhone) supportBits.push(data.supportPhone)
      doc.text(supportBits.join('  ·  '), pad, footerY + 10, {
        width: mainW - pad * 2,
        align: 'left',
      })

      if (data.mpesaReceipt) {
        doc.fillColor(COLORS.fog).font('Helvetica').fontSize(7)
        doc.text(`M-Pesa: ${data.mpesaReceipt}`, pad, footerY + 24)
      }

      // --- Stub (QR + codes) ---
      const stubCenterX = mainW + stubW / 2
      doc.fillColor(COLORS.accent).font('Helvetica-Bold').fontSize(9)
      doc.text('ENTRY PASS', mainW, 28, {
        width: stubW,
        align: 'center',
        characterSpacing: 2,
      })

      const qrSize = 120
      const qrX = stubCenterX - qrSize / 2
      const qrY = 55
      doc.rect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12).fill(COLORS.white)
      doc.image(data.qrCodeBuffer, qrX, qrY, { width: qrSize, height: qrSize })

      doc.fillColor(COLORS.fog).font('Helvetica').fontSize(7)
      doc.text('SCAN TO VERIFY', mainW, qrY + qrSize + 14, {
        width: stubW,
        align: 'center',
        characterSpacing: 1,
      })

      doc.fillColor(COLORS.accent).font('Helvetica-Bold').fontSize(16)
      doc.text(data.shortCode, mainW, qrY + qrSize + 30, {
        width: stubW,
        align: 'center',
        characterSpacing: 2,
      })

      doc.fillColor(COLORS.fog).font('Helvetica').fontSize(6)
      doc.text(data.ticketId, mainW + 10, pageH - 36, {
        width: stubW - 20,
        align: 'center',
      })

      doc.end()
    } catch (error: any) {
      console.error('❌ Error in PDF generation:', error.message)
      reject(new Error(`PDF generation failed: ${error.message}`))
    }
  })
}

export default { generateTicketPDF }
