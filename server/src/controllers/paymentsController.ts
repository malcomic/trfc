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
import { sendEmail } from '../utils/emailService.js'
import { buildTicketEmailHTML, buildTicketEmailText } from '../utils/emailTemplates.js'
import { generateQRCodeBase64, generateQRCodeBuffer } from '../utils/qrCodeGenerator.js'
import { generateTicketPDF } from '../utils/ticketPDFGenerator.js'

export async function initiateSTKPush(req: Request, res: Response) {
  try {
    const { phone, amount, orderId, ticketId, equipmentHireId } = req.body
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
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
    } else if (ticketId) {
      accountReference = `TICKET-${ticketId}`
    } else if (equipmentHireId) {
      accountReference = `HIRE-${equipmentHireId}`
    } else {
      logSTKInitiation(phone, amount, orderId, ticketId, equipmentHireId, null, 'No reference provided')
      return res
        .status(400)
        .json({ error: 'One of orderId, ticketId, or equipmentHireId is required' })
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

    if (callback.resultCode !== 0) {
      logCallbackProcessing(
        callback.checkoutRequestId,
        'FAILED',
        null,
        0,
        callback.resultDesc
      )
      return res.json({ ResultCode: 0, ResultDesc: 'Received' })
    }

    const checkoutRequestId = callback.checkoutRequestId
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

    const accountRefMatch = payload.Body?.stkCallback?.CallbackMetadata?.Item?.find(
      (item: any) => item.Name === 'AccountReference'
    )?.Value

    let updateCount = 0
    let ticketIdForEmail: string | null = null
    
    if (accountRefMatch) {
      const [type, refId] = String(accountRefMatch).split('-')

      if (type === 'ORDER') {
        const result = await query(
          'UPDATE orders SET payment_status = $1, mpesa_receipt = $2, checkout_request_id = $3 WHERE id = $4',
          ['paid', mpesaReceipt, checkoutRequestId, refId]
        )
        updateCount = result.rowCount || 0
      } else if (type === 'TICKET') {
        const result = await query(
          'UPDATE tickets SET payment_status = $1, mpesa_receipt = $2, checkout_request_id = $3 WHERE id = $4',
          ['paid', mpesaReceipt, checkoutRequestId, refId]
        )
        updateCount = result.rowCount || 0
        if (updateCount > 0) {
          ticketIdForEmail = refId
        }
      } else if (type === 'HIRE') {
        const result = await query(
          'UPDATE equipment_hire SET payment_status = $1, mpesa_receipt = $2, checkout_request_id = $3 WHERE id = $4',
          ['paid', mpesaReceipt, checkoutRequestId, refId]
        )
        updateCount = result.rowCount || 0
      }
    }

    // Send ticket email asynchronously (non-blocking)
    if (ticketIdForEmail) {
      sendTicketEmail(ticketIdForEmail).catch((error) => {
        console.error(
          `Error sending ticket email for ${ticketIdForEmail}: ${error.message}`
        )
      })
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
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!checkoutRequestId) {
      logError('STATUS_QUERY_ERROR', 'Missing checkoutRequestId', { userId })
      return res.status(400).json({ error: 'checkoutRequestId is required' })
    }

    const token = await getMPesaToken()
    const statusResponse = await mpesaQueryPaymentStatus(checkoutRequestId, token)

    logPaymentStatusQuery(checkoutRequestId, statusResponse.ResultCode, null)

    res.json(statusResponse)
  } catch (error) {
    console.error('Error querying payment status:', error)
    logError('STATUS_QUERY_EXCEPTION', String(error), { checkoutRequestId: req.params.checkoutRequestId })
    res.status(500).json({ error: 'Failed to query payment status' })
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
    // Fetch complete ticket with user and event details
    const ticketResult = await query(
      `SELECT
        t.id, t.user_id, t.event_id, t.phone,
        u.email, u.name as user_name,
        e.title as event_title, e.event_date, e.location, e.price
       FROM tickets t
       JOIN users u ON t.user_id = u.id
       JOIN events e ON t.event_id = e.id
       WHERE t.id = $1`,
      [ticketId]
    )

    if (ticketResult.rows.length === 0) {
      console.error(`⚠️  Ticket not found for email sending: ${ticketId}`)
      return
    }

    const ticket = ticketResult.rows[0]

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
