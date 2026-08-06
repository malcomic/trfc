import PDFDocument from 'pdfkit'

interface MedalPDFData {
  purchaseId: string
  shortCode: string
  tierName: string
  distanceKm: number
  unitPrice: number
  buyerName: string
  buyerPhone: string
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
 * Generate a branded landscape A5 medal certificate PDF
 */
export function generateMedalPDF(data: MedalPDFData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
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
        console.error('❌ Error generating medal PDF:', error.message)
        reject(error)
      })

      const pageW = 595.28
      const pageH = 419.53
      const pad = 24
      const stubW = 180
      const mainW = pageW - stubW

      doc.rect(0, 0, pageW, pageH).fill(COLORS.night)
      doc.rect(0, 0, pageW, 6).fill(COLORS.accent)

      doc.rect(mainW, 0, stubW, pageH).fill(COLORS.ash)
      doc
        .moveTo(mainW, 0)
        .lineTo(mainW, pageH)
        .strokeColor(COLORS.accent)
        .lineWidth(2)
        .stroke()

      doc.fillColor(COLORS.accent).font('Helvetica-Bold').fontSize(10)
      doc.text('TRFC', pad, 28, { characterSpacing: 3 })

      doc.fillColor(COLORS.fog).font('Helvetica').fontSize(8)
      doc.text('THIKA ROAD FITNESS COMMUNITY', pad, 44)

      doc.fillColor(COLORS.fog).font('Helvetica').fontSize(8)
      doc.text('MEDAL CERTIFICATE', pad, 64, { characterSpacing: 1 })

      doc.fillColor(COLORS.chalk).font('Helvetica-Bold').fontSize(28)
      doc.text(data.tierName.toUpperCase(), pad, 82, {
        width: mainW - pad * 2,
        ellipsis: true,
      })

      doc.fillColor(COLORS.accent).font('Helvetica-Bold').fontSize(14)
      doc.text(`${data.distanceKm} km challenge`, pad, 118)

      let y = 150
      const labelX = pad
      const valueX = pad + 70

      const row = (label: string, value: string, maxWidth = 220) => {
        doc.fillColor(COLORS.fog).font('Helvetica').fontSize(8)
        doc.text(label.toUpperCase(), labelX, y, { characterSpacing: 1 })
        doc.fillColor(COLORS.chalk).font('Helvetica-Bold').fontSize(10)
        doc.text(value, valueX, y - 1, { width: maxWidth })
        y += 22
      }

      row('Price', `KES ${Number(data.unitPrice).toLocaleString('en-KE')}`)
      row('Code', data.shortCode)

      y += 8
      doc.rect(pad, y, mainW - pad * 2, 56).fill(COLORS.ash)
      doc.fillColor(COLORS.fog).font('Helvetica').fontSize(8)
      doc.text('BUYER', pad + 12, y + 10, { characterSpacing: 1 })
      doc.fillColor(COLORS.chalk).font('Helvetica-Bold').fontSize(14)
      doc.text(data.buyerName, pad + 12, y + 24, {
        width: mainW - pad * 2 - 24,
        ellipsis: true,
      })
      if (data.buyerPhone) {
        doc.fillColor(COLORS.fog).font('Helvetica').fontSize(9)
        doc.text(data.buyerPhone, pad + 12, y + 42)
      }

      const footerY = pageH - 48
      doc
        .moveTo(pad, footerY)
        .lineTo(mainW - pad, footerY)
        .strokeColor('#333')
        .lineWidth(1)
        .stroke()

      doc.fillColor(COLORS.fog).font('Helvetica').fontSize(7)
      const supportBits = [
        'Present QR to verify entitlement',
        'Keep this certificate safe',
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

      const stubCenterX = mainW + stubW / 2
      doc.fillColor(COLORS.accent).font('Helvetica-Bold').fontSize(9)
      doc.text('MEDAL PASS', mainW, 28, {
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
      doc.text(data.purchaseId, mainW + 10, pageH - 36, {
        width: stubW - 20,
        align: 'center',
      })

      doc.end()
    } catch (error: any) {
      console.error('❌ Error in medal PDF generation:', error.message)
      reject(new Error(`Medal PDF generation failed: ${error.message}`))
    }
  })
}

export default { generateMedalPDF }
