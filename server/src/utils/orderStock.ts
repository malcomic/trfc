import { query } from '../config/db.js'

/**
 * Decrement product stock for a paid order exactly once. The order is claimed via
 * stock_decremented_at so repeated callbacks or status checks never reduce stock twice.
 */
export async function decrementOrderStock(orderId: string): Promise<void> {
  const claim = await query(
    `UPDATE orders SET stock_decremented_at = NOW()
     WHERE id = $1 AND payment_status = 'paid' AND stock_decremented_at IS NULL
     RETURNING id`,
    [orderId]
  )
  if (claim.rows.length === 0) return

  const items = await query('SELECT product_id, quantity FROM order_items WHERE order_id = $1', [orderId])
  for (const item of items.rows) {
    await query('UPDATE products SET stock = GREATEST(0, stock - $1) WHERE id = $2', [
      item.quantity,
      item.product_id,
    ])
  }
}
