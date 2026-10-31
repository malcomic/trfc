import { Request, Response } from 'express'
import {
  SettlementError,
  addEventCost,
  approveSettlement,
  deleteEventCost,
  getSettlement,
} from '../utils/eventSettlement.js'

function sendSettlementError(res: Response, error: unknown, fallback: string) {
  if (error instanceof SettlementError) return res.status(error.status).json({ error: error.message })
  console.error(error)
  return res.status(500).json({ error: fallback })
}

export async function getEventSettlement(req: Request, res: Response) {
  try {
    res.json(await getSettlement(String(req.params.id)))
  } catch (error) {
    sendSettlementError(res, error, 'Failed to load the event settlement')
  }
}

export async function createEventCost(req: Request, res: Response) {
  try {
    res.status(201).json(await addEventCost(String(req.params.id), req.body?.label, req.body?.amount, req.user!.id))
  } catch (error) {
    sendSettlementError(res, error, 'Failed to add the cost')
  }
}

export async function removeEventCost(req: Request, res: Response) {
  try {
    await deleteEventCost(String(req.params.id), String(req.params.costId))
    res.json({ message: 'Cost removed' })
  } catch (error) {
    sendSettlementError(res, error, 'Failed to remove the cost')
  }
}

export async function approveEventSettlement(req: Request, res: Response) {
  try {
    await approveSettlement(String(req.params.id), req.user!.id)
    res.json(await getSettlement(String(req.params.id)))
  } catch (error) {
    sendSettlementError(res, error, 'Failed to approve the settlement')
  }
}
