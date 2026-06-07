import { Request, Response } from 'express'
import { query } from '../config/db.js'
import {
  getMPesaToken,
  initiateStkPush as mpesaInitiateStkPush,
  queryPaymentStatus as mpesaQueryPaymentStatus,
  parseCallbackResponse,
  STKPushResponse,
} from '../utils/mpesa.js'
import {
  logSTKInitiation,
  logCallbackProcessing,
  logPaymentStatusQuery,
  logError,
  logDuplicateCallback,
} from '../utils/paymentLogger.js'
import { validatePaymentReference, markEntitiesFailedByCheckoutId } from '../utils/paymentValidation.js'
import { getLocalPaymentStatus, toStatusResponse } from '../utils/paymentStatus.js'

async function decrementOrderStock(orderId: string) {
  const items = await query(
    'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
    [orderId]
  )
  for (const item of items.rows) {
    await query(
      'UPDATE products SET stock = GREATEST(0, stock - $1) WHERE id = $2',
      [item.quantity, item.product_id]
    )
  }
}

async function applyPaymentFromAccountRef(
  accountRef: string,
  checkoutRequestId: string,
  mpesaReceipt: string | null
): Promise<number> {
  if (accountRef.startsWith('TICKET-BATCH-')) {
    const batchId = accountRef.replace('TICKET-BATCH-', '')
    const result = await query(
      `UPDATE tickets SET payment_status = $1, mpesa_receipt = $2, checkout_request_id = $3
       WHERE purchase_batch_id = $4`,
      ['paid', mpesaReceipt, checkoutRequestId, batchId]
    )
    return result.rowCount || 0
  }

  const dashIdx = accountRef.indexOf('-')
  if (dashIdx === -1) return 0
  const type = accountRef.slice(0, dashIdx)
  const refId = accountRef.slice(dashIdx + 1)

  if (type === 'ORDER') {
    const result = await query(
      'UPDATE orders SET payment_status = $1, mpesa_receipt = $2, checkout_request_id = $3 WHERE id = $4',
      ['paid', mpesaReceipt, checkoutRequestId, refId]
    )
    if ((result.rowCount || 0) > 0) {
      await decrementOrderStock(refId)
    }
    return result.rowCount || 0
  }
  if (type === 'TICKET') {
    const result = await query(
      'UPDATE tickets SET payment_status = $1, mpesa_receipt = $2, checkout_request_id = $3 WHERE id = $4',
      ['paid', mpesaReceipt, checkoutRequestId, refId]
    )
    return result.rowCount || 0
  }
  if (type === 'HIRE') {
    const result = await query(
      'UPDATE equipment_hire SET payment_status = $1, mpesa_receipt = $2, checkout_request_id = $3 WHERE id = $4',
      ['paid', mpesaReceipt, checkoutRequestId, refId]
    )
    return result.rowCount || 0
  }
  return 0
}

