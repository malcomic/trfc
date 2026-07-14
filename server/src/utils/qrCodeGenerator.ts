import QRCode from 'qrcode'

interface QRCodeData {
  ticketId: string
  eventId: string
  userId: string
}

/**
 * Generate QR code as base64 string
 * QR code encodes: ticketId:eventId:userId for entry verification
 * @param data QR code data (ticketId, eventId, userId)
 * @returns Base64 encoded QR code image
 */
export async function generateQRCodeBase64(data: QRCodeData): Promise<string> {
  try {
    const qrData = `${data.ticketId}:${data.eventId}:${data.userId}`

    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 1,
    })

    // Extract base64 from data URL (remove the "data:image/png;base64," prefix)
    const base64 = qrCodeDataUrl.split(',')[1]

    console.log(
      `✅ QR code generated for ticket ${data.ticketId}`
    )

    return base64
  } catch (error: any) {
    console.error('❌ Error generating QR code:', error.message)
    throw new Error(`QR code generation failed: ${error.message}`)
  }
}

/**
 * Generate QR code as PNG buffer (for PDF embedding)
 * @param data QR code data (ticketId, eventId, userId)
 * @returns PNG buffer
 */
export async function generateQRCodeBuffer(data: QRCodeData): Promise<Buffer> {
  try {
    const qrData = `${data.ticketId}:${data.eventId}:${data.userId}`

    const qrCodeBuffer = await QRCode.toBuffer(qrData, {
      type: 'png',
      width: 300,
      margin: 1,
    })

    console.log(
      `✅ QR code buffer generated for ticket ${data.ticketId}`
    )

    return qrCodeBuffer as Buffer
  } catch (error: any) {
    console.error('❌ Error generating QR code buffer:', error.message)
    throw new Error(`QR code buffer generation failed: ${error.message}`)
  }
}

/**
 * Verify QR code data format
 */
export function verifyQRCodeData(data: QRCodeData): boolean {
  return !!(data.ticketId && data.eventId && data.userId)
}

export default {
  generateQRCodeBase64,
  generateQRCodeBuffer,
  verifyQRCodeData,
}
