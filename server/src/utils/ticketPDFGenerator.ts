import PDFDocument from 'pdfkit'

interface TicketPDFData {
  ticketId: string
  eventTitle: string
  eventDate: string
  eventLocation: string
  eventPrice: number
  userName: string
  userPhone: string
  qrCodeBuffer: Buffer
}

/**
 * Generate PDF ticket as buffer
 * @param data Ticket data including QR code buffer
 * @returns PDF buffer ready for download or email attachment
 */
export function generateTicketPDF(data: TicketPDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A5', // Ticket-sized paper
        margin: 20,
      })

      const chunks: Buffer[] = []

      doc.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })

      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks)
        console.log(
          `✅ PDF ticket generated for ticket ${data.ticketId}`
        )
        resolve(pdfBuffer)
      })

      doc.on('error', (error: Error) => {
        console.error('❌ Error generating PDF:', error.message)
        reject(error)
      })

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('TRFC EVENT TICKET', {
        align: 'center',
      })

      doc.fontSize(10).fillColor('#666').text('Thika Road Fitness Community', {
        align: 'center',
      })

      doc.moveTo(20, doc.y + 5).lineTo(575, doc.y + 5).stroke('#ddd')
      doc.moveDown(1)

      // Ticket ID (Large and prominent)
      doc
        .fontSize(14)
        .fillColor('#000')
        .font('Helvetica-Bold')
        .text('TICKET ID:', { align: 'left' })
      doc
        .fontSize(18)
        .fillColor('#667eea')
        .font('Helvetica-Bold')
        .text(data.ticketId, { align: 'center' })
      doc.moveDown(0.5)

      // Event Details Section
      doc
        .fontSize(11)
        .fillColor('#333')
        .font('Helvetica-Bold')
        .text('EVENT INFORMATION', { underline: true })
      doc.moveDown(0.3)

      // Event Title
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#000')
      doc.text(data.eventTitle, { align: 'left' })
      doc.moveDown(0.2)

      // Details in a grid format
      const detailsY = doc.y
      const lineHeight = 16

      doc.fontSize(9).fillColor('#666').font('Helvetica')

      // Date
      doc.text('Date:', 25, detailsY)
      doc.text(
        new Date(data.eventDate).toLocaleDateString('en-KE', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
        100,
        detailsY
      )

      // Time
      doc.text('Time:', 25, detailsY + lineHeight)
      doc.text(
        new Date(data.eventDate).toLocaleTimeString('en-KE', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        100,
        detailsY + lineHeight
      )

      // Location
      doc.text('Location:', 25, detailsY + lineHeight * 2)
      doc.text(data.eventLocation, 100, detailsY + lineHeight * 2, {
        width: 150,
      })

      // Price
      doc.text('Price:', 25, detailsY + lineHeight * 3)
      doc.font('Helvetica-Bold').text(
        `KES ${data.eventPrice.toFixed(2)}`,
        100,
        detailsY + lineHeight * 3
      )

      doc.moveDown(4)

      // QR Code Section
      doc.fontSize(10).fillColor('#333').font('Helvetica-Bold')
      doc.text('SCAN TO VERIFY:', { align: 'center' })
      doc.moveDown(0.3)

      // Center QR code
      const qrSize = 140
      const qrX = (595 - 2 * 20 - qrSize) / 2 + 20
      doc.image(data.qrCodeBuffer, qrX, doc.y, { width: qrSize, height: qrSize })

      doc.moveDown(8)

      // Attendee Info
      doc
        .fontSize(9)
        .fillColor('#666')
        .font('Helvetica')
        .text('Attendee:', { align: 'left' })
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#000')
        .text(data.userName, { align: 'left' })

      doc
        .fontSize(9)
        .fillColor('#666')
        .font('Helvetica')
        .text('Phone:', { align: 'left' })
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#000')
        .text(data.userPhone, { align: 'left' })

      doc.moveDown(0.5)

      // Footer with instructions
      doc.moveTo(20, doc.y).lineTo(575, doc.y).stroke('#ddd')
      doc.moveDown(0.3)

      doc
        .fontSize(8)
        .fillColor('#999')
        .font('Helvetica')
        .text(
          '📱 Present QR code at entry | 🎫 One ticket per person | ✅ Bring valid ID',
          { align: 'center' }
        )

      doc
        .fontSize(8)
        .fillColor('#999')
        .text('Keep this ticket safe and present it at the event entrance', {
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