export async function initiateSTKPush(req: Request, res: Response) {
  try {
    const { phone, amount, orderId, ticketId, ticketBatchId, equipmentHireId } = req.body

    if (!phone || !amount) {
      logSTKInitiation(phone || 'N/A', amount || 0, orderId, ticketId, equipmentHireId, null, 'Missing required fields')
      return res.status(400).json({ error: 'Phone and amount are required' })
    }

    if (amount <= 0 || amount > 999999) {
      logSTKInitiation(phone, amount, orderId, ticketId, equipmentHireId, null, 'Invalid amount range')
      return res
        .status(400)
        .json({ error: 'Amount must be between 1 and 999999' })
    }

    let accountReference = ''
    if (orderId) {
      accountReference = `ORDER-${orderId}`
    } else if (ticketBatchId) {
      accountReference = `TICKET-BATCH-${ticketBatchId}`
    } else if (ticketId) {
      accountReference = `TICKET-${ticketId}`
    } else if (equipmentHireId) {
      accountReference = `HIRE-${equipmentHireId}`
    } else {
      logSTKInitiation(phone, amount, orderId, ticketId, equipmentHireId, null, 'No reference provided')
      return res
        .status(400)
        .json({ error: 'One of orderId, ticketBatchId, ticketId, or equipmentHireId is required' })
    }

    const validation = await validatePaymentReference(
      orderId,
      ticketId,
      ticketBatchId,
      equipmentHireId,
      phone,
      amount
    )
    if (!validation.ok) {
      logSTKInitiation(phone, amount, orderId, ticketId, equipmentHireId, null, validation.error)
      return res.status(validation.status).json({ error: validation.error })
    }

    const token = await getMPesaToken()
    let stkResponse: STKPushResponse
    let retryCount = 0
    const maxRetries = 2

    while (retryCount <= maxRetries) {
      try {
        stkResponse = await Promise.race([
          mpesaInitiateStkPush(
            phone,
            amount,
            accountReference,
            `TRFC Payment for ${accountReference}`,
            token
          ),
          new Promise<STKPushResponse>((_, reject) =>
            setTimeout(
              () => reject(new Error('STK Push request timeout')),
              30000
            )
          ),
        ])
        break
      } catch (error: any) {
        retryCount++
        if (retryCount > maxRetries) {
          throw error
        }
        if (error.message !== 'STK Push request timeout') {
          throw error
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount))
      }
    }

    logSTKInitiation(phone, amount, orderId, ticketId, equipmentHireId, stkResponse!.ResponseCode, null)

    if (stkResponse!.ResponseCode !== '0') {
      logError('STK_PUSH_FAILED', stkResponse!.ResponseCode, {
        phone,
        amount,
        accountReference,
        customerMessage: stkResponse!.CustomerMessage,
      })
      return res.status(400).json({
        error: stkResponse!.CustomerMessage || 'Failed to initiate payment. Please try again.',
        responseCode: stkResponse!.ResponseCode,
      })
    }

    const checkoutRequestId = stkResponse!.CheckoutRequestID
    if (orderId) {
      await query(
        'UPDATE orders SET checkout_request_id = $1 WHERE id = $2',
        [checkoutRequestId, orderId]
      )
    } else if (ticketBatchId) {
      await query(
        'UPDATE tickets SET checkout_request_id = $1 WHERE purchase_batch_id = $2',
        [checkoutRequestId, ticketBatchId]
      )
    } else if (ticketId) {
      await query(
        'UPDATE tickets SET checkout_request_id = $1 WHERE id = $2',
        [checkoutRequestId, ticketId]
      )
    } else if (equipmentHireId) {
      await query(
        'UPDATE equipment_hire SET checkout_request_id = $1 WHERE id = $2',
        [checkoutRequestId, equipmentHireId]
      )
    }

    res.json({
      checkoutRequestId: stkResponse!.CheckoutRequestID,
      merchantRequestId: stkResponse!.MerchantRequestID,
      responseCode: stkResponse!.ResponseCode,
      customerMessage: stkResponse!.CustomerMessage,
    })
  } catch (error: any) {
    console.error('Error initiating STK push:', error)
    logError('STK_PUSH_EXCEPTION', String(error), { phone: req.body.phone })

    let errorMessage = 'Failed to initiate payment'
    if (error.message === 'STK Push request timeout') {
      errorMessage = 'Payment request timeout. M-Pesa service is currently busy. Please try again.'
    } else if (error.response?.status === 401) {
      errorMessage = 'Authentication failed with M-Pesa service. Please try again.'
    } else if (error.response?.status === 503) {
      errorMessage = 'M-Pesa service is temporarily unavailable. Please try again later.'
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Unable to connect to M-Pesa service. Please check your internet connection and try again.'
    }

    res.status(500).json({ error: errorMessage })
  }
}

export async function handleCallback(req: Request, res: Response) {
  try {
    const payload = req.body

    const callback = parseCallbackResponse(payload)

    const checkoutRequestId = callback.checkoutRequestId

    if (callback.resultCode !== 0) {
      await markEntitiesFailedByCheckoutId(checkoutRequestId)
      logCallbackProcessing(
        checkoutRequestId,
        'FAILED',
        null,
        0,
        callback.resultDesc
      )
      return res.json({ ResultCode: 0, ResultDesc: 'Received' })
    }

    const mpesaReceipt = callback.mpesaReceiptNumber

    const existingCallback = await query(
      'SELECT id FROM payment_callbacks WHERE checkout_request_id = $1',
      [checkoutRequestId]
    )

    if (existingCallback.rows.length > 0) {
      logDuplicateCallback(checkoutRequestId)
      return res.json({ ResultCode: 0, ResultDesc: 'Received' })
    }

    await query(
      'INSERT INTO payment_callbacks (checkout_request_id, mpesa_receipt_number, merchant_request_id, response_body, payment_status) VALUES ($1, $2, $3, $4, $5)',
      [
        checkoutRequestId,
        mpesaReceipt || null,
        callback.merchantRequestId,
        JSON.stringify(payload),
        'paid',
      ]
    )

    const metadataItems = payload.Body?.stkCallback?.CallbackMetadata?.Item
    const accountRefMatch = Array.isArray(metadataItems)
      ? metadataItems.find((item: any) => item.Name === 'AccountReference')?.Value
      : metadataItems?.Name === 'AccountReference'
        ? metadataItems.Value
        : undefined

    let updateCount = 0
    if (accountRefMatch) {
      updateCount = await applyPaymentFromAccountRef(
        String(accountRefMatch),
        checkoutRequestId,
        mpesaReceipt || null
      )
    }

    logCallbackProcessing(
      checkoutRequestId,
      'SUCCESS',
      mpesaReceipt || null,
      updateCount,
      null
    )

    res.json({ ResultCode: 0, ResultDesc: 'Received' })
  } catch (error) {
    console.error('Error handling callback:', error)
    logError('CALLBACK_PROCESSING_ERROR', String(error), { payload: req.body })
    res.status(500).json({ error: 'Failed to process callback' })
  }
}

