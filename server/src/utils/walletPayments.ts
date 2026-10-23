import { creditTopupByCheckoutId, failWalletTxByCheckoutId } from './wallet.js'
import { applyInstallmentPaymentByCheckoutId } from './installments.js'

/** Applies a confirmed M-Pesa payment that belongs to the wallet (top-ups and installments). Returns rows settled. */
export async function settleWalletCheckout(checkoutRequestId: string, mpesaReceipt: string | null): Promise<number> {
  const topups = await creditTopupByCheckoutId(checkoutRequestId, mpesaReceipt)
  const installments = await applyInstallmentPaymentByCheckoutId(checkoutRequestId, mpesaReceipt)
  return topups + installments
}

export async function failWalletCheckout(checkoutRequestId: string): Promise<void> {
  await failWalletTxByCheckoutId(checkoutRequestId)
}
