import { Request, Response } from 'express'
import { AttendanceError } from '../utils/attendance.js'
import {
  admitMemberCheckin,
  codeFromInput,
  listCheckinEvents,
  listScannedMembers,
  lookupMemberCheckin,
  recordFinishTime,
  setEventHeadcount,
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

const STATUS_HTTP: Record<string, number> = {
  valid: 200,
  already_checked_in: 409,
  wrong_zone: 403,
  not_found: 404,
  not_eligible: 403,
  outside_window: 403,
  self_scan: 403,
  season_frozen: 403,
}

export async function getCheckinEvents(req: Request, res: Response) {
  try {
    res.json(await listCheckinEvents(req.user!))
  } catch (error) {
    sendError(res, error, 'Failed to load events')
  }
}

export async function getScannedMembers(req: Request, res: Response) {
  try {
    res.json(await listScannedMembers(req.user!, req.params.id))
  } catch (error) {
    sendError(res, error, 'Failed to load scanned members')
  }
}

export async function lookupCheckin(req: Request, res: Response) {
  try {
    const eventId = eventIdFrom(req.body)
    if (!eventId) return res.status(400).json({ error: 'Choose an event first' })
    const input = codeFromInput(req.body ?? {})
    if (!input) return res.json({ status: 'not_found', member: null, checkedInAt: null })
    res.json(await lookupMemberCheckin(req.user!, eventId, input))
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
    const result = await admitMemberCheckin(req.user!, eventId, input)
    res.status(STATUS_HTTP[result.status] ?? 400).json(result)
  } catch (error) {
    sendError(res, error, 'Check-in failed')
  }
}

export async function putEventHeadcount(req: Request, res: Response) {
  try {
    const count = Number((req.body as { count?: unknown })?.count)
    res.json(await setEventHeadcount(req.user!, req.params.id, count))
  } catch (error) {
    sendError(res, error, 'Failed to save headcount')
  }
}

export async function postFinishTime(req: Request, res: Response) {
  try {
    const userId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : ''
    const seconds = Number(req.body?.seconds)
    if (!userId) return res.status(400).json({ error: 'userId is required' })
    res.status(201).json(await recordFinishTime(req.user!, req.params.id, userId, seconds))
  } catch (error) {
    sendError(res, error, 'Failed to save finish time')
  }
}
