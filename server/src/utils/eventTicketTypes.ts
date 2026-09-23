import { query } from '../config/db.js'

export interface EventTicketTypeRow {
  id: string
  event_id: string
  name: string
  description: string | null
  price: number
  capacity: number | null
  sort_order: number
  is_active: boolean
  remaining: number | null
  is_sold_out: boolean
}

export async function getEventTicketTypes(
  eventId: string,
  activeOnly = true
): Promise<EventTicketTypeRow[]> {
  const result = await query(
    `SELECT
       ett.id, ett.event_id, ett.name, ett.description, ett.price, ett.capacity,
       ett.sort_order, ett.is_active,
       COALESCE(sold.cnt, 0)::int AS sold_count
     FROM event_ticket_types ett
     LEFT JOIN (
       SELECT ticket_type_id, COUNT(*)::int AS cnt
       FROM tickets
       WHERE payment_status IN ('pending', 'paid')
         AND ticket_type_id IS NOT NULL
       GROUP BY ticket_type_id
     ) sold ON sold.ticket_type_id = ett.id
     WHERE ett.event_id = $1 ${activeOnly ? 'AND ett.is_active = true' : ''}
     ORDER BY ett.sort_order ASC, ett.price ASC, ett.created_at ASC`,
    [eventId]
  )

  return result.rows.map((row) => {
    const capacity = row.capacity != null ? Number(row.capacity) : null
    const sold = Number(row.sold_count) || 0
    const remaining = capacity != null ? Math.max(0, capacity - sold) : null
    const isSoldOut = capacity != null && remaining === 0
    return {
      id: row.id,
      event_id: row.event_id,
      name: row.name,
      description: row.description,
      price: Number(row.price),
      capacity,
      sort_order: Number(row.sort_order) || 0,
      is_active: Boolean(row.is_active),
      remaining,
      is_sold_out: isSoldOut,
    }
  })
}

export async function attachTicketTypesToEvents<T extends { id: string }>(
  events: T[],
  activeOnly = true
): Promise<
  Array<
    T & {
      ticket_types: EventTicketTypeRow[]
      min_price: number | null
      all_types_sold_out: boolean
    }
  >
> {
  return Promise.all(
    events.map(async (event) => {
      const ticket_types = await getEventTicketTypes(event.id, activeOnly)
      const prices = ticket_types.filter((t) => t.is_active).map((t) => t.price)
      const activeTypes = ticket_types.filter((t) => t.is_active)
      return {
        ...event,
        ticket_types,
        min_price: prices.length > 0 ? Math.min(...prices) : null,
        all_types_sold_out:
          activeTypes.length > 0 && activeTypes.every((t) => t.is_sold_out),
      }
    })
  )
}
