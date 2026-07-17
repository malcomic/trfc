import QRCode from 'qrcode'

interface QRCodeData {
  ticketId: string
  eventId: string
  userId?: string | null
}

function encodePayload(data: QRCodeData): string {
  const parts = [data.ticketId, data.eventId]
  if (data.userId) {
    parts.push(data.userId)
  }
  return parts.join(':')
}

/**
 * Generate QR code as base64 string (raw base64, no data-URL prefix)
 */
export async function generateQRCodeBase64(data: QRCodeData): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(encodePayload(data), {
      width: 300,
      margin: 1,
    })
    const base64 = qrCodeDataUrl.split(',')[1]
    return base64
  } catch (error: any) {
    console.error('❌ Error generating QR code:', error.message)
    throw new Error(`QR code generation failed: ${error.message}`)
  }
}

/**
 * Generate QR code as a full data URL (for browser display)
 */
export async function generateQRCodeDataUrl(data: QRCodeData): Promise<string> {
  try {
    return await QRCode.toDataURL(encodePayload(data), {
      width: 300,
      margin: 1,
    })
  } catch (error: any) {
    console.error('❌ Error generating QR code data URL:', error.message)
    throw new Error(`QR code generation failed: ${error.message}`)
  }
}

/**
 * Generate QR code as PNG buffer (for PDF embedding)
 */
export async function generateQRCodeBuffer(data: QRCodeData): Promise<Buffer> {
  try {
    const qrCodeBuffer = await QRCode.toBuffer(encodePayload(data), {
      type: 'png',
      width: 300,
      margin: 1,
    })
    return qrCodeBuffer as Buffer
  } catch (error: any) {
    console.error('❌ Error generating QR code buffer:', error.message)
    throw new Error(`QR code buffer generation failed: ${error.message}`)
  }
}

export function verifyQRCodeData(data: QRCodeData): boolean {
  return !!(data.ticketId && data.eventId)
}

export function shortTicketCode(ticketId: string): string {
  return ticketId.replace(/-/g, '').slice(0, 8).toUpperCase()
}

export default {
  generateQRCodeBase64,
  generateQRCodeDataUrl,
  generateQRCodeBuffer,
  verifyQRCodeData,
  shortTicketCode,
}
