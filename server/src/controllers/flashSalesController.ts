import { Request, Response } from 'express'
import { getClient, query } from '../config/db.js'
import {
  FLASH_ACCESS_HOURS,
  findEligibleTicket,
  resolveFlashAccess,
  signFlashToken,
  signGuestFlashToken,
} from '../utils/flashAccess.js'
import {
  SHARE_LINK_HOURS,
  ShareLinkError,
  createShareLink,
  listShareLinks,
  parseMaxUses,
  redeemShareLink,
  revokeShareLink,
} from '../utils/flashShareLinks.js'
import { sendEmail } from '../utils/emailService.js'
import { buildFlashShareLinkEmailHTML, buildFlashShareLinkEmailText } from '../utils/emailTemplates.js'
import { variantsJsonSql } from '../utils/productVariants.js'
import { isUuid, productInZoneSql, zonesJsonSql } from '../utils/zones.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Units reserved by a flash sale: paid orders plus pending orders from the last 15 minutes. */
export const FLASH_SOLD_UNITS_SQL = `
  COALESCE((
    SELECT SUM(oi.quantity)
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.flash_sale_id = fs.id
      AND (
        o.payment_status = 'paid'
        OR (o.payment_status = 'pending' AND o.created_at > NOW() - INTERVAL '15 minutes')
      )
  ), 0)::int
`

const LIVE_CONDITION = `
  fs.is_active = true
  AND fs.starts_at <= NOW()
  AND (fs.ends_at IS NULL OR fs.ends_at > NOW())
`

/**
 * True when the sale has no unlock rows, or one of them matches the buyer's events (whole-event
 * rows) or ticket types. The params must be uuid[]; guests pass empty arrays.
 */
export function flashSaleUnlockedSql(alias: string, eventIdsParam: string, typeIdsParam: string): string {
  return `(
    NOT EXISTS (SELECT 1 FROM flash_sale_unlocks u WHERE u.flash_sale_id = ${alias}.id)
    OR EXISTS (
      SELECT 1 FROM flash_sale_unlocks u
      WHERE u.flash_sale_id = ${alias}.id
        AND (
          (u.ticket_type_id IS NULL AND u.event_id = ANY(${eventIdsParam}::uuid[]))
          OR u.ticket_type_id = ANY(${typeIdsParam}::uuid[])
        )
    )
  )`
}

/** Labels like "Night Run" or "Night Run: VIP" for the events a sale is locked to. */
const UNLOCK_LABELS_SQL = `
  COALESCE((
    SELECT json_agg(DISTINCT CASE WHEN ett.name IS NULL THEN e.title ELSE e.title || ': ' || ett.name END)
    FROM flash_sale_unlocks u
    JOIN events e ON e.id = u.event_id
    LEFT JOIN event_ticket_types ett ON ett.id = u.ticket_type_id
    WHERE u.flash_sale_id = fs.id
  ), '[]'::json)
`

function withRemaining<T extends { quantity_limit: number | null; sold_units: number }>(row: T) {
  const remaining =
    row.quantity_limit == null ? null : Math.max(0, Number(row.quantity_limit) - Number(row.sold_units))
  return { ...row, remaining, sold_out: remaining === 0 }
}

export async function requestFlashAccess(req: Request, res: Response) {
  try {
    const { checkoutRequestId, phone, email } = (req.body || {}) as {
      checkoutRequestId?: string
      phone?: string
      email?: string
    }

    let access = null
    if (typeof checkoutRequestId === 'string' && checkoutRequestId.trim()) {
      access = await findEligibleTicket({
        checkoutRequestId: checkoutRequestId.trim(),
        phone: typeof phone === 'string' ? phone : undefined,
        email: typeof email === 'string' ? email : undefined,
      })
    } else {
      access = await resolveFlashAccess(req)
      // Share link access is per redemption and must not be converted into a ticket token.
      if (access && !access.ticketId) {
        access = req.user?.id ? await findEligibleTicket({ userId: req.user.id }) : null
      }
    }

    if (!access) {
      return res.status(403).json({ error: `No eligible ticket purchased in the last ${FLASH_ACCESS_HOURS} hours` })
    }

    res.json({ token: signFlashToken(access), expiresAt: access.expiresAt.toISOString() })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to verify flash deal access' })
  }
}

