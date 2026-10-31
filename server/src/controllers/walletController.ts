import { Request, Response } from 'express'
import { query } from '../config/db.js'
import { toKenyanMsisdn } from '../utils/phone.js'
import { WalletCheckoutError, getPayableBatches, payBatchesWithCredit } from '../utils/walletCheckout.js'
import { MpesaStartError } from '../utils/walletMpesa.js'
import { CreditError, getTicketValue, getWalletTransactions } from '../utils/wallet.js'
import { captureMetaContext, saveMetaContext } from '../utils/metaConversions.js'
import {
  InstallmentError,
  MAX_LATER_PAYMENTS,
  buildSchedule,
  createPlan,
  getEventPlanSettings,
  getPlansForUser,
  movePlanToEvent,
  payPlanInstallments,
  releasePlanToCredit,
} from '../utils/installments.js'
import { getTicketRules } from '../utils/ticketRules.js'

export function sendWalletError(res: Response, error: unknown, fallback: string) {
  if (
    error instanceof MpesaStartError ||
    error instanceof WalletCheckoutError ||
    error instanceof InstallmentError ||
    error instanceof CreditError
  ) {
    return res.status(error.status ?? 400).json({ error: error.message })
  }
  console.error(error)
  return res.status(500).json({ error: fallback })
}

export async function getWallet(req: Request, res: Response) {
  try {
    const userId = req.user!.id
    const [value, recent, rules] = await Promise.all([
      getTicketValue(userId),
      getWalletTransactions(userId, { limit: 10 }),
      getTicketRules(),
    ])
    res.json({
      ticketValue: value.ticketValue,
      upcoming: value.upcoming,
      credits: value.credits,
      creditDays: rules.creditDays,
      transactions: recent.transactions,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load your ticket value' })
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
    res.status(500).json({ error: 'Failed to load your history' })
  }
}

/** Pays pending bookings with ticket value first and M-Pesa for any difference. */
export async function walletCheckout(req: Request, res: Response) {
  try {
    const batchIds = Array.isArray(req.body?.purchaseBatchIds) ? req.body.purchaseBatchIds : []
    const phone = req.body?.phone ? toKenyanMsisdn(req.body.phone) : null
    if (req.body?.phone && !phone) {
      return res.status(400).json({ error: 'Enter a valid M-Pesa number, e.g. 07XX XXX XXX' })
    }
    const result = await payBatchesWithCredit(req.user!.id, {
      batchIds,
      useCredit: req.body?.useCredit !== false,
      phone,
      context: captureMetaContext(req),
    })
    res.json(result)
  } catch (error) {
    sendWalletError(res, error, 'Failed to pay for your tickets')
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

function parseDates(value: unknown): Date[] | null {
  const raw = Array.isArray(value) ? value : typeof value === 'string' && value ? value.split(',') : []
  if (raw.length > MAX_LATER_PAYMENTS) return null
  const dates = raw.map((d) => new Date(String(d)))
  return dates.some((d) => !Number.isFinite(d.getTime())) ? null : dates
}

export async function previewPlan(req: Request, res: Response) {
  try {
    const eventId = String(req.query.eventId ?? '')
    const total = Number(req.query.total)
    const dates = parseDates(req.query.dates)
    if (!dates) return res.status(400).json({ error: 'Payment dates are not valid' })
    const settings = eventId ? await getEventPlanSettings({ query } as any, eventId) : null
    if (!settings) return res.status(404).json({ error: 'Event not found' })
    if (!settings.enabled) return res.status(400).json({ error: 'Paying in parts is not available for this event' })
    const terms = buildSchedule(total, { ...settings, dates })
    res.json({
      deposit: terms.deposit,
      deadline: terms.deadline,
      remaining: total - terms.deposit,
      depositPct: settings.depositPct,
      deadlineDays: settings.deadlineDays,
      schedule: terms.schedule,
    })
  } catch (error) {
    sendWalletError(res, error, 'Failed to build the payment schedule')
  }
}

export async function createPaymentPlan(req: Request, res: Response) {
  try {
    const { purchaseBatchId } = req.body ?? {}
    if (typeof purchaseBatchId !== 'string' || !purchaseBatchId) {
      return res.status(400).json({ error: 'purchaseBatchId is required' })
    }
    const dates = parseDates(req.body?.dates)
    if (!dates) return res.status(400).json({ error: 'Payment dates are not valid' })
    const plan = await createPlan(req.user!.id, purchaseBatchId, dates)
    res.status(201).json(plan)
  } catch (error) {
    sendWalletError(res, error, 'Failed to reserve your ticket')
  }
}

export async function listPaymentPlans(req: Request, res: Response) {
  try {
    res.json(await getPlansForUser(req.user!.id))
  } catch (error) {
    sendWalletError(res, error, 'Failed to load payments in progress')
  }
}

export async function payPaymentPlan(req: Request, res: Response) {
  try {
    const mode = req.body?.mode === 'all' ? 'all' : 'next'
    const source = req.body?.source === 'credit' ? 'credit' : 'mpesa'
    const phone = source === 'mpesa' ? toKenyanMsisdn(req.body?.phone) : null
    if (source === 'mpesa' && !phone) {
      return res.status(400).json({ error: 'Enter a valid M-Pesa number, e.g. 07XX XXX XXX' })
    }
    await saveMetaContext(`PLAN-${String(req.params.id)}`, captureMetaContext(req))
    const result = await payPlanInstallments(String(req.params.id), req.user!.id, { mode, source, phone })
    res.json(result)
  } catch (error) {
    sendWalletError(res, error, 'Failed to make the payment')
  }
}

/** "I can't make it" / "use what I paid on another event": what was paid becomes ticket credit now. */
export async function releasePaymentPlan(req: Request, res: Response) {
  try {
    const closed = await releasePlanToCredit(String(req.params.id), req.user!.id)
    res.json({ credited: closed.credited, expiresAt: closed.expiresAt, eventTitle: closed.eventTitle })
  } catch (error) {
    sendWalletError(res, error, 'Failed to move your payments to ticket value')
  }
}

/** Moves what was paid towards one event onto a new booking for another event. */
export async function movePaymentPlan(req: Request, res: Response) {
  try {
    const purchaseBatchId = req.body?.purchaseBatchId
    if (typeof purchaseBatchId !== 'string' || !purchaseBatchId) {
      return res.status(400).json({ error: 'purchaseBatchId is required' })
    }
    const phone = req.body?.phone ? toKenyanMsisdn(req.body.phone) : null
    if (req.body?.phone && !phone) {
      return res.status(400).json({ error: 'Enter a valid M-Pesa number, e.g. 07XX XXX XXX' })
    }
    res.json(await movePlanToEvent(String(req.params.id), req.user!.id, { purchaseBatchId, phone }))
  } catch (error) {
    sendWalletError(
      res,
      error,
      'Your earlier payments are now ticket value, but the new booking could not be paid. Finish paying from your dashboard.'
    )
  }
}
