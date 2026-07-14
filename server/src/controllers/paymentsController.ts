import { Request, Response } from 'express'
import { query } from '../config/db.js'
import { config } from '../config/env.js'
import {
  getMPesaToken,
  initiateStkPush as mpesaInitiateStkPush,
  queryPaymentStatus as mpesaQueryPaymentStatus,
  parseCallbackResponse,
  STKPushResponse,
} from '../utils/mpesa.js'
import {
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature,
} from '../utils/paystack.js'
import {
  logSTKInitiation,
  logCallbackProcessing,
  logPaymentStatusQuery,
  logError,
  logDuplicateCallback,
} from '../utils/paymentLogger.js'
import { sendEmail } from '../utils/emailService.js'
import { buildTicketEmailHTML } from '../utils/emailTemplates.js'
import { generateQRCodeBase64, generateQRCodeBuffer } from '../utils/qrCodeGenerator.js'
import { generateTicketPDF } from '../utils/ticketPDFGenerator.js'
import {
  validatePaymentReference,
  markEntitiesFailedByCheckoutId,
  markEntitiesPaidByCheckoutId,
  isMpesaSuccessCode,
} from '../utils/paymentValidation.js'
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

async function fulfillTicketBatchPayment(
  reference: string,
  receipt: string | null,
  ticketBatchId?: string
): Promise<number> {
  let updateCount = 0

  if (ticketBatchId) {
    const result = await query(
      `UPDATE tickets
       SET payment_status = 'paid',
           mpesa_receipt = COALESCE($2, mpesa_receipt),
           checkout_request_id = $3
       WHERE purchase_batch_id = $1 AND payment_status = 'pending'`,
      [ticketBatchId, receipt, reference]
    )
    updateCount = result.rowCount || 0
  }

  if (updateCount === 0) {
    updateCount = await markEntitiesPaidByCheckoutId(reference, receipt)
  }

  if (updateCount > 0) {
    const paidTickets = await query(
      `SELECT id FROM tickets
       WHERE checkout_request_id = $1 AND payment_status = 'paid'`,
      [reference]
    )
    for (const ticket of paidTickets.rows) {
      sendTicketEmail(ticket.id).catch((error: Error) => {
        console.error(`Error sending ticket email for ${ticket.id}: ${error.message}`)
      })
    }
  }

  return updateCount
}

export async function initiateSTKPush(req: Request, res: Response) {
  try {
    const { phone, amount, orderId, ticketId, ticketBatchId, equipmentHireId } = req.body

    if (ticketId || ticketBatchId) {
      return res.status(400).json({
        error: 'Event tickets must be paid via Paystack. Use /payments/paystack/initialize.',
      })
    }

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
    } else if (equipmentHireId) {
      accountReference = `HIRE-${equipmentHireId}`
    } else {
      logSTKInitiation(phone, amount, orderId, ticketId, equipmentHireId, null, 'No reference provided')
      return res
        .status(400)
        .json({ error: 'One of orderId or equipmentHireId is required' })
    }

    const validation = await validatePaymentReference(
      orderId,
      undefined,
      undefined,
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

export async function initializePaystackPayment(req: Request, res: Response) {
  try {
    const { email, amount, ticketBatchId } = req.body

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'A valid email is required' })
    }

    if (!ticketBatchId) {
      return res.status(400).json({ error: 'ticketBatchId is required' })
    }

    const numAmount = Number(amount)
    if (!amount || isNaN(numAmount) || numAmount <= 0 || numAmount > 999999) {
      return res.status(400).json({ error: 'Amount must be a number between 1 and 999999' })
    }

    const ticketsResult = await query(
      `SELECT t.*, e.price FROM tickets t
       JOIN events e ON t.event_id = e.id
       WHERE t.purchase_batch_id = $1`,
      [ticketBatchId]
    )

    if (ticketsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket batch not found' })
    }

    const batch = ticketsResult.rows
    const expectedTotal = Math.round(Number(batch[0].price) * batch.length)
    if (expectedTotal !== Math.round(numAmount)) {
      return res.status(400).json({ error: 'Amount does not match ticket batch total' })
    }

    if (batch[0].payment_status === 'paid') {
      return res.status(400).json({ error: 'This ticket batch has already been paid' })
    }

    const accountReference = `TICKET-BATCH-${ticketBatchId}`
    const initData = await initializeTransaction({
      email: email.trim().toLowerCase(),
      amountKes: numAmount,
      metadata: {
        ticketBatchId,
        accountReference,
        custom_fields: [
          {
            display_name: 'Ticket Batch',
            variable_name: 'ticket_batch_id',
            value: ticketBatchId,
          },
        ],
      },
    })

    await query(
      `UPDATE tickets
       SET checkout_request_id = $1, email = COALESCE(email, $2), payment_provider = 'paystack'
       WHERE purchase_batch_id = $3`,
      [initData.reference, email.trim().toLowerCase(), ticketBatchId]
    )

    res.json({
      accessCode: initData.access_code,
      reference: initData.reference,
      authorizationUrl: initData.authorization_url,
      publicKey: config.paystack.publicKey,
    })
  } catch (error: any) {
    console.error('Error initializing Paystack payment:', error)
    logError('PAYSTACK_INIT_EXCEPTION', String(error?.message || error), {
      ticketBatchId: req.body.ticketBatchId,
    })
    const message =
      error.response?.data?.message ||
      error.message ||
      'Failed to initialize Paystack payment'
    res.status(500).json({ error: message })
  }
}

