import { query } from '../config/db.js'
import { addCredit, failWalletTxByCheckoutId, withWallet } from './wallet.js'
import { applyInstallmentPaymentByCheckoutId } from './installments.js'
import { settleCreditTicketPayment } from './walletCheckout.js'

/**
 * Top-ups were removed, but an M-Pesa top-up started before the change can still confirm late.
 * That money is turned into ticket value so nothing is lost.
 */
async function settleLegacyTopup(checkoutRequestId: string, mpesaReceipt: string | null): Promise<number> {
  const pending = await query(
    `SELECT id, user_id FROM wallet_transactions
     WHERE checkout_request_id = $1 AND type = 'topup' AND status = 'pending'`,
    [checkoutRequestId]
  )
  let settled = 0
  for (const row of pending.rows as { id: string; user_id: string }[]) {
    const applied = await withWallet(row.user_id, async (client) => {
      const tx = await client.query(
        `SELECT mpesa_amount::float AS mpesa_amount, amount::float AS amount FROM wallet_transactions
         WHERE id = $1 AND status = 'pending' FOR UPDATE`,
        [row.id]
      )
      if (tx.rows.length === 0) return false
      await client.query(
        `UPDATE wallet_transactions SET status = 'completed', amount = 0, mpesa_receipt = COALESCE($2, mpesa_receipt)
         WHERE id = $1`,
        [row.id, mpesaReceipt]
      )
      await addCredit(client, row.user_id, {
        amount: Number(tx.rows[0].mpesa_amount ?? tx.rows[0].amount),
        reason: 'legacy',
        note: 'Earlier M-Pesa payment converted to ticket value',
      })
      return true
    })
    if (applied) settled++
  }
  return settled
}

/** Applies a confirmed M-Pesa payment that belongs to the wallet (tickets part-paid with credit, plans). */
export async function settleWalletCheckout(checkoutRequestId: string, mpesaReceipt: string | null): Promise<number> {
  const tickets = await settleCreditTicketPayment(checkoutRequestId, mpesaReceipt)
  const installments = await applyInstallmentPaymentByCheckoutId(checkoutRequestId, mpesaReceipt)
  const legacy = await settleLegacyTopup(checkoutRequestId, mpesaReceipt)
  return tickets + installments + legacy
}

export async function failWalletCheckout(checkoutRequestId: string): Promise<void> {
  await failWalletTxByCheckoutId(checkoutRequestId)
}
