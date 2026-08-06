import { Request, Response } from 'express'
import { query } from '../config/db.js'
import {
  normalizeShortCode,
  parseScanPayload,
  shortMedalCode,
  shortTicketCode,
} from '../utils/qrCodeGenerator.js'

type TicketStatus =
  | 'valid'
  | 'already_checked_in'
  | 'unpaid'
  | 'not_found'
  | 'wrong_event'
  | 'ambiguous'

type MedalStatus =
  | 'valid'
  | 'already_redeemed'
  | 'unpaid'
  | 'not_found'
  | 'ambiguous'

async function findTicketById(ticketId: string) {
  const result = await query(
    `SELECT t.*, e.title AS event_title, e.event_date
     FROM tickets t
     LEFT JOIN events e ON t.event_id = e.id
     WHERE t.id = $1`,
    [ticketId]
  )
  return result.rows[0] || null
}

async function findMedalById(purchaseId: string) {
  const result = await query(
    `SELECT p.*,
            t.name AS tier_name,
            t.slug AS tier_slug,
            o.distance_km
     FROM medal_purchases p
     JOIN medal_options o ON p.medal_option_id = o.id
     JOIN medal_tiers t ON o.tier_id = t.id
     WHERE p.id = $1`,
    [purchaseId]
  )
  return result.rows[0] || null
}

async function findByShortCode(table: 'tickets' | 'medal_purchases', shortCode: string) {
  const result = await query(
    `SELECT id FROM ${table}
     WHERE REPLACE(id::text, '-', '') ILIKE $1
     LIMIT 5`,
    [`${shortCode}%`]
  )
  return result.rows
}

function ticketResponse(row: any, status: TicketStatus) {
  return {
    kind: 'ticket' as const,
    status,
    ticket: {
      id: row.id,
      shortCode: shortTicketCode(row.id),
      attendeeName: row.attendee_name || null,
      email: row.email || null,
      phone: row.phone || null,
      eventId: row.event_id,
      eventTitle: row.event_title || null,
      eventDate: row.event_date || null,
      paymentStatus: row.payment_status,
      checkedInAt: row.checked_in_at || null,
    },
  }
}

function medalResponse(row: any, status: MedalStatus) {
  return {
    kind: 'medal' as const,
    status,
    purchase: {
      id: row.id,
      shortCode: shortMedalCode(row.id),
      buyerName: row.buyer_name || null,
      email: row.email || null,
      phone: row.phone || null,
      tierName: row.tier_name || null,
      tierSlug: row.tier_slug || null,
      distanceKm: row.distance_km,
      paymentStatus: row.payment_status,
      redeemedAt: row.redeemed_at || null,
    },
  }
}

function deriveTicketStatus(row: any, eventFilterId?: string): TicketStatus {
  if (eventFilterId && row.event_id && row.event_id !== eventFilterId) {
    return 'wrong_event'
  }
  if (row.payment_status !== 'paid') return 'unpaid'
  if (row.checked_in_at) return 'already_checked_in'
  return 'valid'
}

function deriveMedalStatus(row: any): MedalStatus {
  if (row.payment_status !== 'paid') return 'unpaid'
  if (row.redeemed_at) return 'already_redeemed'
  return 'valid'
}

export async function listScanEvents(_req: Request, res: Response) {
  try {
    const result = await query(
      `SELECT id, title, event_date
       FROM events
       WHERE is_active = true
       ORDER BY event_date DESC`
    )
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch events' })
  }
}

