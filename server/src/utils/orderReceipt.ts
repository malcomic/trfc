import { query } from '../config/db.js'
import { config } from '../config/env.js'
import { generateReceiptQRCodeBuffer, shortOrderCode } from './qrCodeGenerator.js'
import { generateReceiptPDF, ReceiptItem, ReceiptPDFData } from './receiptPDFGenerator.js'

export interface OrderReceipt {
  order: Record<string, any>
  receiptNumber: string
  items: ReceiptItem[]
  subtotal: number
  memberDiscount: number
  deliveryFee: number
  totalPaid: number
}

export function formatReceiptDate(value: string | Date): string {
  return new Date(value).toLocaleString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi',
  })
}

export async function loadOrderReceipt(orderId: string): Promise<OrderReceipt | null> {
  const orderResult = await query(
    `SELECT *, to_char(delivery_date, 'YYYY-MM-DD') AS delivery_date FROM orders WHERE id = $1`,
    [orderId]
  )
  const order = orderResult.rows[0]
  if (!order) return null

  const itemsResult = await query(
    `SELECT COALESCE(p.name, 'Product') AS name, oi.quantity, oi.unit_price, oi.flash_sale_id,
            oi.size, oi.distance
     FROM order_items oi
     LEFT JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = $1`,
    [orderId]
  )
  const items: ReceiptItem[] = itemsResult.rows.map((row) => ({
    name: row.name as string,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    size: (row.size as string | null) ?? null,
    distance: (row.distance as string | null) ?? null,
    isFlash: Boolean(row.flash_sale_id),
  }))

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const memberDiscount = Number(order.member_discount_amount ?? 0)
  const totalPaid = Number(order.total_amount)
  const deliveryFee = Math.max(0, Math.round((totalPaid - subtotal + memberDiscount) * 100) / 100)

  return {
    order,
    receiptNumber: shortOrderCode(order.id),
    items,
    subtotal,
    memberDiscount,
    deliveryFee,
    totalPaid,
  }
}

export async function renderOrderReceiptPDF(receipt: OrderReceipt): Promise<Buffer> {
  const { order } = receipt
  const data: ReceiptPDFData = {
    orderId: order.id,
    receiptNumber: receipt.receiptNumber,
    orderDate: formatReceiptDate(order.created_at),
    paidStatus: order.payment_status,
    email: order.email,
    phone: order.phone,
    deliveryAddress: order.delivery_address,
    deliveryDate: order.delivery_date,
    items: receipt.items,
    subtotal: receipt.subtotal,
    memberDiscount: receipt.memberDiscount,
    deliveryFee: receipt.deliveryFee,
    totalPaid: receipt.totalPaid,
    mpesaReceipt: order.mpesa_receipt,
    supportEmail: config.contact.email,
    supportPhone: config.contact.phone,
    qrCodeBuffer: await generateReceiptQRCodeBuffer(order.id),
  }
  return generateReceiptPDF(data)
}

/** Loads a paid order and renders its receipt; returns null when the order is missing or unpaid. */
export async function buildOrderReceipt(orderId: string): Promise<{ receipt: OrderReceipt; pdf: Buffer } | null> {
  const receipt = await loadOrderReceipt(orderId)
  if (!receipt || receipt.order.payment_status !== 'paid') return null
  return { receipt, pdf: await renderOrderReceiptPDF(receipt) }
}

export function receiptFilename(receiptNumber: string): string {
  return `TRFC-receipt-${receiptNumber}.pdf`
}

function maskReceiptCode(code: string | null | undefined): string | null {
  if (!code) return null
  if (code.length <= 4) return code
  return `${'*'.repeat(code.length - 4)}${code.slice(-4)}`
}

/** Public, redacted view of a receipt for the QR verification page. */
export function publicReceiptView(receipt: OrderReceipt) {
  const { order } = receipt
  return {
    receipt_number: receipt.receiptNumber,
    created_at: order.created_at,
    payment_status: order.payment_status,
    items: receipt.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      size: item.size ?? null,
      distance: item.distance ?? null,
    })),
    subtotal: receipt.subtotal,
    member_discount: receipt.memberDiscount,
    delivery_fee: receipt.deliveryFee,
    total_amount: receipt.totalPaid,
    mpesa_receipt: maskReceiptCode(order.mpesa_receipt),
    collected_at: order.collected_at ?? null,
  }
}
