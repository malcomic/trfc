import { Request, Response } from 'express'
import { AttendanceError } from '../utils/attendance.js'
import {
  admitMemberCheckin,
  codeFromInput,
  listCheckinEvents,
  lookupMemberCheckin,
} from '../utils/memberCheckins.js'

function sendError(res: Response, error: unknown, fallback: string) {
  if (error instanceof AttendanceError) return res.status(error.status).json({ error: error.message })
  console.error(error)
  return res.status(500).json({ error: fallback })
}

function eventIdFrom(body: unknown): string | null {
  const eventId = (body as { eventId?: unknown })?.eventId
  return typeof eventId === 'string' && eventId.trim() ? eventId.trim() : null
}

export async function getCheckinEvents(req: Request, res: Response) {
  try {
    res.json(await listCheckinEvents(req.user!))
  } catch (error) {
    sendError(res, error, 'Failed to load events')
  }
}

export async function lookupCheckin(req: Request, res: Response) {
  try {
    const eventId = eventIdFrom(req.body)
    if (!eventId) return res.status(400).json({ error: 'Choose an event first' })
    const input = codeFromInput(req.body ?? {})
    if (!input) return res.json({ status: 'not_found', member: null, checkedInAt: null })
    res.json(await lookupMemberCheckin(req.user!, eventId, input.code))
  } catch (error) {
    sendError(res, error, 'Lookup failed')
  }
}

export async function admitCheckin(req: Request, res: Response) {
  try {
    const eventId = eventIdFrom(req.body)
    if (!eventId) return res.status(400).json({ error: 'Choose an event first' })
    const input = codeFromInput(req.body ?? {})
    if (!input) return res.status(404).json({ status: 'not_found', member: null, checkedInAt: null })
    const result = await admitMemberCheckin(req.user!, eventId, input.code, input.method)
    const httpStatus =
      result.status === 'valid' ? 200 : result.status === 'already_checked_in' ? 409 : result.status === 'wrong_zone' ? 403 : 404
    res.status(httpStatus).json(result)
  } catch (error) {
    sendError(res, error, 'Check-in failed')
  }
}
