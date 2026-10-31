import { Request, Response } from 'express'
import { query } from '../config/db.js'
import {
  attachTicketTypesToEvents,
  getEventTicketTypes,
} from '../utils/eventTicketTypes.js'
import { isActiveMember, loadSeatState, publicSeatInfo } from '../utils/seatPriority.js'
import { getTicketRules } from '../utils/ticketRules.js'
import { WaitlistError, joinWaitlist, listWaitlist, waitlistCounts } from '../utils/waitlist.js'
import { poolDb } from '../utils/wallet.js'

type EventRow = { id: string; [key: string]: any }

async function zonesByEvent(eventIds: string[]): Promise<Map<string, { id: string; name: string }[]>> {
  const map = new Map<string, { id: string; name: string }[]>()
  if (eventIds.length === 0) return map
  const result = await query(
    `SELECT ez.event_id, r.id, r.name FROM event_zones ez JOIN regions r ON r.id = ez.zone_id
     WHERE ez.event_id = ANY($1::uuid[]) ORDER BY r.name`,
    [eventIds]
  )
  for (const row of result.rows) {
    const list = map.get(row.event_id) ?? []
    list.push({ id: row.id, name: row.name })
    map.set(row.event_id, list)
  }
  return map
}

/** Public view: seat availability for this viewer only; member seat counts are never exposed. */
async function withPublicSeats<T extends EventRow>(events: T[], userId: string | null | undefined) {
  const member = await isActiveMember(poolDb, userId)
  return Promise.all(
    events.map(async (event) => {
      const { cancel_reason: _reason, scan_list_confirmed_by: _by, priority_release_notified_at: _n, ...rest } = event
      return { ...rest, ...publicSeatInfo(await loadSeatState(poolDb, event.id), member) }
    })
  )
}

/** Admin view: full seat breakdown and zones. */
export async function withAdminDetails<T extends EventRow>(events: T[]) {
  const ids = events.map((e) => e.id)
  const [zones, waiting] = await Promise.all([zonesByEvent(ids), waitlistCounts(ids)])
  return Promise.all(
    events.map(async (event) => ({
      ...event,
      zones: zones.get(event.id) ?? [],
      seat_breakdown: await loadSeatState(poolDb, event.id),
      waitlist_count: waiting.get(event.id) ?? 0,
    }))
  )
}

export async function getEventWaitlist(req: Request, res: Response) {
  try {
    res.json(await listWaitlist(String(req.params.id)))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load the waiting list' })
  }
}

export const getEvents = async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM events WHERE is_active = true AND cancelled_at IS NULL ORDER BY event_date ASC'
    )
    const events = await attachTicketTypesToEvents(result.rows, true)
    res.json(await withPublicSeats(events, req.user?.id))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch events' })
  }
}

