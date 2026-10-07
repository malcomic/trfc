import { query } from '../config/db.js'
import { config } from '../config/env.js'
import { sendEmail } from './emailService.js'
import {
  buildOrderConfirmationEmailHTML,
  buildOrderConfirmationEmailText,
} from './emailTemplates.js'

async function releaseClaim(orderId: string) {
  await query('UPDATE orders SET confirmation_email_sent_at = NULL WHERE id = $1', [orderId]).catch(
    (error: Error) => console.error(`⚠️  Could not release order email claim for ${orderId}: ${error.message}`)
  )
}

/**
 * Send the shop order confirmation once per paid order. The send is claimed atomically via
 * confirmation_email_sent_at so concurrent payment callbacks cannot send duplicates.
 */
export async function sendOrderConfirmationEmail(orderId: string): Promise<void> {
  let claimed = false
  try {
    const claim = await query(
      `UPDATE orders SET confirmation_email_sent_at = NOW()
       WHERE id = $1 AND payment_status = 'paid' AND email IS NOT NULL
         AND confirmation_email_sent_at IS NULL
       RETURNING id, email, phone, delivery_address, total_amount, mpesa_receipt, created_at`,
      [orderId]
    )
    if (claim.rows.length === 0) return
    claimed = true

    const order = claim.rows[0]
    const itemsResult = await query(
      `SELECT COALESCE(p.name, 'Product') AS name, oi.quantity, oi.unit_price, oi.flash_sale_id,
              oi.size, oi.distance
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [orderId]
    )

    const email = order.email as string
    const orderNumber = String(order.id).slice(0, 8).toUpperCase()
    const templateData = {
      userEmail: email,
      orderNumber,
      orderDate: new Date(order.created_at).toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'Africa/Nairobi',
      }),
      items: itemsResult.rows.map((row) => ({
        name: row.name as string,
        quantity: Number(row.quantity),
        unitPrice: Number(row.unit_price),
        isFlash: Boolean(row.flash_sale_id),
        size: (row.size as string | null) ?? null,
        distance: (row.distance as string | null) ?? null,
      })),
      totalPaid: Number(order.total_amount),
      mpesaReceipt: order.mpesa_receipt as string | null,
      phone: order.phone as string | null,
      deliveryAddress: order.delivery_address as string | null,
      confirmationUrl: `${config.frontendUrl}/order-confirmation/${encodeURIComponent(order.id)}`,
    }

    const result = await sendEmail({
      to: email,
      subject: `Your TRFC order is confirmed (#${orderNumber})`,
      html: buildOrderConfirmationEmailHTML(templateData),
      text: buildOrderConfirmationEmailText(templateData),
    })

    if (result.success) {
      console.log(`✅ Order confirmation email sent to ${email} for order ${orderId} (messageId=${result.messageId})`)
    } else {
      console.error(`⚠️  Failed to send order confirmation email for ${orderId}: ${result.error}`)
      await releaseClaim(orderId)
    }
  } catch (error: any) {
    console.error(`⚠️  Error in sendOrderConfirmationEmail for ${orderId}: ${error.message}`)
    if (claimed) await releaseClaim(orderId)
  }
}
