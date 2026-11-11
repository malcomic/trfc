import PDFDocument from 'pdfkit'

export interface ReceiptItem {
  name: string
  quantity: number
  unitPrice: number
  size?: string | null
  distance?: string | null
  isFlash?: boolean
}

export interface ReceiptPDFData {
  orderId: string
  receiptNumber: string
  orderDate: string
  paidStatus: string
  email?: string | null
  phone?: string | null
  deliveryAddress?: string | null
  deliveryDate?: string | null
  items: ReceiptItem[]
  subtotal: number
  memberDiscount: number
  deliveryFee: number
  totalPaid: number
  mpesaReceipt?: string | null
  supportEmail?: string
  supportPhone?: string
  qrCodeBuffer: Buffer
}

const COLORS = {
  night: '#0a0a0a',
  ink: '#111827',
  muted: '#6b7280',
  line: '#e5e7eb',
  panel: '#f9fafb',
  accent: '#f59e0b',
  white: '#ffffff',
}

export function formatKes(amount: number): string {
  return `KES ${Number(amount).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatItemOptions(item: Pick<ReceiptItem, 'size' | 'distance'>): string {
  return [item.size ? `Size: ${item.size}` : '', item.distance ? `Distance: ${item.distance}` : '']
    .filter(Boolean)
    .join(' · ')
}

/**
 * Generate a printable A4 portrait receipt for a paid shop order
 */
export function generateReceiptPDF(data: ReceiptPDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 0 })

      const chunks: Buffer[] = []
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', (error: Error) => {
        console.error('❌ Error generating receipt PDF:', error.message)
        reject(error)
      })

      const pageW = doc.page.width
      const pageH = doc.page.height
      const pad = 48
      const contentW = pageW - pad * 2

      // Header band
      doc.rect(0, 0, pageW, 110).fill(COLORS.night)
      doc.rect(0, 110, pageW, 4).fill(COLORS.accent)

      doc.fillColor(COLORS.accent).font('Helvetica-Bold').fontSize(22)
      doc.text('TRFC', pad, 34, { characterSpacing: 3 })
      doc.fillColor('#9ca3af').font('Helvetica').fontSize(9)
      doc.text('THIKA ROAD FITNESS COMMUNITY', pad, 62, { characterSpacing: 1 })

      doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(18)
      doc.text('RECEIPT', pad, 34, { width: contentW, align: 'right', characterSpacing: 2 })
      doc.fillColor('#d1d5db').font('Helvetica').fontSize(9)
      doc.text(`No. ${data.receiptNumber}`, pad, 60, { width: contentW, align: 'right' })
      doc.text(data.orderDate, pad, 74, { width: contentW, align: 'right' })

      // Billed to + QR
      const qrSize = 120
      const qrX = pageW - pad - qrSize
      let y = 140

      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8)
      doc.text('BILLED TO', pad, y, { characterSpacing: 1 })
      y += 14
      doc.fillColor(COLORS.ink).font('Helvetica').fontSize(10)
      const infoW = qrX - pad - 24
      const infoLines = [
        data.email,
        data.phone,
        data.deliveryAddress ? `Delivery: ${data.deliveryAddress}` : null,
        data.deliveryDate ? `Delivery date: ${data.deliveryDate}` : null,
      ].filter(Boolean) as string[]
      for (const line of infoLines) {
        doc.text(line, pad, y, { width: infoW })
        y = doc.y + 4
      }

      y += 8
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8)
      doc.text('PAYMENT', pad, y, { characterSpacing: 1 })
      y += 14
      doc.fillColor(COLORS.ink).font('Helvetica').fontSize(10)
      doc.text(`Method: M-Pesa`, pad, y, { width: infoW })
      y = doc.y + 4
      if (data.mpesaReceipt) {
        doc.text(`M-Pesa receipt: ${data.mpesaReceipt}`, pad, y, { width: infoW })
        y = doc.y + 4
      }
      doc.font('Helvetica-Bold').fillColor('#047857')
      doc.text(`Status: ${data.paidStatus.toUpperCase()}`, pad, y, { width: infoW })
      y = doc.y + 4

      const qrY = 140
      doc.rect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12).lineWidth(1).strokeColor(COLORS.line).stroke()
      doc.image(data.qrCodeBuffer, qrX, qrY, { width: qrSize, height: qrSize })
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(7)
      doc.text('SCAN TO VERIFY', qrX - 6, qrY + qrSize + 12, { width: qrSize + 12, align: 'center', characterSpacing: 1 })
      doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(12)
      doc.text(data.receiptNumber, qrX - 6, qrY + qrSize + 24, { width: qrSize + 12, align: 'center', characterSpacing: 2 })

      // Items table
      y = Math.max(y, qrY + qrSize + 48) + 16
      const colQty = pad + contentW * 0.56
      const colUnit = pad + contentW * 0.66
      const colTotal = pad + contentW * 0.83
      const colTotalW = pad + contentW - colTotal

      doc.rect(pad, y, contentW, 24).fill(COLORS.panel)
      doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(8)
      doc.text('ITEM', pad + 10, y + 8, { characterSpacing: 1 })
      doc.text('QTY', colQty, y + 8, { width: colUnit - colQty - 8, align: 'right' })
      doc.text('UNIT PRICE', colUnit, y + 8, { width: colTotal - colUnit - 8, align: 'right' })
      doc.text('AMOUNT', colTotal, y + 8, { width: colTotalW - 10, align: 'right' })
      y += 32

      for (const item of data.items) {
        if (y > pageH - 220) {
          doc.addPage({ size: 'A4', margin: 0 })
          y = pad
        }
        const rowTop = y
        doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(10)
        doc.text(item.name, pad + 10, y, { width: colQty - pad - 20 })
        let rowBottom = doc.y
        const options = [formatItemOptions(item), item.isFlash ? 'Flash deal' : ''].filter(Boolean).join(' · ')
        if (options) {
          doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8)
          doc.text(options, pad + 10, rowBottom + 2, { width: colQty - pad - 20 })
          rowBottom = doc.y
        }
        doc.fillColor(COLORS.ink).font('Helvetica').fontSize(10)
        doc.text(String(item.quantity), colQty, rowTop, { width: colUnit - colQty - 8, align: 'right' })
        doc.text(formatKes(item.unitPrice), colUnit, rowTop, { width: colTotal - colUnit - 8, align: 'right' })
        doc.text(formatKes(item.unitPrice * item.quantity), colTotal, rowTop, { width: colTotalW - 10, align: 'right' })
        y = rowBottom + 10
        doc.moveTo(pad, y).lineTo(pad + contentW, y).lineWidth(0.5).strokeColor(COLORS.line).stroke()
        y += 10
      }

      // Totals
      const totalsX = pad + contentW * 0.5
      const totalsW = contentW * 0.5
      const totalRow = (label: string, value: string, bold = false) => {
        doc.fillColor(bold ? COLORS.ink : COLORS.muted).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 12 : 10)
        doc.text(label, totalsX, y, { width: totalsW / 2 })
        doc.fillColor(COLORS.ink)
        doc.text(value, totalsX + totalsW / 2, y, { width: totalsW / 2 - 10, align: 'right' })
        y += bold ? 22 : 18
      }

      y += 4
      totalRow('Subtotal', formatKes(data.subtotal))
      if (data.memberDiscount > 0) totalRow('Member discount', `- ${formatKes(data.memberDiscount)}`)
      totalRow('Delivery', data.deliveryFee > 0 ? formatKes(data.deliveryFee) : 'Free')
      doc.moveTo(totalsX, y).lineTo(pad + contentW, y).lineWidth(1).strokeColor(COLORS.accent).stroke()
      y += 8
      totalRow('Total paid', formatKes(data.totalPaid), true)

      // Footer
      const footerY = pageH - 70
      doc.moveTo(pad, footerY).lineTo(pad + contentW, footerY).lineWidth(0.5).strokeColor(COLORS.line).stroke()
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8)
      const support = [data.supportEmail, data.supportPhone].filter(Boolean).join('  ·  ')
      doc.text('Thank you for shopping with TRFC. Keep this receipt for your records.', pad, footerY + 12, {
        width: contentW,
        align: 'center',
      })
      if (support) doc.text(support, pad, footerY + 26, { width: contentW, align: 'center' })
      doc.fontSize(6).text(data.orderId, pad, footerY + 42, { width: contentW, align: 'center' })

      doc.end()
    } catch (error: any) {
      console.error('❌ Error in receipt PDF generation:', error.message)
      reject(new Error(`Receipt PDF generation failed: ${error.message}`))
    }
  })
}

export default { generateReceiptPDF }