export async function verifyPaystackPayment(req: Request, res: Response) {
  try {
    const { reference } = req.params

    if (!reference) {
      return res.status(400).json({ error: 'reference is required' })
    }

    const localStatus = await getLocalPaymentStatus(reference)
    if (localStatus && localStatus.payment_status === 'paid') {
      return res.json({
        status: 'success',
        payment_status: 'paid',
        reference,
        receipt: localStatus.mpesa_receipt,
      })
    }

    const verified = await verifyTransaction(reference)

    if (verified.status !== 'success') {
      return res.json({
        status: verified.status,
        payment_status: 'pending',
        reference,
      })
    }

    const ticketBatchId =
      typeof verified.metadata?.ticketBatchId === 'string'
        ? verified.metadata.ticketBatchId
        : undefined

    const receipt = verified.reference
    await fulfillTicketBatchPayment(reference, receipt, ticketBatchId)

    return res.json({
      status: 'success',
      payment_status: 'paid',
      reference,
      receipt,
      amount: verified.amount / 100,
      channel: verified.channel,
    })
  } catch (error: any) {
    console.error('Error verifying Paystack payment:', error)
    logError('PAYSTACK_VERIFY_EXCEPTION', String(error?.message || error), {
      reference: req.params.reference,
    })
    res.status(500).json({
      error: error.response?.data?.message || error.message || 'Failed to verify payment',
    })
  }
}