export async function redeemFlashShareLink(req: Request, res: Response) {
  try {
    const { code, phone, email } = (req.body || {}) as Record<string, unknown>
    const redemption = await redeemShareLink({ code, phone, email })
    res.json({
      token: signGuestFlashToken(redemption),
      expiresAt: redemption.expiresAt.toISOString(),
      phone: redemption.phone,
      email: redemption.email,
    })
  } catch (error) {
    if (error instanceof ShareLinkError) {
      return res.status(error.status).json({ error: error.message })
    }
    console.error(error)
    res.status(500).json({ error: 'Failed to unlock flash deals' })
  }
}

export async function createFlashShareLink(req: Request, res: Response) {
  try {
    const body = (req.body || {}) as { zone_id?: unknown; email?: unknown; max_uses?: unknown }
    const maxUses = parseMaxUses(body.max_uses)
    const zoneId = body.zone_id === undefined || body.zone_id === null || body.zone_id === '' ? null : body.zone_id
    if (zoneId !== null && !isUuid(zoneId)) {
      return res.status(400).json({ error: 'Invalid zone' })
    }
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (email && !EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address' })
    }

    const link = await createShareLink({ createdBy: req.user?.id ?? null, zoneId, sentTo: email || null, maxUses })

    let emailSent = false
    let emailError: string | undefined
    if (email) {
      const emailData = { url: link.url, hours: SHARE_LINK_HOURS, maxUses: link.maxUses }
      const result = await sendEmail({
        to: email,
        subject: "You're invited to TRFC flash deals",
        html: buildFlashShareLinkEmailHTML(emailData),
        text: buildFlashShareLinkEmailText(emailData),
      })
      emailSent = result.success
      if (!result.success) emailError = result.error || 'Email could not be sent'
    }

    res.status(201).json({
      id: link.id,
      url: link.url,
      expiresAt: link.expiresAt.toISOString(),
      maxUses: link.maxUses,
      emailSent,
      ...(emailError ? { emailError } : {}),
    })
  } catch (error) {
    if (error instanceof ShareLinkError) {
      return res.status(error.status).json({ error: error.message })
    }
    console.error(error)
    res.status(500).json({ error: 'Failed to create share link' })
  }
}

export async function getFlashShareLinks(_req: Request, res: Response) {
  try {
    res.json(await listShareLinks())
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch share links' })
  }
}

