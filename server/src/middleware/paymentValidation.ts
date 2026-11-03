import { Request, Response, NextFunction } from 'express'
import { validateCallback } from '../utils/mpesa.js'
import { MPESA_PHONE_ERROR, toKenyanMsisdn } from '../utils/phone.js'

/** Accepts 07XX / 01XX / +254 / 254 forms and rewrites req.body.phone to 2547XXXXXXXX. */
function normalizeBodyPhone(req: Request, res: Response): boolean {
  const { phone } = req.body

  if (!phone) {
    res.status(400).json({ error: 'Phone number is required' })
    return false
  }

  const msisdn = toKenyanMsisdn(phone)
  if (!msisdn) {
    res.status(400).json({ error: MPESA_PHONE_ERROR })
    return false
  }

  req.body.phone = msisdn
  return true
}

export function validatePhoneNumber(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!normalizeBodyPhone(req, res)) return
  next()
}

export function validateAmount(req: Request, res: Response, next: NextFunction) {
  const { amount } = req.body

  if (!amount) {
    return res.status(400).json({ error: 'Amount is required' })
  }

  const numAmount = Number(amount)
  if (isNaN(numAmount) || numAmount <= 0 || numAmount > 999999) {
    return res.status(400).json({
      error: 'Amount must be a number between 1 and 999999',
    })
  }

  req.body.amount = numAmount
  next()
}

export function validateCallbackSignature(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const signature = req.headers['x-mpesa-signature'] as string

  if (!signature) {
    return res.status(401).json({ error: 'Missing callback signature' })
  }

  if (!validateCallback(req.body, signature)) {
    console.warn('Invalid callback signature received')
    return res.status(401).json({ error: 'Invalid callback signature' })
  }

  next()
}

export function validatePaymentRequest(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!normalizeBodyPhone(req, res)) return

  const { amount, orderId, ticketId, ticketBatchId, equipmentHireId, medalBatchId, signupId } = req.body

  if (!amount) {
    return res.status(400).json({ error: 'Amount is required' })
  }

  const numAmount = Number(amount)
  if (isNaN(numAmount) || numAmount <= 0 || numAmount > 999999) {
    return res.status(400).json({
      error: 'Amount must be a number between 1 and 999999',
    })
  }

  if (!orderId && !ticketId && !ticketBatchId && !equipmentHireId && !medalBatchId && !signupId) {
    return res.status(400).json({
      error:
        'One of orderId, ticketBatchId, ticketId, equipmentHireId, medalBatchId, or signupId is required',
    })
  }

  req.body.amount = numAmount
  next()
}