export async function lookupScan(req: Request, res: Response) {
  try {
    const { payload, shortCode, eventId } = req.body as {
      payload?: string
      shortCode?: string
      eventId?: string
    }
    const eventFilter = typeof eventId === 'string' && eventId.trim() ? eventId.trim() : undefined

    let kind: 'ticket' | 'medal' | null = null
    let entityId: string | null = null

    if (payload && typeof payload === 'string') {
      const parsed = parseScanPayload(payload)
      if (!parsed) {
        const asShort = normalizeShortCode(payload)
        if (asShort) {
          const ticketHits = await findByShortCode('tickets', asShort)
          const medalHits = await findByShortCode('medal_purchases', asShort)
          const total = ticketHits.length + medalHits.length
          if (total === 0) {
            return res.json({ kind: null, status: 'not_found' })
          }
          if (total > 1 || (ticketHits.length === 1 && medalHits.length === 1)) {
            return res.json({ kind: null, status: 'ambiguous' })
          }
          if (ticketHits.length === 1) {
            kind = 'ticket'
            entityId = ticketHits[0].id
          } else {
            kind = 'medal'
            entityId = medalHits[0].id
          }
        } else {
          return res.json({ kind: null, status: 'not_found' })
        }
      } else {
        kind = parsed.kind
        entityId = parsed.kind === 'ticket' ? parsed.ticketId : parsed.purchaseId
      }
    } else if (shortCode && typeof shortCode === 'string') {
      const normalized = normalizeShortCode(shortCode)
      if (!normalized) {
        return res.status(400).json({ error: 'Invalid short code' })
      }

      const typeHint = (req.body as { type?: string }).type
      if (typeHint === 'medal') {
        const hits = await findByShortCode('medal_purchases', normalized)
        if (hits.length === 0) return res.json({ kind: 'medal', status: 'not_found' })
        if (hits.length > 1) return res.json({ kind: 'medal', status: 'ambiguous' })
        kind = 'medal'
        entityId = hits[0].id
      } else if (typeHint === 'ticket') {
        const hits = await findByShortCode('tickets', normalized)
        if (hits.length === 0) return res.json({ kind: 'ticket', status: 'not_found' })
        if (hits.length > 1) return res.json({ kind: 'ticket', status: 'ambiguous' })
        kind = 'ticket'
        entityId = hits[0].id
      } else {
        const ticketHits = await findByShortCode('tickets', normalized)
        const medalHits = await findByShortCode('medal_purchases', normalized)
        const total = ticketHits.length + medalHits.length
        if (total === 0) return res.json({ kind: null, status: 'not_found' })
        if (total > 1) return res.json({ kind: null, status: 'ambiguous' })
        if (ticketHits.length === 1) {
          kind = 'ticket'
          entityId = ticketHits[0].id
        } else {
          kind = 'medal'
          entityId = medalHits[0].id
        }
      }
    } else {
      return res.status(400).json({ error: 'payload or shortCode is required' })
    }

    if (!kind || !entityId) {
      return res.json({ kind: null, status: 'not_found' })
    }

    if (kind === 'ticket') {
      const row = await findTicketById(entityId)
      if (!row) return res.json({ kind: 'ticket', status: 'not_found' })
      const status = deriveTicketStatus(row, eventFilter)
      return res.json(ticketResponse(row, status))
    }

    const row = await findMedalById(entityId)
    if (!row) return res.json({ kind: 'medal', status: 'not_found' })
    return res.json(medalResponse(row, deriveMedalStatus(row)))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Lookup failed' })
  }
}

export async function admitScan(req: Request, res: Response) {
  try {
    const staffId = req.user?.id
    if (!staffId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { kind, id, eventId } = req.body as {
      kind?: string
      id?: string
      eventId?: string
    }

    if (!kind || !id || (kind !== 'ticket' && kind !== 'medal')) {
      return res.status(400).json({ error: 'kind and id are required' })
    }

    const eventFilter = typeof eventId === 'string' && eventId.trim() ? eventId.trim() : undefined

    if (kind === 'ticket') {
      const existing = await findTicketById(id)
      if (!existing) {
        return res.status(404).json({ kind: 'ticket', status: 'not_found' })
      }

      const status = deriveTicketStatus(existing, eventFilter)
      if (status === 'wrong_event') {
        return res.status(400).json(ticketResponse(existing, 'wrong_event'))
      }
      if (status === 'unpaid') {
        return res.status(400).json(ticketResponse(existing, 'unpaid'))
      }
      if (status === 'already_checked_in') {
        return res.status(409).json(ticketResponse(existing, 'already_checked_in'))
      }

      const result = await query(
        `UPDATE tickets
         SET checked_in_at = NOW(), checked_in_by = $1
         WHERE id = $2
           AND payment_status = 'paid'
           AND checked_in_at IS NULL
         RETURNING id, checked_in_at, checked_in_by`,
        [staffId, id]
      )

      if (result.rows.length === 0) {
        const again = await findTicketById(id)
        if (!again) return res.status(404).json({ kind: 'ticket', status: 'not_found' })
        const againStatus = deriveTicketStatus(again, eventFilter)
        return res.status(409).json(ticketResponse(again, againStatus === 'valid' ? 'already_checked_in' : againStatus))
      }

      const updated = await findTicketById(id)
      return res.json(ticketResponse(updated, 'already_checked_in'))
    }

    const existing = await findMedalById(id)
    if (!existing) {
      return res.status(404).json({ kind: 'medal', status: 'not_found' })
    }

    const medalStatus = deriveMedalStatus(existing)
    if (medalStatus === 'unpaid') {
      return res.status(400).json(medalResponse(existing, 'unpaid'))
    }
    if (medalStatus === 'already_redeemed') {
      return res.status(409).json(medalResponse(existing, 'already_redeemed'))
    }

    const result = await query(
      `UPDATE medal_purchases
       SET redeemed_at = NOW(), redeemed_by = $1
       WHERE id = $2
         AND payment_status = 'paid'
         AND redeemed_at IS NULL
       RETURNING id, redeemed_at, redeemed_by`,
      [staffId, id]
    )

    if (result.rows.length === 0) {
      const again = await findMedalById(id)
      if (!again) return res.status(404).json({ kind: 'medal', status: 'not_found' })
      return res.status(409).json(medalResponse(again, 'already_redeemed'))
    }

    const updated = await findMedalById(id)
    return res.json(medalResponse(updated, 'already_redeemed'))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Admit failed' })
  }
}
