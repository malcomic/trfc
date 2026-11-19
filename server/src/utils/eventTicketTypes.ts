import { query } from '../config/db.js'
import { buildPrivateTicketUrl } from './privateTicketLinks.js'

export interface EventTicketTypeRow {
  id: string
  event_id: string
  name: string
  description: string | null
  price: number
  capacity: number | null
  sort_order: number
  is_active: boolean
  members_only: boolean
  is_private: boolean
  /** Present only when includePrivate and the type is private; never returned on public APIs. */
  private_url?: string | null
  remaining: number | null
  is_sold_out: boolean
}

export type TicketTypeQueryOptions = {
  activeOnly?: boolean
  /** When false (public), private types are omitted. When true (admin), they are included with private_url. */
  includePrivate?: boolean
}

function normalizeOptions(
  options: boolean | TicketTypeQueryOptions = true
): Required<TicketTypeQueryOptions> {
  if (typeof options === 'boolean') {
    return { activeOnly: options, includePrivate: !options }
  }
  return {
    activeOnly: options.activeOnly ?? true,
    includePrivate: options.includePrivate ?? false,
  }
}

export async function getEventTicketTypes(
  eventId: string,
  options: boolean | TicketTypeQueryOptions = true
): Promise<EventTicketTypeRow[]> {
  const { activeOnly, includePrivate } = normalizeOptions(options)

  const result = await query(
    `SELECT
       ett.id, ett.event_id, ett.name, ett.description, ett.price, ett.capacity,
       ett.sort_order, ett.is_active, ett.members_only, ett.is_private, ett.private_token,
       COALESCE(sold.cnt, 0)::int AS sold_count
     FROM event_ticket_types ett
     LEFT JOIN (
       SELECT ticket_type_id, COUNT(*)::int AS cnt
       FROM tickets
       WHERE payment_status IN ('pending', 'paid', 'reserved')
         AND ticket_type_id IS NOT NULL
       GROUP BY ticket_type_id
     ) sold ON sold.ticket_type_id = ett.id
     WHERE ett.event_id = $1
       ${activeOnly ? 'AND ett.is_active = true' : ''}
       ${includePrivate ? '' : 'AND ett.is_private = false'}
     ORDER BY ett.sort_order ASC, ett.price ASC, ett.created_at ASC`,
    [eventId]
  )

  return result.rows.map((row) => {
    const capacity = row.capacity != null ? Number(row.capacity) : null
    const sold = Number(row.sold_count) || 0
    const remaining = capacity != null ? Math.max(0, capacity - sold) : null
    const isSoldOut = capacity != null && remaining === 0
    const isPrivate = Boolean(row.is_private)
    const mapped: EventTicketTypeRow = {
      id: row.id,
      event_id: row.event_id,
      name: row.name,
      description: row.description,
      price: Number(row.price),
      capacity,
      sort_order: Number(row.sort_order) || 0,
      is_active: Boolean(row.is_active),
      members_only: Boolean(row.members_only),
      is_private: isPrivate,
      remaining,
      is_sold_out: isSoldOut,
    }
    if (includePrivate && isPrivate && row.private_token) {
      mapped.private_url = buildPrivateTicketUrl(String(row.private_token))
    }
    return mapped
  })
}

export async function attachTicketTypesToEvents<T extends { id: string }>(
  events: T[],
  options: boolean | TicketTypeQueryOptions = true
): Promise<
  Array<
    T & {
      ticket_types: EventTicketTypeRow[]
      min_price: number | null
      all_types_sold_out: boolean
    }
  >
> {
  const normalized = normalizeOptions(options)
  return Promise.all(
    events.map(async (event) => {
      const ticket_types = await getEventTicketTypes(event.id, normalized)
      // Public pricing stats ignore private types even when admin includes them in the list.
      const publicActive = ticket_types.filter((t) => t.is_active && !t.is_private)
      const prices = publicActive.map((t) => t.price)
      return {
        ...event,
        ticket_types,
        min_price: prices.length > 0 ? Math.min(...prices) : null,
        all_types_sold_out:
          publicActive.length > 0 && publicActive.every((t) => t.is_sold_out),
      }
    })
  )
}
