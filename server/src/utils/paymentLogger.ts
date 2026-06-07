import fs from 'fs'
import path from 'path'
import os from 'os'

const LOGS_DIR =
  process.env.PAYMENTS_LOG_DIR ||
  (process.env.NODE_ENV === 'production' ? path.join(os.tmpdir(), 'trfc-logs') : './logs')
const PAYMENTS_LOG_FILE = path.join(LOGS_DIR, 'payments.log')

let fileLoggingEnabled = process.env.DISABLE_PAYMENT_FILE_LOGS !== 'true'

function ensureLogDir() {
  if (!fileLoggingEnabled) return
  try {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true })
    }
  } catch {
    fileLoggingEnabled = false
  }
}

function writeLog(logMessage: string) {
  if (!fileLoggingEnabled) return
  try {
    ensureLogDir()
    fs.appendFileSync(PAYMENTS_LOG_FILE, logMessage)
  } catch {
    fileLoggingEnabled = false
  }
}

function formatLog(message: string, data?: any): string {
  const timestamp = new Date().toISOString()
  if (data) {
    return `[${timestamp}] ${message}\n${JSON.stringify(data, null, 2)}\n---\n`
  }
  return `[${timestamp}] ${message}\n`
}

export function logSTKInitiation(
  phoneNumber: string,
  amount: number,
  orderId: string | null,
  ticketId: string | null,
  equipmentHireId: string | null,
  responseCode: string | null,
  error: string | null
): void {
  const reference = orderId || ticketId || equipmentHireId || 'unknown'
  const status = error ? 'FAILED' : 'SUCCESS'
  const logMessage = formatLog(
    `STK PUSH INITIATION [${status}] - Phone: ${phoneNumber}, Amount: ${amount}, Reference: ${reference}`,
    {
      phoneNumber,
      amount,
      reference,
      responseCode,
      error,
      timestamp: new Date().toISOString(),
    }
  )

  writeLog(logMessage)
  console.log(
    `[PAYMENTS] STK Push initiated: ${reference} - Amount: ${amount} - Status: ${status}`
  )
}

export function logWebhookReceived(
  eventType: string,
  payload: any,
  signature: string | null,
  isValid: boolean
): void {
  const logMessage = formatLog(`WEBHOOK RECEIVED [${eventType}] - Signature Valid: ${isValid}`, {
    eventType,
    checkoutRequestId: payload.Body?.stkCallback?.CheckoutRequestID,
    resultCode: payload.Body?.stkCallback?.ResultCode,
    resultDesc: payload.Body?.stkCallback?.ResultDesc,
    signatureValid: isValid,
    receivedSignature: signature ? signature.slice(0, 20) + '...' : null,
    timestamp: new Date().toISOString(),
  })

  writeLog(logMessage)
  console.log(`[PAYMENTS] Webhook received: ${eventType} - Valid: ${isValid}`)
}

export function logCallbackProcessing(
  checkoutRequestId: string,
  status: string,
  mpesaReceipt: string | null,
  updateCount: number,
  error: string | null
): void {
  const logMessage = formatLog(
    `CALLBACK PROCESSING [${status}] - CheckoutID: ${checkoutRequestId}`,
    {
      checkoutRequestId,
      status,
      mpesaReceipt,
      recordsUpdated: updateCount,
      error,
      timestamp: new Date().toISOString(),
    }
  )

  writeLog(logMessage)
  console.log(
    `[PAYMENTS] Callback processed: ${checkoutRequestId} - Status: ${status} - Updates: ${updateCount}`
  )
}

export function logPaymentStatusQuery(
  checkoutRequestId: string,
  status: string | null,
  error: string | null
): void {
  const logMessage = formatLog(
    `PAYMENT STATUS QUERY - CheckoutID: ${checkoutRequestId}`,
    {
      checkoutRequestId,
      status,
      error,
      timestamp: new Date().toISOString(),
    }
  )

  writeLog(logMessage)
  console.log(`[PAYMENTS] Status query: ${checkoutRequestId} - Status: ${status}`)
}

export function logError(
  errorType: string,
  errorMessage: string,
  context: Record<string, any>
): void {
  const logMessage = formatLog(
    `ERROR [${errorType}] - ${errorMessage}`,
    {
      errorType,
      errorMessage,
      context,
      timestamp: new Date().toISOString(),
    }
  )

  writeLog(logMessage)
  console.error(`[PAYMENTS] Error: ${errorType} - ${errorMessage}`)
}

export function logDuplicateCallback(checkoutRequestId: string): void {
  const logMessage = formatLog(
    `DUPLICATE CALLBACK DETECTED - CheckoutID: ${checkoutRequestId}`
  )

  writeLog(logMessage)
  console.log(`[PAYMENTS] Duplicate callback ignored: ${checkoutRequestId}`)
}

export function getPaymentLogs(lines: number = 100): string {
  try {
    const content = fs.readFileSync(PAYMENTS_LOG_FILE, 'utf-8')
    const logLines = content.split('\n')
    return logLines.slice(-lines).join('\n')
  } catch (err) {
    return 'No logs available'
  }
}
