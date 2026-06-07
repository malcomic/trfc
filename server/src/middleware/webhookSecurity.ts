import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { config } from '../config/env.js'
import { logWebhookReceived } from '../utils/paymentLogger.js'

const RATE_LIMIT_WINDOW = 60000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100

const callbackRequestLog: Record<string, number[]> = {}

export function validateWebhookSignature(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const signature = req.headers['x-mpesa-signature'] as string

  // Safaricom STK callbacks do not send x-mpesa-signature; only verify when present.
  if (!signature) {
    logWebhookReceived('NO_SIGNATURE_PROCEEDING', req.body, null, true)
    return next()
  }

  const payloadString = JSON.stringify(req.body)
  const computedSignature = crypto
    .createHmac('sha256', config.mpesa.consumerSecret)
    .update(payloadString)
    .digest('base64')

  if (computedSignature !== signature) {
    logWebhookReceived('INVALID_SIGNATURE', req.body, signature, false)
    return res.status(401).json({ ResultCode: 1, ResultDesc: 'Invalid signature' })
  }

  logWebhookReceived('SIGNATURE_VALID', req.body, signature, true)
  next()
}

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const clientIp = req.ip || 'unknown'
  const now = Date.now()

  if (!callbackRequestLog[clientIp]) {
    callbackRequestLog[clientIp] = []
  }

  // Remove old requests outside the window
  callbackRequestLog[clientIp] = callbackRequestLog[clientIp].filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW
  )

  if (callbackRequestLog[clientIp].length >= RATE_LIMIT_MAX_REQUESTS) {
    console.warn(`Rate limit exceeded for IP: ${clientIp}`)
    return res.status(429).json({ ResultCode: 1, ResultDesc: 'Rate limit exceeded' })
  }

  callbackRequestLog[clientIp].push(now)
  next()
}

export function validateCallbackBody(req: Request, res: Response, next: NextFunction) {
  if (!req.body || !req.body.Body || !req.body.Body.stkCallback) {
    logWebhookReceived('INVALID_BODY_STRUCTURE', req.body, null, false)
    return res.status(400).json({ ResultCode: 1, ResultDesc: 'Invalid callback structure' })
  }

  const callback = req.body.Body.stkCallback
  if (
    !callback.CheckoutRequestID ||
    callback.ResultCode === undefined ||
    callback.ResultCode === null
  ) {
    logWebhookReceived('MISSING_REQUIRED_FIELDS', req.body, null, false)
    return res.status(400).json({ ResultCode: 1, ResultDesc: 'Missing required fields' })
  }

  next()
}
