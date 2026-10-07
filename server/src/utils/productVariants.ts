interface Queryable {
  query: (text: string, params?: any[]) => Promise<{ rows: any[] }>
}

export const MAX_OPTION_LENGTH = 20

export interface VariantInput {
  size: string
  stock: number
  sort_order: number
}

export class ProductOptionsError extends Error {}

/** Selects a product's sizes as a JSON array; `p` must be the products alias in the outer query. */
export function variantsJsonSql(includeInactive = false): string {
  return `COALESCE((
    SELECT json_agg(
      json_build_object(
        'id', v.id, 'size', v.size, 'stock', v.stock,
        'sort_order', v.sort_order, 'is_active', v.is_active
      ) ORDER BY v.sort_order ASC, v.created_at ASC
    )
    FROM product_variants v
    WHERE v.product_id = p.id${includeInactive ? '' : ' AND v.is_active = true'}
  ), '[]'::json)`
}

/** Returns null when the request did not send variants, meaning existing sizes are left untouched. */
export function parseVariantsInput(raw: unknown): VariantInput[] | null {
  if (raw === undefined || raw === null) return null
  if (!Array.isArray(raw)) throw new ProductOptionsError('Sizes must be a list')

  const seen = new Set<string>()
  return raw.map((entry, index) => {
    const size = typeof entry?.size === 'string' ? entry.size.trim() : ''
    if (!size) throw new ProductOptionsError('Every size needs a name')
    if (size.length > MAX_OPTION_LENGTH) {
      throw new ProductOptionsError(`Size "${size}" is longer than ${MAX_OPTION_LENGTH} characters`)
    }
    const key = size.toLowerCase()
    if (seen.has(key)) throw new ProductOptionsError(`Size "${size}" is listed twice`)
    seen.add(key)

    const stock = Number(entry?.stock)
    if (!Number.isInteger(stock) || stock < 0) {
      throw new ProductOptionsError(`Stock for size "${size}" must be a whole number of 0 or more`)
    }
    return { size, stock, sort_order: index }
  })
}

export function parseDistanceOptions(raw: unknown): string[] {
  if (raw === undefined || raw === null) return []
  if (!Array.isArray(raw)) throw new ProductOptionsError('Distance options must be a list')

  const seen = new Set<string>()
  const result: string[] = []
  for (const entry of raw) {
    const value = typeof entry === 'string' ? entry.trim() : ''
    if (!value) continue
    if (value.length > MAX_OPTION_LENGTH) {
      throw new ProductOptionsError(`Distance "${value}" is longer than ${MAX_OPTION_LENGTH} characters`)
    }
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(value)
  }
  return result
}

export interface ActiveVariant {
  id: string
  size: string
  stock: number
}

export interface SelectedOptions {
  variant: ActiveVariant | null
  distance: string | null
}

/** Checks an order line's size and distance against what the product offers. */
export function resolveSelectedOptions(
  productName: string,
  activeVariants: ActiveVariant[],
  distanceOptions: string[],
  item: { variant_id?: unknown; distance?: unknown }
): SelectedOptions {
  const variantId = typeof item.variant_id === 'string' && item.variant_id ? item.variant_id : null
  let variant: ActiveVariant | null = null
  if (activeVariants.length > 0) {
    if (!variantId) throw new ProductOptionsError(`Please choose a size for ${productName}`)
    variant = activeVariants.find((v) => String(v.id) === variantId) ?? null
    if (!variant) throw new ProductOptionsError(`The selected size for ${productName} is no longer available`)
  } else if (variantId) {
    throw new ProductOptionsError(`${productName} does not come in sizes`)
  }

  let distance: string | null = null
  if (distanceOptions.length > 0) {
    const requested = typeof item.distance === 'string' ? item.distance.trim().toLowerCase() : ''
    if (!requested) throw new ProductOptionsError(`Please choose a distance for ${productName}`)
    distance = distanceOptions.find((d) => d.toLowerCase() === requested) ?? null
    if (!distance) throw new ProductOptionsError(`The selected distance for ${productName} is not available`)
  }

  return { variant, distance }
}

/** Upserts the given sizes and deactivates any size no longer listed; never deletes rows. */
export async function saveProductVariants(db: Queryable, productId: string, variants: VariantInput[]) {
  for (const variant of variants) {
    await db.query(
      `INSERT INTO product_variants (product_id, size, stock, sort_order, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (product_id, size)
       DO UPDATE SET stock = EXCLUDED.stock, sort_order = EXCLUDED.sort_order, is_active = true`,
      [productId, variant.size, variant.stock, variant.sort_order]
    )
  }
  await db.query(
    `UPDATE product_variants SET is_active = false
     WHERE product_id = $1 AND NOT (size = ANY($2::text[]))`,
    [productId, variants.map((v) => v.size)]
  )
}

/** Keeps products.stock equal to the total of active sizes when the product has any. */
export async function syncProductStock(db: Queryable, productId: string) {
  await db.query(
    `UPDATE products p
     SET stock = totals.total
     FROM (
       SELECT SUM(stock)::int AS total
       FROM product_variants
       WHERE product_id = $1 AND is_active = true
       HAVING COUNT(*) > 0
     ) totals
     WHERE p.id = $1`,
    [productId]
  )
}
