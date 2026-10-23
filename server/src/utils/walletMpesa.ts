import { query } from '../config/db.js'
import { sendStkPush, stkErrorMessage } from '../controllers/paymentsController.js'
import { describeMpesaError } from './mpesa.js'
import { logError } from './paymentLogger.js'
import { attachCheckoutToTx } from './wallet.js'

export class MpesaStartError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

/** Sends the STK prompt for a pending wallet ledger row and links the checkout to it. */
export async function startMpesaForTx(txId: string, phone: string, amount: number, accountReference: string) {
  let stk
  try {
    stk = await sendStkPush(phone, Math.ceil(amount), accountReference)
  } catch (error) {
    await query(`UPDATE wallet_transactions SET status = 'failed' WHERE id = $1`, [txId])
    logError('WALLET_STK_EXCEPTION', describeMpesaError(error), { accountReference })
    throw new MpesaStartError(stkErrorMessage(error), 500)
  }
  if (stk.ResponseCode !== '0') {
    await query(`UPDATE wallet_transactions SET status = 'failed' WHERE id = $1`, [txId])
    throw new MpesaStartError(stk.CustomerMessage || 'Failed to initiate payment. Please try again.')
  }
  await attachCheckoutToTx(txId, stk.CheckoutRequestID)
  return { checkoutRequestId: stk.CheckoutRequestID as string, customerMessage: stk.CustomerMessage as string | undefined }
}
