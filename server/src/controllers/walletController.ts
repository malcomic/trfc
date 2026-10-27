import { Request, Response } from 'express'
import { query } from '../config/db.js'
import { toKenyanMsisdn } from '../utils/phone.js'
import { WalletCheckoutError, getPayableBatches, payBatchesFromWallet } from '../utils/walletCheckout.js'
import { MpesaStartError, startMpesaForTx } from '../utils/walletMpesa.js'
import {
  InsufficientFundsError,
  MAX_TOPUP,
  MIN_TOPUP,
  getWalletBalance,
  getWalletTransactions,
} from '../utils/wallet.js'
import { WalletLimitError, getTopUpHeadroom, reserveTopup } from '../utils/walletLimit.js'
import { captureMetaContext, saveMetaContext } from '../utils/metaConversions.js'
import {
  InstallmentError,
  buildSchedule,
  createPlan,
  getPlansForUser,
  payPlanInstallments,
} from '../utils/installments.js'

function insufficientFunds(res: Response, error: InsufficientFundsError) {
  return res.status(402).json({
    error: `Your wallet balance is KES ${error.balance.toLocaleString()}. Top up KES ${error.shortfall.toLocaleString()} to continue.`,
    balance: error.balance,
    required: error.required,
    shortfall: error.shortfall,
  })
}

export function sendWalletError(res: Response, error: unknown, fallback: string) {
  if (error instanceof InsufficientFundsError) return insufficientFunds(res, error)
  if (error instanceof WalletLimitError) {
    return res.status(error.status).json({ error: error.message, cap: error.cap, headroom: error.headroom })
  }
  if (error instanceof MpesaStartError || error instanceof WalletCheckoutError || error instanceof InstallmentError) {
    return res.status(error.status).json({ error: error.message })
  }
  console.error(error)
  return res.status(500).json({ error: fallback })
}

export async function getWallet(req: Request, res: Response) {
  try {
    const userId = req.user!.id
    const [balance, recent] = await Promise.all([
      getWalletBalance(userId),
      getWalletTransactions(userId, { limit: 10 }),
    ])
    const { cap, headroom } = await getTopUpHeadroom(userId, balance)
    res.json({ balance, cap, headroom, transactions: recent.transactions })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load your wallet' })
  }
}

export async function listWalletTransactions(req: Request, res: Response) {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10) || 20))
    const result = await getWalletTransactions(req.user!.id, { limit, offset: (page - 1) * limit })
    res.json({ ...result, page, limit })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load wallet transactions' })
  }
}

export async function walletCheckout(req: Request, res: Response) {
  try {
    const batchIds = Array.isArray(req.body?.purchaseBatchIds) ? req.body.purchaseBatchIds : []
    const result = await payBatchesFromWallet(req.user!.id, batchIds, captureMetaContext(req))
    res.json(result)
  } catch (error) {
    sendWalletError(res, error, 'Failed to pay from your wallet')
  }
}

export async function listPayableBatches(req: Request, res: Response) {
  try {
    res.json(await getPayableBatches(req.user!.id))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load bookings awaiting payment' })
  }
}

export async function topUpWallet(req: Request, res: Response) {
  try {
    const amount = Number(req.body?.amount)
    const phone = toKenyanMsisdn(req.body?.phone)
    if (!Number.isFinite(amount) || amount < MIN_TOPUP || amount > MAX_TOPUP) {
      return res
        .status(400)
        .json({ error: `Top-up amount must be between KES ${MIN_TOPUP} and KES ${MAX_TOPUP.toLocaleString()}` })
    }
    if (!phone) {
      return res.status(400).json({ error: 'Enter a valid M-Pesa number, e.g. 07XX XXX XXX' })
    }

    const roundedAmount = Math.round(amount)
    const { txId, cap, headroom } = await reserveTopup(req.user!.id, {
      amount: roundedAmount,
      phone,
      note: 'M-Pesa top-up',
    })
    const result = await startMpesaForTx(txId, phone, roundedAmount, `WALLET-${txId}`)
    res.json({ ...result, transactionId: txId, amount: roundedAmount, cap, headroom })
  } catch (error) {
    sendWalletError(res, error, 'Failed to start your top-up')
  }
}

export async function previewPlan(req: Request, res: Response) {
  try {
    const eventId = String(req.query.eventId ?? '')
    const total = Number(req.query.total)
    const installments = Number(req.query.installments)
    const event = await query('SELECT event_date, installments_allowed FROM events WHERE id = $1 AND is_active = true', [
      eventId,
    ])
    if (event.rows.length === 0) return res.status(404).json({ error: 'Event not found' })
    if (Number(event.rows[0].installments_allowed ?? 0) < installments) {
      return res.status(400).json({ error: 'Installments are not available for this event' })
    }
    res.json({ schedule: buildSchedule(total, installments, new Date(event.rows[0].event_date)) })
  } catch (error) {
    sendWalletError(res, error, 'Failed to build the installment schedule')
  }
}

export async function createPaymentPlan(req: Request, res: Response) {
  try {
    const { purchaseBatchId, installments } = req.body ?? {}
    if (typeof purchaseBatchId !== 'string' || !purchaseBatchId) {
      return res.status(400).json({ error: 'purchaseBatchId is required' })
    }
    const plan = await createPlan(req.user!.id, purchaseBatchId, Number(installments))
    res.status(201).json(plan)
  } catch (error) {
    sendWalletError(res, error, 'Failed to create the installment plan')
  }
}

export async function listPaymentPlans(req: Request, res: Response) {
  try {
    res.json(await getPlansForUser(req.user!.id))
  } catch (error) {
    sendWalletError(res, error, 'Failed to load installment plans')
  }
}

export async function payPaymentPlan(req: Request, res: Response) {
  try {
    const mode = req.body?.mode === 'all' ? 'all' : 'next'
    const source = req.body?.source === 'wallet' ? 'wallet' : 'mpesa'
    const phone = source === 'mpesa' ? toKenyanMsisdn(req.body?.phone) : null
    if (source === 'mpesa' && !phone) {
      return res.status(400).json({ error: 'Enter a valid M-Pesa number, e.g. 07XX XXX XXX' })
    }
    await saveMetaContext(`PLAN-${String(req.params.id)}`, captureMetaContext(req))
    const result = await payPlanInstallments(String(req.params.id), req.user!.id, { mode, source, phone })
    res.json(result)
  } catch (error) {
    sendWalletError(res, error, 'Failed to pay the installment')
  }
}
