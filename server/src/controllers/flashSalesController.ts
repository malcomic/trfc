import { Request, Response } from 'express'
import { query } from '../config/db.js'
import { FLASH_ACCESS_HOURS, findEligibleTicket, resolveFlashAccess, signFlashToken } from '../utils/flashAccess.js'
import { variantsJsonSql } from '../utils/productVariants.js'
import { productInZoneSql, zonesJsonSql } from '../utils/zones.js'

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
         c.name AS category_name, c.slug AS category_slug
       FROM flash_sales fs
       JOIN products p ON p.id = fs.product_id
       LEFT JOIN product_categories c ON c.id = p.category_id
       WHERE ${LIVE_CONDITION}
         AND p.is_active = true
         AND ${productInZoneSql('p', '$1')}
       ORDER BY fs.sort_order ASC, fs.created_at ASC`,
      [access.zoneId]
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

/** Cheapest live flash offer visible in `zoneId` that still has units and stock left, or null. */
export async function getCheapestLiveOffer(zoneId: string | null = null): Promise<LiveOfferPrice | null> {
  const result = await query(
    `SELECT fs.sale_price, p.price AS regular_price
     FROM flash_sales fs
     JOIN products p ON p.id = fs.product_id
     WHERE ${LIVE_CONDITION}
       AND p.is_active = true
       AND p.stock > 0
       AND (fs.quantity_limit IS NULL OR fs.quantity_limit > ${FLASH_SOLD_UNITS_SQL})
       AND ${productInZoneSql('p', '$1')}
     ORDER BY fs.sale_price ASC
     LIMIT 1`,
    [zoneId]
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
         ${zonesJsonSql('p')} AS product_zones
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

interface FlashSaleInput {
  product_id: string
  sale_price: number
  quantity_limit: number | null
  starts_at: Date
  ends_at: Date | null
  sort_order: number
  is_active: boolean
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

  return {
    data: {
      product_id: productId,
      sale_price: salePrice,
      quantity_limit: quantityLimit,
      starts_at: startsAt,
      ends_at: endsAt,
      sort_order: sortOrder,
      is_active: typeof body.is_active === 'boolean' ? body.is_active : true,
    },
  }
}

export async function createFlashSale(req: Request, res: Response) {
  try {
    const { data, error } = await parseFlashSaleInput(req.body || {})
    if (!data) return res.status(400).json({ error })

    const result = await query(
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
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to create flash sale' })
  }
}

export async function updateFlashSale(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { data, error } = await parseFlashSaleInput(req.body || {})
    if (!data) return res.status(400).json({ error })

    const result = await query(
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
      return res.status(404).json({ error: 'Flash sale not found' })
    }
    res.json(result.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to update flash sale' })
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
