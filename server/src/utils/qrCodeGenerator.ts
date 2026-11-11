import QRCode from 'qrcode'
import { createHmac, timingSafeEqual } from 'crypto'
import { config } from '../config/env.js'

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

export async function generateTextQRCodeDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { width: 400, margin: 2 })
}

const RECEIPT_SIG_LENGTH = 16

export function signReceipt(orderId: string): string {
  return createHmac('sha256', config.jwtSecret || 'trfc-receipt')
    .update(`receipt:${orderId.toLowerCase()}`)
    .digest('hex')
    .slice(0, RECEIPT_SIG_LENGTH)
}

export function verifyReceiptSignature(orderId: string, sig: unknown): boolean {
  if (typeof sig !== 'string' || sig.length !== RECEIPT_SIG_LENGTH) return false
  const expected = Buffer.from(signReceipt(orderId))
  const given = Buffer.from(sig.toLowerCase())
  return expected.length === given.length && timingSafeEqual(expected, given)
}

export function receiptVerifyUrl(orderId: string): string {
  const base = config.frontendUrl.replace(/\/+$/, '')
  return `${base}/receipt/${encodeURIComponent(orderId)}?t=${signReceipt(orderId)}`
}

export function shortOrderCode(orderId: string): string {
  return String(orderId).slice(0, 8).toUpperCase()
}

export async function generateReceiptQRCodeBuffer(orderId: string): Promise<Buffer> {
  return (await QRCode.toBuffer(receiptVerifyUrl(orderId), {
    type: 'png',
    width: 300,
    margin: 1,
  })) as Buffer
}

export async function generateReceiptQRCodeDataUrl(orderId: string): Promise<string> {
  return QRCode.toDataURL(receiptVerifyUrl(orderId), { width: 300, margin: 1 })
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

export type ParsedScanPayload =
  | { kind: 'ticket'; ticketId: string; eventId?: string }
  | { kind: 'medal'; purchaseId: string }
  | { kind: 'member'; code: string }
  | { kind: 'order'; orderId: string; sig?: string }

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const RECEIPT_URL_RE =
  /\/receipt\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:[/?#]|$)/i

export function normalizeShortCode(raw: string): string | null {
  const cleaned = raw.replace(/[^0-9a-fA-F]/g, '').toUpperCase()
  if (cleaned.length < 8) return null
  return cleaned.slice(0, 8)
}

export function parseScanPayload(raw: string): ParsedScanPayload | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  if (trimmed.toLowerCase().startsWith('medal:')) {
    const parts = trimmed.split(':')
    if (parts.length < 2 || !UUID_RE.test(parts[1])) return null
    return { kind: 'medal', purchaseId: parts[1] }
  }

  if (trimmed.toLowerCase().startsWith('order:')) {
    const orderId = trimmed.slice('order:'.length).trim()
    if (!UUID_RE.test(orderId)) return null
    return { kind: 'order', orderId }
  }

  const receiptMatch = trimmed.match(RECEIPT_URL_RE)
  if (receiptMatch) {
    const sigMatch = trimmed.match(/[?&]t=([0-9a-f]+)/i)
    return { kind: 'order', orderId: receiptMatch[1], sig: sigMatch ? sigMatch[1] : undefined }
  }

  if (trimmed.toLowerCase().startsWith('member:')) {
    const code = trimmed.slice('member:'.length).trim().toUpperCase()
    if (!/^[A-Z0-9]{6,12}$/.test(code)) return null
    return { kind: 'member', code }
  }

  const parts = trimmed.split(':')
  if (parts.length >= 1 && UUID_RE.test(parts[0])) {
    return {
      kind: 'ticket',
      ticketId: parts[0],
      eventId: parts[1] && UUID_RE.test(parts[1]) ? parts[1] : undefined,
    }
  }

  return null
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
  shortOrderCode,
  signReceipt,
  verifyReceiptSignature,
  receiptVerifyUrl,
  generateReceiptQRCodeBuffer,
  generateReceiptQRCodeDataUrl,
  parseScanPayload,
  normalizeShortCode,
}
