import { Request, Response } from 'express'
import {
  AttendanceError,
  canActOnEvent,
  cancelEventByTrfc,
  confirmScanList,
  getScanList,
  listManageableEvents,
  markPresent,
} from '../utils/attendance.js'
import { poolDb } from '../utils/wallet.js'

function sendError(res: Response, error: unknown, fallback: string) {
  if (error instanceof AttendanceError) return res.status(error.status).json({ error: error.message })
  console.error(error)
  return res.status(500).json({ error: fallback })
}

async function assertCanAct(req: Request, eventId: string) {
  if (!(await canActOnEvent(poolDb, req.user!, eventId))) {
    throw new AttendanceError('You can only manage scan lists for events in your zone', 403)
  }
}

export async function listAttendanceEvents(req: Request, res: Response) {
  try {
    res.json(await listManageableEvents(req.user!))
  } catch (error) {
    sendError(res, error, 'Failed to load events')
  }
}

export async function getEventScanList(req: Request, res: Response) {
  try {
    const eventId = String(req.params.id)
    await assertCanAct(req, eventId)
    res.json(await getScanList(eventId))
  } catch (error) {
    sendError(res, error, 'Failed to load the scan list')
  }
}

export async function confirmEventScanList(req: Request, res: Response) {
  try {
    const eventId = String(req.params.id)
    await assertCanAct(req, eventId)
    res.json(await confirmScanList(eventId, req.user!.id))
  } catch (error) {
    sendError(res, error, 'Failed to confirm the scan list')
  }
}

export async function markTicketPresent(req: Request, res: Response) {
  try {
    res.json(await markPresent(String(req.params.id), req.user!))
  } catch (error) {
    sendError(res, error, 'Failed to mark the member present')
  }
}

export async function cancelEvent(req: Request, res: Response) {
  try {
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : ''
    if (reason.length < 3) return res.status(400).json({ error: 'Give a short reason, e.g. "Heavy rain"' })
    res.json(await cancelEventByTrfc(String(req.params.id), reason.slice(0, 500), req.user!.id))
  } catch (error) {
    sendError(res, error, 'Failed to cancel the event')
  }
}
