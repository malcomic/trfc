import { query, getClient } from '../config/db.js'
import { ProductOptionsError } from './productVariants.js'

type DbClient = Awaited<ReturnType<typeof getClient>>

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface Zone {
  id: string
  name: string
  code: string
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

/**
 * True when the product has no zones (open to everyone) or `zoneParam` is one of its zones.
 * A NULL zone therefore only sees products without zones.
 */
export function productInZoneSql(productAlias: string, zoneParam: string): string {
  return `(
    NOT EXISTS (SELECT 1 FROM product_zones pz WHERE pz.product_id = ${productAlias}.id)
    OR (${zoneParam}::uuid IS NOT NULL AND EXISTS (
      SELECT 1 FROM product_zones pz
      WHERE pz.product_id = ${productAlias}.id AND pz.zone_id = ${zoneParam}::uuid
    ))
  )`
}

/** Selects a product's zones as a JSON array; `productAlias` must be the products alias in the outer query. */
export function zonesJsonSql(productAlias: string): string {
  return `COALESCE((
    SELECT json_agg(json_build_object('id', r.id, 'name', r.name, 'code', r.code) ORDER BY r.name)
    FROM product_zones pz
    JOIN regions r ON r.id = pz.zone_id
    WHERE pz.product_id = ${productAlias}.id
  ), '[]'::json)`
}

export async function getActiveZones(): Promise<Zone[]> {
  const result = await query('SELECT id, name, code FROM regions WHERE is_active = true ORDER BY name ASC')
  return result.rows
}

export async function findActiveZone(id: unknown): Promise<Zone | null> {
  if (!isUuid(id)) return null
  const result = await query('SELECT id, name, code FROM regions WHERE id = $1 AND is_active = true', [id])
  return result.rows[0] ?? null
}

/** Validates a product's zone list. Returns undefined when the field was not sent (keep current zones). */
export async function parseZoneIds(input: unknown): Promise<string[] | undefined> {
  if (input === undefined) return undefined
  if (input === null) return []
  if (!Array.isArray(input)) throw new ProductOptionsError('Zones must be a list')

  const ids = [...new Set(input)]
  if (!ids.every(isUuid)) throw new ProductOptionsError('Invalid zone selected')
  if (ids.length === 0) return []

  const result = await query('SELECT id FROM regions WHERE id = ANY($1::uuid[]) AND is_active = true', [ids])
  if (result.rows.length !== ids.length) throw new ProductOptionsError('One or more zones are inactive or missing')
  return ids as string[]
}

export async function setProductZones(client: DbClient, productId: string, zoneIds: string[]): Promise<void> {
  await client.query('DELETE FROM product_zones WHERE product_id = $1', [productId])
  if (zoneIds.length === 0) return
  await client.query(
    `INSERT INTO product_zones (product_id, zone_id)
     SELECT $1, UNNEST($2::uuid[])
     ON CONFLICT DO NOTHING`,
    [productId, zoneIds]
  )
}
