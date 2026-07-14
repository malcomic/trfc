import { Request, Response, NextFunction } from 'express'
import { validateCallback } from '../utils/mpesa.js'

export function validatePhoneNumber(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { phone } = req.body

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' })
  }

  const phoneRegex = /^254\d{9}$/
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({
      error: 'Invalid phone number format. Expected format: 254XXXXXXXXX',
    })
  }

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
  const { phone, amount, orderId, ticketId, ticketBatchId, equipmentHireId } = req.body

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' })
  }

  const phoneRegex = /^254\d{9}$/
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({
      error: 'Invalid phone number format. Expected format: 254XXXXXXXXX',
    })
  }

  if (!amount) {
    return res.status(400).json({ error: 'Amount is required' })
  }

  const numAmount = Number(amount)
  if (isNaN(numAmount) || numAmount <= 0 || numAmount > 999999) {
    return res.status(400).json({
      error: 'Amount must be a number between 1 and 999999',
    })
  }

  if (!orderId && !equipmentHireId) {
    return res.status(400).json({
      error: 'One of orderId or equipmentHireId is required',
    })
  }

  if (ticketId || ticketBatchId) {
    return res.status(400).json({
      error: 'Event tickets must be paid via Paystack',
    })
  }

  req.body.amount = numAmount
  next()
}