export async function revokeFlashShareLink(req: Request, res: Response) {
  try {
    const { id } = req.params
    if (!isUuid(id) || !(await revokeShareLink(id))) {
      return res.status(404).json({ error: 'Share link not found' })
    }
    res.json({ message: 'Share link revoked' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to revoke share link' })
  }
}

export async function getFlashStatus(req: Request, res: Response) {
  try {
    const access = await resolveFlashAccess(req)
    res.json({
      eligible: Boolean(access),
      expiresAt: access ? access.expiresAt.toISOString() : null,
      zoneName: access?.zoneName ?? null,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to check flash deal access' })
  }
}

export async function getLiveFlashSales(req: Request, res: Response) {
  try {
    const access = await resolveFlashAccess(req)
    if (!access) {
      return res.status(401).json({ error: 'Flash deals are available to ticket holders only' })
    }

    const result = await query(
      `SELECT
         fs.id, fs.product_id, fs.sale_price, fs.quantity_limit, fs.starts_at, fs.ends_at, fs.sort_order,
         ${FLASH_SOLD_UNITS_SQL} AS sold_units,
         p.name AS product_name, p.description AS product_description, p.image_url AS product_image_url,
         p.price AS regular_price, p.stock AS product_stock, p.category AS product_category,
         p.distance_options, ${variantsJsonSql()} AS product_variants,
         c.name AS category_name, c.slug AS category_slug,
         ${UNLOCK_LABELS_SQL} AS unlock_labels
       FROM flash_sales fs
       JOIN products p ON p.id = fs.product_id
       LEFT JOIN product_categories c ON c.id = p.category_id
       WHERE ${LIVE_CONDITION}
         AND p.is_active = true
         AND ${productInZoneSql('p', '$1')}
         AND ${flashSaleUnlockedSql('fs', '$2', '$3')}
       ORDER BY fs.sort_order ASC, fs.created_at ASC`,
      [access.zoneId, access.eventIds, access.ticketTypeIds]
    )

    res.json({
      accessExpiresAt: access.expiresAt.toISOString(),
      zone: access.zoneId ? { id: access.zoneId, name: access.zoneName } : null,
      offers: result.rows.map(withRemaining),
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch flash deals' })
  }
}

export interface LiveOfferPrice {
  salePrice: number
  regularPrice: number
}

/**
 * Cheapest live flash offer visible in `zoneId` and unlocked by the given events / ticket types
 * that still has units and stock left, or null.
 */
export async function getCheapestLiveOffer(
  zoneId: string | null = null,
  eventIds: string[] = [],
  ticketTypeIds: string[] = []
): Promise<LiveOfferPrice | null> {
  const result = await query(
    `SELECT fs.sale_price, p.price AS regular_price
     FROM flash_sales fs
     JOIN products p ON p.id = fs.product_id
     WHERE ${LIVE_CONDITION}
       AND p.is_active = true
       AND p.stock > 0
       AND (fs.quantity_limit IS NULL OR fs.quantity_limit > ${FLASH_SOLD_UNITS_SQL})
       AND ${productInZoneSql('p', '$1')}
       AND ${flashSaleUnlockedSql('fs', '$2', '$3')}
     ORDER BY fs.sale_price ASC
     LIMIT 1`,
    [zoneId, eventIds, ticketTypeIds]
  )
  const row = result.rows[0]
  if (!row) return null
  return { salePrice: Number(row.sale_price), regularPrice: Number(row.regular_price) }
}

export async function getAdminFlashSales(_req: Request, res: Response) {
  try {
    const result = await query(
      `SELECT
         fs.*,
         ${FLASH_SOLD_UNITS_SQL} AS sold_units,
         p.name AS product_name, p.price AS regular_price, p.is_active AS product_active,
         ${zonesJsonSql('p')} AS product_zones,
         COALESCE((
           SELECT json_agg(json_build_object(
             'event_id', u.event_id,
             'event_title', e.title,
             'ticket_type_id', u.ticket_type_id,
             'ticket_type_name', ett.name
           ) ORDER BY e.title, ett.name NULLS FIRST)
           FROM flash_sale_unlocks u
           JOIN events e ON e.id = u.event_id
           LEFT JOIN event_ticket_types ett ON ett.id = u.ticket_type_id
           WHERE u.flash_sale_id = fs.id
         ), '[]'::json) AS unlocks
       FROM flash_sales fs
       JOIN products p ON p.id = fs.product_id
       ORDER BY fs.sort_order ASC, fs.created_at DESC`
    )
    res.json(result.rows.map(withRemaining))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch flash sales' })
  }
}

export interface FlashSaleUnlockInput {
  event_id: string
  /** Null unlocks the sale for every ticket type of the event. */
  ticket_type_id: string | null
}

interface FlashSaleInput {
  product_id: string
  sale_price: number
  quantity_limit: number | null
  starts_at: Date
  ends_at: Date | null
  sort_order: number
  is_active: boolean
  /** Undefined keeps the sale's current unlocks; an empty list opens it to all ticket holders. */
  unlocks?: FlashSaleUnlockInput[]
}

/**
 * Validates the events / ticket types that unlock a sale. Duplicates are dropped, as are ticket
 * type rows for an event that is also selected as a whole event.
 */
export async function parseFlashSaleUnlocks(
  value: unknown
): Promise<{ unlocks?: FlashSaleUnlockInput[]; error?: string }> {
  if (value === undefined) return {}
  if (value === null) return { unlocks: [] }
  if (!Array.isArray(value)) return { error: 'Unlocks must be a list' }

  const wholeEvents = new Set<string>()
  const typesByEvent = new Map<string, Set<string>>()
  for (const item of value) {
    const eventId = (item as { event_id?: unknown } | null)?.event_id
    const rawTypeId = (item as { ticket_type_id?: unknown } | null)?.ticket_type_id
    if (!isUuid(eventId)) return { error: 'Invalid event selected' }
    if (rawTypeId === undefined || rawTypeId === null || rawTypeId === '') {
      wholeEvents.add(eventId)
      continue
    }
    if (!isUuid(rawTypeId)) return { error: 'Invalid ticket type selected' }
    const types = typesByEvent.get(eventId) ?? new Set<string>()
    types.add(rawTypeId)
    typesByEvent.set(eventId, types)
  }

  const eventIds = [...new Set([...wholeEvents, ...typesByEvent.keys()])]
  if (eventIds.length === 0) return { unlocks: [] }

  const eventsResult = await query('SELECT id FROM events WHERE id = ANY($1::uuid[])', [eventIds])
  const foundEvents = new Set(eventsResult.rows.map((row) => String(row.id)))
  if (eventIds.some((id) => !foundEvents.has(id))) return { error: 'Event not found' }

  const unlocks: FlashSaleUnlockInput[] = [...wholeEvents].map((event_id) => ({ event_id, ticket_type_id: null }))
  const typeIds = [...typesByEvent.entries()]
    .filter(([eventId]) => !wholeEvents.has(eventId))
    .flatMap(([, types]) => [...types])
  if (typeIds.length > 0) {
    const typesResult = await query(
      'SELECT id, event_id FROM event_ticket_types WHERE id = ANY($1::uuid[])',
      [typeIds]
    )
    const eventOfType = new Map(typesResult.rows.map((row) => [String(row.id), String(row.event_id)]))
    for (const [eventId, types] of typesByEvent) {
      if (wholeEvents.has(eventId)) continue
      for (const typeId of types) {
        if (eventOfType.get(typeId) !== eventId) {
          return { error: 'Ticket type does not belong to the selected event' }
        }
        unlocks.push({ event_id: eventId, ticket_type_id: typeId })
      }
    }
  }

  return { unlocks }
}

type DbClient = Awaited<ReturnType<typeof getClient>>

async function replaceUnlocks(client: DbClient, flashSaleId: string, unlocks: FlashSaleUnlockInput[]) {
  await client.query('DELETE FROM flash_sale_unlocks WHERE flash_sale_id = $1', [flashSaleId])
  if (unlocks.length === 0) return
  await client.query(
    `INSERT INTO flash_sale_unlocks (flash_sale_id, event_id, ticket_type_id)
     SELECT $1, u.event_id, u.ticket_type_id
     FROM unnest($2::uuid[], $3::uuid[]) AS u(event_id, ticket_type_id)`,
    [flashSaleId, unlocks.map((u) => u.event_id), unlocks.map((u) => u.ticket_type_id)]
  )
}

async function parseFlashSaleInput(
  body: Record<string, unknown>
): Promise<{ data?: FlashSaleInput; error?: string }> {
  const productId = typeof body.product_id === 'string' ? body.product_id.trim() : ''
  if (!productId) return { error: 'Product is required' }

  const productResult = await query('SELECT price FROM products WHERE id = $1', [productId])
  if (productResult.rows.length === 0) return { error: 'Product not found' }
  const regularPrice = Number(productResult.rows[0].price)

  const salePrice = Number(body.sale_price)
  if (!Number.isFinite(salePrice) || salePrice <= 0) {
    return { error: 'Flash price must be greater than 0' }
  }
  if (salePrice >= regularPrice) {
    return { error: `Flash price must be lower than the normal price (KES ${regularPrice})` }
  }

  let quantityLimit: number | null = null
  if (body.quantity_limit !== undefined && body.quantity_limit !== null && body.quantity_limit !== '') {
    const parsed = Number(body.quantity_limit)
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return { error: 'Quantity limit must be a positive whole number' }
    }
    quantityLimit = parsed
  }

  const startsAt = body.starts_at ? new Date(String(body.starts_at)) : new Date()
  if (Number.isNaN(startsAt.getTime())) return { error: 'Invalid start date' }

  let endsAt: Date | null = null
  if (body.ends_at) {
    endsAt = new Date(String(body.ends_at))
    if (Number.isNaN(endsAt.getTime())) return { error: 'Invalid end date' }
    if (endsAt <= startsAt) return { error: 'End date must be after the start date' }
  }

  const sortOrder = Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0

  const { unlocks, error: unlockError } = await parseFlashSaleUnlocks(body.unlocks)
  if (unlockError) return { error: unlockError }

  return {
    data: {
      product_id: productId,
      sale_price: salePrice,
      quantity_limit: quantityLimit,
      starts_at: startsAt,
      ends_at: endsAt,
      sort_order: sortOrder,
      is_active: typeof body.is_active === 'boolean' ? body.is_active : true,
      unlocks,
    },
  }
}

export async function createFlashSale(req: Request, res: Response) {
  const { data, error } = await parseFlashSaleInput(req.body || {}).catch((err) => {
    console.error(err)
    return { data: undefined, error: undefined }
  })
  if (!data) return res.status(error ? 400 : 500).json({ error: error ?? 'Failed to create flash sale' })

  const client = await getClient()
  try {
    await client.query('BEGIN')
    const result = await client.query(
      `INSERT INTO flash_sales (product_id, sale_price, quantity_limit, starts_at, ends_at, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        data.product_id,
        data.sale_price,
        data.quantity_limit,
        data.starts_at,
        data.ends_at,
        data.sort_order,
        data.is_active,
      ]
    )
    const sale = result.rows[0]
    await replaceUnlocks(client, sale.id, data.unlocks ?? [])
    await client.query('COMMIT')
    res.status(201).json(sale)
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    console.error(error)
    res.status(500).json({ error: 'Failed to create flash sale' })
  } finally {
    client.release()
  }
}

export async function updateFlashSale(req: Request, res: Response) {
  const { id } = req.params
  const { data, error } = await parseFlashSaleInput(req.body || {}).catch((err) => {
    console.error(err)
    return { data: undefined, error: undefined }
  })
  if (!data) return res.status(error ? 400 : 500).json({ error: error ?? 'Failed to update flash sale' })

  const client = await getClient()
  try {
    await client.query('BEGIN')
    const result = await client.query(
      `UPDATE flash_sales
       SET product_id = $1, sale_price = $2, quantity_limit = $3, starts_at = $4,
           ends_at = $5, sort_order = $6, is_active = $7
       WHERE id = $8 RETURNING *`,
      [
        data.product_id,
        data.sale_price,
        data.quantity_limit,
        data.starts_at,
        data.ends_at,
        data.sort_order,
        data.is_active,
        id,
      ]
    )
    if (result.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Flash sale not found' })
    }
    if (data.unlocks) await replaceUnlocks(client, id, data.unlocks)
    await client.query('COMMIT')
    res.json(result.rows[0])
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    console.error(error)
    res.status(500).json({ error: 'Failed to update flash sale' })
  } finally {
    client.release()
  }
}

export async function deleteFlashSale(req: Request, res: Response) {
  try {
    const { id } = req.params
    const usage = await query(
      'SELECT COUNT(*)::int AS count FROM order_items WHERE flash_sale_id = $1',
      [id]
    )
    if ((usage.rows[0]?.count ?? 0) > 0) {
      return res.status(409).json({ error: 'Sale has orders. Deactivate it instead.' })
    }
    const result = await query('DELETE FROM flash_sales WHERE id = $1 RETURNING id', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Flash sale not found' })
    }
    res.json({ message: 'Flash sale deleted' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to delete flash sale' })
  }
}
