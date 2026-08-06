import QRCode from 'qrcode'

interface QRCodeData {
  ticketId: string
  eventId: string
  userId?: string | null
}

export interface MedalQRCodeData {
  purchaseId: string
  tierSlug: string
  distanceKm: number
}

function encodePayload(data: QRCodeData): string {
  const parts = [data.ticketId, data.eventId]
  if (data.userId) {
    parts.push(data.userId)
  }
  return parts.join(':')
}

function encodeMedalPayload(data: MedalQRCodeData): string {
  return `medal:${data.purchaseId}:${data.tierSlug}:${data.distanceKm}`
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

export async function generateMedalQRCodeDataUrl(data: MedalQRCodeData): Promise<string> {
  try {
    return await QRCode.toDataURL(encodeMedalPayload(data), {
      width: 300,
      margin: 1,
    })
  } catch (error: any) {
    console.error('❌ Error generating medal QR data URL:', error.message)
    throw new Error(`Medal QR code generation failed: ${error.message}`)
  }
}

export async function generateMedalQRCodeBuffer(data: MedalQRCodeData): Promise<Buffer> {
  try {
    const qrCodeBuffer = await QRCode.toBuffer(encodeMedalPayload(data), {
      type: 'png',
      width: 300,
      margin: 1,
    })
    return qrCodeBuffer as Buffer
  } catch (error: any) {
    console.error('❌ Error generating medal QR buffer:', error.message)
    throw new Error(`Medal QR code buffer generation failed: ${error.message}`)
  }
}

export function verifyQRCodeData(data: QRCodeData): boolean {
  return !!(data.ticketId && data.eventId)
}

export function shortTicketCode(ticketId: string): string {
  return ticketId.replace(/-/g, '').slice(0, 8).toUpperCase()
}

export function shortMedalCode(purchaseId: string): string {
  return purchaseId.replace(/-/g, '').slice(0, 8).toUpperCase()
}

export default {
  generateQRCodeBase64,
  generateQRCodeDataUrl,
  generateQRCodeBuffer,
  generateMedalQRCodeDataUrl,
  generateMedalQRCodeBuffer,
  verifyQRCodeData,
  shortTicketCode,
  shortMedalCode,
}