export const getEventById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const result = await query('SELECT * FROM events WHERE id = $1', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' })
    }
    const events = await attachTicketTypesToEvents(result.rows, true)
    const [event] = await withPublicSeats(events, req.user?.id)
    const rules = await getTicketRules()
    res.json({
      ...event,
      payment_rules: {
        credit_days: rules.creditDays,
        deposit_pct: rules.depositPct,
        deadline_days: event.payment_deadline_days ?? rules.defaultDeadlineDays,
        early_notice_hours: rules.earlyNoticeHours,
        terms_version: rules.termsVersion,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch event' })
  }
}

interface EventSettings {
  installmentsAllowed?: number
  paymentDeadlineDays?: number | null
  memberPriorityPct?: number | null
  capacity?: number | null
  zoneIds?: string[]
}

function optionalInt(value: unknown, min: number, max: number): number | null | undefined | 'invalid' {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : 'invalid'
}

/** Parses the optional event settings. Returns an error message when one is invalid. */
export function parseEventSettings(body: any): EventSettings | string {
  const settings: EventSettings = {}
  const installments = body.installments_enabled ?? body.installments_allowed
  if (installments !== undefined && installments !== null && installments !== '') {
    settings.installmentsAllowed = installments === true || Number(installments) > 0 ? 1 : 0
  }
  const deadline = optionalInt(body.payment_deadline_days, 0, 30)
  if (deadline === 'invalid') return 'payment_deadline_days must be a whole number from 0 to 30'
  if (deadline !== undefined) settings.paymentDeadlineDays = deadline
  const priority = optionalInt(body.member_priority_pct, 0, 100)
  if (priority === 'invalid') return 'member_priority_pct must be a whole number from 0 to 100'
  if (priority !== undefined) settings.memberPriorityPct = priority
  const capacity = optionalInt(body.capacity, 0, 1_000_000)
  if (capacity === 'invalid') return 'capacity must be a whole number or empty'
  if (capacity !== undefined) settings.capacity = capacity
  if (body.zone_ids !== undefined) {
    if (!Array.isArray(body.zone_ids) || body.zone_ids.some((z: unknown) => typeof z !== 'string')) {
      return 'zone_ids must be a list of zone ids'
    }
    settings.zoneIds = body.zone_ids
  }
  return settings
}

async function saveEventSettings(eventId: string, settings: EventSettings) {
  const sets: string[] = []
  const params: unknown[] = [eventId]
  const add = (column: string, value: unknown) => {
    params.push(value)
    sets.push(`${column} = $${params.length}`)
  }
  if (settings.installmentsAllowed !== undefined) add('installments_allowed', settings.installmentsAllowed)
  if (settings.paymentDeadlineDays !== undefined) add('payment_deadline_days', settings.paymentDeadlineDays)
  if (settings.memberPriorityPct !== undefined) add('member_priority_pct', settings.memberPriorityPct)
  if (settings.capacity !== undefined) add('capacity', settings.capacity)
  if (sets.length > 0) await query(`UPDATE events SET ${sets.join(', ')} WHERE id = $1`, params)
  if (settings.zoneIds !== undefined) {
    await query('DELETE FROM event_zones WHERE event_id = $1', [eventId])
    if (settings.zoneIds.length > 0) {
      await query(
        `INSERT INTO event_zones (event_id, zone_id)
         SELECT $1, r.id FROM regions r WHERE r.id = ANY($2::uuid[]) ON CONFLICT DO NOTHING`,
        [eventId, settings.zoneIds]
      )
    }
  }
}

async function loadAdminEvent(eventId: string) {
  const fresh = await query('SELECT * FROM events WHERE id = $1', [eventId])
  const [event] = await withAdminDetails(await attachTicketTypesToEvents(fresh.rows, false))
  return event
}

export const createEvent = async (req: Request, res: Response) => {
  try {
    const { title, description, location, event_date, image_url } = req.body
    const settings = parseEventSettings(req.body)
    if (typeof settings === 'string') return res.status(400).json({ error: settings })
    const result = await query(
      `INSERT INTO events (title, description, location, event_date, price, capacity, image_url, installments_allowed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [title, description, location, event_date, 0, null, image_url, settings.installmentsAllowed ?? 0]
    )
    await saveEventSettings(result.rows[0].id, settings)
    res.status(201).json(await loadAdminEvent(result.rows[0].id))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to create event' })
  }
}

export const updateEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { title, description, location, event_date, image_url, is_active } = req.body
    const settings = parseEventSettings(req.body)
    if (typeof settings === 'string') return res.status(400).json({ error: settings })
    const result = await query(
      `UPDATE events
       SET title = $1, description = $2, location = $3, event_date = $4,
           image_url = $5, is_active = $6
       WHERE id = $7 RETURNING id`,
      [title, description, location, event_date, image_url, is_active, id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' })
    }
    await saveEventSettings(String(id), settings)
    res.json(await loadAdminEvent(String(id)))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to update event' })
  }
}

export async function joinEventWaitlist(req: Request, res: Response) {
  try {
    const result = await joinWaitlist(String(req.params.id), {
      userId: req.user?.id ?? null,
      name: typeof req.body?.name === 'string' ? req.body.name : null,
      email: typeof req.body?.email === 'string' ? req.body.email : '',
      phone: typeof req.body?.phone === 'string' ? req.body.phone : null,
    })
    res.status(201).json(result)
  } catch (error) {
    if (error instanceof WaitlistError) return res.status(error.status).json({ error: error.message })
    console.error(error)
    res.status(500).json({ error: 'Failed to join the waiting list' })
  }
}

export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await query('DELETE FROM events WHERE id = $1', [id])
    res.json({ message: 'Event deleted' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to delete event' })
  }
}

export async function createEventTicketType(req: Request, res: Response) {
  try {
    const { eventId } = req.params
    const { name, description, price, capacity, sort_order, is_active } = req.body

    const trimmedName = String(name || '').trim()
    if (!trimmedName) {
      return res.status(400).json({ error: 'Name is required' })
    }

    const typePrice = Number(price)
    if (!Number.isFinite(typePrice) || typePrice < 0) {
      return res.status(400).json({ error: 'price must be a non-negative number' })
    }

    const eventCheck = await query('SELECT id FROM events WHERE id = $1', [eventId])
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' })
    }

    const cap =
      capacity === null || capacity === undefined || capacity === ''
        ? null
        : Number(capacity)
    if (cap != null && (!Number.isFinite(cap) || cap < 0)) {
      return res.status(400).json({ error: 'capacity must be a non-negative number or null' })
    }

    const order = Number.isFinite(Number(sort_order)) ? Number(sort_order) : 0
    const active = typeof is_active === 'boolean' ? is_active : true

    const result = await query(
      `INSERT INTO event_ticket_types
         (event_id, name, description, price, capacity, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [eventId, trimmedName, description || null, typePrice, cap, order, active]
    )

    const types = await getEventTicketTypes(eventId, false)
    const created = types.find((t) => t.id === result.rows[0].id)
    res.status(201).json(created || result.rows[0])
  } catch (error: unknown) {
    const pgError = error as { code?: string }
    console.error('Error creating ticket type:', error)
    if (pgError?.code === '23505') {
      return res.status(400).json({ error: 'A ticket type with this name already exists for the event' })
    }
    res.status(500).json({ error: 'Failed to create ticket type' })
  }
}

export async function updateEventTicketType(req: Request, res: Response) {
  try {
    const { eventId, typeId } = req.params
    const { name, description, price, capacity, sort_order, is_active } = req.body

    const trimmedName = String(name || '').trim()
    if (!trimmedName) {
      return res.status(400).json({ error: 'Name is required' })
    }

    const typePrice = Number(price)
    if (!Number.isFinite(typePrice) || typePrice < 0) {
      return res.status(400).json({ error: 'price must be a non-negative number' })
    }

    const cap =
      capacity === null || capacity === undefined || capacity === ''
        ? null
        : Number(capacity)
    if (cap != null && (!Number.isFinite(cap) || cap < 0)) {
      return res.status(400).json({ error: 'capacity must be a non-negative number or null' })
    }

    const order = Number.isFinite(Number(sort_order)) ? Number(sort_order) : 0
    const active = typeof is_active === 'boolean' ? is_active : true

    const result = await query(
      `UPDATE event_ticket_types
       SET name = $1, description = $2, price = $3, capacity = $4,
           sort_order = $5, is_active = $6
       WHERE id = $7 AND event_id = $8
       RETURNING *`,
      [trimmedName, description || null, typePrice, cap, order, active, typeId, eventId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket type not found' })
    }

    const types = await getEventTicketTypes(eventId, false)
    const updated = types.find((t) => t.id === typeId)
    res.json(updated || result.rows[0])
  } catch (error: unknown) {
    const pgError = error as { code?: string }
    console.error('Error updating ticket type:', error)
    if (pgError?.code === '23505') {
      return res.status(400).json({ error: 'A ticket type with this name already exists for the event' })
    }
    res.status(500).json({ error: 'Failed to update ticket type' })
  }
}

export async function deleteEventTicketType(req: Request, res: Response) {
  try {
    const { eventId, typeId } = req.params

    const ticketCheck = await query(
      `SELECT COUNT(*)::int AS cnt FROM tickets WHERE ticket_type_id = $1`,
      [typeId]
    )
    if (ticketCheck.rows[0].cnt > 0) {
      await query(
        `UPDATE event_ticket_types SET is_active = false WHERE id = $1 AND event_id = $2`,
        [typeId, eventId]
      )
      return res.json({
        deactivated: true,
        message: 'Ticket type has purchases; deactivated instead of deleted',
      })
    }

    const result = await query(
      `DELETE FROM event_ticket_types WHERE id = $1 AND event_id = $2 RETURNING id`,
      [typeId, eventId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket type not found' })
    }

    res.json({ deleted: true })
  } catch (error) {
    console.error('Error deleting ticket type:', error)
    res.status(500).json({ error: 'Failed to delete ticket type' })
  }
}