export async function handlePaystackWebhook(req: Request, res: Response) {
  try {
    const signature = req.headers['x-paystack-signature'] as string | undefined
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody

    if (!rawBody || !verifyWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ error: 'Invalid Paystack signature' })
    }

    const event = req.body
    if (event?.event !== 'charge.success') {
      return res.sendStatus(200)
    }

    const data = event.data
    const reference = data?.reference as string | undefined
    if (!reference) {
      return res.sendStatus(200)
    }

    const existingCallback = await query(
      'SELECT id FROM payment_callbacks WHERE checkout_request_id = $1',
      [reference]
    )
    if (existingCallback.rows.length > 0) {
      logDuplicateCallback(reference)
      return res.sendStatus(200)
    }

    await query(
      `INSERT INTO payment_callbacks
        (checkout_request_id, mpesa_receipt_number, merchant_request_id, response_body, payment_status)
       VALUES ($1, $2, $3, $4, $5)`,
      [reference, reference, String(data?.id || ''), JSON.stringify(event), 'paid']
    )

    const ticketBatchId =
      typeof data?.metadata?.ticketBatchId === 'string'
        ? data.metadata.ticketBatchId
        : undefined

    const updateCount = await fulfillTicketBatchPayment(reference, reference, ticketBatchId)
    logCallbackProcessing(reference, 'SUCCESS', reference, updateCount, null)

    res.sendStatus(200)
  } catch (error) {
    console.error('Error handling Paystack webhook:', error)
    logError('PAYSTACK_WEBHOOK_ERROR', String(error), { body: req.body })
    res.status(500).json({ error: 'Failed to process webhook' })
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
    if (updateCount === 0) {
      updateCount = await markEntitiesPaidByCheckoutId(
        checkoutRequestId,
        mpesaReceipt || null
      )
      const paidOrders = await query(
        `SELECT id FROM orders
         WHERE checkout_request_id = $1 AND payment_status = 'paid'`,
        [checkoutRequestId]
      )
      for (const order of paidOrders.rows) {
        await decrementOrderStock(order.id)
      }
    }

    // Send ticket emails asynchronously (non-blocking) for single or batch tickets
    if (updateCount > 0) {
      const paidTickets = await query(
        `SELECT id FROM tickets
         WHERE checkout_request_id = $1 AND payment_status = 'paid'`,
        [checkoutRequestId]
      )
      for (const ticket of paidTickets.rows) {
        sendTicketEmail(ticket.id).catch((error) => {
          console.error(
            `Error sending ticket email for ${ticket.id}: ${error.message}`
          )
        })
      }
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
      logPaymentStatusQuery(checkoutRequestId, String(response.ResultCode), 'local_db')
      return res.json(response)
    }

    // Paystack ticket payments: verify against Paystack instead of M-Pesa
    if (localStatus?.source === 'ticket') {
      try {
        const verified = await verifyTransaction(checkoutRequestId)
        if (verified.status === 'success') {
          const ticketBatchId =
            typeof verified.metadata?.ticketBatchId === 'string'
              ? verified.metadata.ticketBatchId
              : undefined
          await fulfillTicketBatchPayment(
            checkoutRequestId,
            verified.reference,
            ticketBatchId
          )
          return res.json({
            ResultCode: 0,
            payment_status: 'paid',
            CheckoutRequestID: checkoutRequestId,
            MpesaReceiptNumber: verified.reference,
          })
        }
      } catch {
        /* fall through to pending */
      }

      return res.json({
        ResultCode: '1032',
        ResultDesc: 'Payment still pending. Complete checkout in the Paystack window.',
        payment_status: 'pending',
        CheckoutRequestID: checkoutRequestId,
      })
    }

    try {
      const token = await getMPesaToken()
      const statusResponse = await mpesaQueryPaymentStatus(checkoutRequestId, token)
      const resultCode = statusResponse.ResultCode ?? statusResponse.resultCode
      logPaymentStatusQuery(checkoutRequestId, resultCode, null)

      if (isMpesaSuccessCode(resultCode)) {
        const mpesaReceipt =
          statusResponse.MpesaReceiptNumber ??
          statusResponse.mpesaReceiptNumber ??
          null
        await markEntitiesPaidByCheckoutId(checkoutRequestId, mpesaReceipt)
        const paidOrders = await query(
          `SELECT id FROM orders
           WHERE checkout_request_id = $1 AND payment_status = 'paid'`,
          [checkoutRequestId]
        )
        for (const order of paidOrders.rows) {
          await decrementOrderStock(order.id)
        }

        return res.json({
          ...statusResponse,
          ResultCode: 0,
          payment_status: 'paid',
          MpesaReceiptNumber: mpesaReceipt,
          CheckoutRequestID: checkoutRequestId,
        })
      }

      return res.json(statusResponse)
    } catch (mpesaError: unknown) {
      const err = mpesaError as { response?: { data?: Record<string, unknown> }; message?: string }
      const mpesaData = err.response?.data
      if (mpesaData && ('ResultCode' in mpesaData || 'resultCode' in mpesaData)) {
        logPaymentStatusQuery(
          checkoutRequestId,
          String(mpesaData.ResultCode ?? mpesaData.resultCode ?? ''),
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

/**
 * Helper function to send ticket email with PDF and QR code
 * Non-blocking: errors are logged but don't affect payment callback
 */
async function sendTicketEmail(ticketId: string): Promise<void> {
  try {
    const ticketResult = await query(
      `SELECT
        t.id, t.user_id, t.event_id, t.phone, t.email as ticket_email,
        COALESCE(u.email, t.email) as email,
        COALESCE(u.name, 'Guest') as user_name,
        e.title as event_title, e.event_date, e.location, e.price
       FROM tickets t
       LEFT JOIN users u ON t.user_id = u.id
       JOIN events e ON t.event_id = e.id
       WHERE t.id = $1`,
      [ticketId]
    )

    if (ticketResult.rows.length === 0) {
      console.error(`⚠️  Ticket not found for email sending: ${ticketId}`)
      return
    }

    const ticket = ticketResult.rows[0]

    if (!ticket.email) {
      console.error(`⚠️  No email on ticket or user for ticket ${ticketId}`)
      return
    }

    // Generate QR code
    const qrCodeBase64 = await generateQRCodeBase64({
      ticketId: ticket.id,
      eventId: ticket.event_id,
      userId: ticket.user_id,
    })

    const qrCodeBuffer = await generateQRCodeBuffer({
      ticketId: ticket.id,
      eventId: ticket.event_id,
      userId: ticket.user_id,
    })

    // Generate PDF ticket
    const pdfBuffer = await generateTicketPDF({
      ticketId: ticket.id,
      eventTitle: ticket.event_title,
      eventDate: ticket.event_date,
      eventLocation: ticket.location,
      eventPrice: parseFloat(ticket.price),
      userName: ticket.user_name,
      userPhone: ticket.phone,
      qrCodeBuffer: qrCodeBuffer,
    })

    // Build email template
    const emailHTML = buildTicketEmailHTML({
      userEmail: ticket.email,
      userName: ticket.user_name,
      ticketId: ticket.id,
      eventTitle: ticket.event_title,
      eventDate: ticket.event_date,
      eventLocation: ticket.location,
      eventPrice: parseFloat(ticket.price),
      qrCodeBase64: qrCodeBase64,
    })

    // Send email with retry logic
    const emailResult = await sendEmail({
      to: ticket.email,
      subject: `Your TRFC Event Ticket - ${ticket.event_title}`,
      html: emailHTML,
      attachments: [
        {
          filename: `ticket-${ticket.id}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    })

    if (emailResult.success) {
      console.log(
        `✅ Ticket email sent successfully to ${ticket.email} for ticket ${ticketId}`
      )
    } else {
      console.error(
        `⚠️  Failed to send ticket email to ${ticket.email} after retries: ${emailResult.error}`
      )
    }
  } catch (error: any) {
    console.error(
      `⚠️  Error in sendTicketEmail for ${ticketId}: ${error.message}`
    )
  }
}