export async function queryPaymentStatus(req: Request, res: Response) {
  try {
    const { checkoutRequestId } = req.params

    if (!checkoutRequestId) {
      logError('STATUS_QUERY_ERROR', 'Missing checkoutRequestId', {})
      return res.status(400).json({ error: 'checkoutRequestId is required' })
    }

    let localStatus = null
    try {
      localStatus = await getLocalPaymentStatus(checkoutRequestId)
    } catch (dbError) {
      console.error('Local payment status lookup failed:', dbError)
      logError('STATUS_QUERY_DB_FALLBACK', String(dbError), { checkoutRequestId })
    }

    if (localStatus && localStatus.payment_status !== 'pending') {
      const response = toStatusResponse(localStatus, checkoutRequestId)
      logPaymentStatusQuery(checkoutRequestId, response.ResultCode, 'local_db')
      return res.json(response)
    }

    try {
      const token = await getMPesaToken()
      const statusResponse = await mpesaQueryPaymentStatus(checkoutRequestId, token)
      logPaymentStatusQuery(checkoutRequestId, statusResponse.ResultCode, null)
      return res.json(statusResponse)
    } catch (mpesaError: unknown) {
      const err = mpesaError as { response?: { data?: Record<string, unknown> }; message?: string }
      const mpesaData = err.response?.data
      if (mpesaData && ('ResultCode' in mpesaData || 'resultCode' in mpesaData)) {
        logPaymentStatusQuery(
          checkoutRequestId,
          mpesaData.ResultCode ?? mpesaData.resultCode,
          'mpesa_error_body'
        )
        return res.json(mpesaData)
      }

      console.error('M-Pesa status query failed, returning pending:', err.message ?? mpesaError)
      logError('STATUS_QUERY_MPESA_FALLBACK', String(err.message ?? mpesaError), { checkoutRequestId })

      return res.json({
        ResultCode: '1032',
        ResultDesc: 'Payment still pending. Complete the M-Pesa prompt on your phone.',
        payment_status: 'pending',
        CheckoutRequestID: checkoutRequestId,
      })
    }
  } catch (error) {
    console.error('Error querying payment status:', error)
    logError('STATUS_QUERY_EXCEPTION', String(error), { checkoutRequestId: req.params.checkoutRequestId })
    return res.json({
      ResultCode: '1032',
      ResultDesc: 'Payment still pending. Complete the M-Pesa prompt on your phone.',
      payment_status: 'pending',
      CheckoutRequestID: req.params.checkoutRequestId,
    })
  }
}

export async function getPaymentHistory(req: Request, res: Response) {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const orderPayments = await query(
      `SELECT
        id, 'order' as type, total_amount as amount, payment_status,
        mpesa_receipt, checkout_request_id, created_at
       FROM orders
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    )

    const ticketPayments = await query(
      `SELECT
        id, 'ticket' as type, NULL as amount, payment_status,
        mpesa_receipt, checkout_request_id, created_at
       FROM tickets
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    )

    const equipmentPayments = await query(
      `SELECT
        id, 'equipment_hire' as type, total_cost as amount, payment_status,
        mpesa_receipt, checkout_request_id, created_at
       FROM equipment_hire
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    )

    const allPayments = [
      ...orderPayments.rows,
      ...ticketPayments.rows,
      ...equipmentPayments.rows,
    ].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    res.json(allPayments)
  } catch (error) {
    console.error('Error fetching payment history:', error)
    res.status(500).json({ error: 'Failed to fetch payment history' })
  }
}
