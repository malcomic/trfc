import { Request, Response } from 'express'
import { query } from '../config/db.js'
import { slugify } from '../utils/slugify.js'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MAX_NAME_LENGTH = 50

const CATEGORY_WITH_COUNT_SQL = `
  SELECT c.*, COUNT(p.id) FILTER (WHERE p.is_active = true)::int AS product_count
  FROM product_categories c
  LEFT JOIN products p ON p.category_id = c.id
`

function resolveSlug(slug: unknown, name: string): string | null {
  const candidate = typeof slug === 'string' && slug.trim() ? slug.trim().toLowerCase() : slugify(name)
  return SLUG_PATTERN.test(candidate) ? candidate : null
}

export async function getProductCategories(_req: Request, res: Response) {
  try {
    const result = await query(
      `${CATEGORY_WITH_COUNT_SQL}
       WHERE c.is_active = true
       GROUP BY c.id
       HAVING COUNT(p.id) FILTER (WHERE p.is_active = true) > 0
       ORDER BY c.sort_order ASC, c.name ASC`
    )
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch product categories' })
  }
}

export async function getProductCategoryBySlug(req: Request, res: Response) {
  try {
    const { slug } = req.params
    const categoryResult = await query(
      'SELECT * FROM product_categories WHERE slug = $1 AND is_active = true',
      [slug]
    )
    if (categoryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' })
    }
    const category = categoryResult.rows[0]
    const productsResult = await query(
      `SELECT p.*, $2::text AS category_name, $3::text AS category_slug
       FROM products p
       WHERE p.category_id = $1 AND p.is_active = true
       ORDER BY p.created_at DESC`,
      [category.id, category.name, category.slug]
    )
    res.json({ ...category, products: productsResult.rows })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch product category' })
  }
}

export async function getAdminProductCategories(_req: Request, res: Response) {
  try {
    const result = await query(
      `${CATEGORY_WITH_COUNT_SQL}
       GROUP BY c.id
       ORDER BY c.sort_order ASC, c.name ASC`
    )
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch product categories' })
  }
}

export async function createProductCategory(req: Request, res: Response) {
  try {
    const { slug, name, description, image_url, sort_order, is_active } = req.body
    const trimmedName = typeof name === 'string' ? name.trim() : ''

    if (!trimmedName) {
      return res.status(400).json({ error: 'Name is required' })
    }
    if (trimmedName.length > MAX_NAME_LENGTH) {
      return res.status(400).json({ error: `Name must be ${MAX_NAME_LENGTH} characters or fewer` })
    }

    const normalizedSlug = resolveSlug(slug, trimmedName)
    if (!normalizedSlug) {
      return res.status(400).json({ error: 'Slug must be lowercase letters, numbers, and hyphens only' })
    }

    const order = Number.isFinite(Number(sort_order)) ? Number(sort_order) : 0

    const result = await query(
      `INSERT INTO product_categories (slug, name, description, image_url, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        normalizedSlug,
        trimmedName,
        description?.trim() || null,
        image_url?.trim() || null,
        order,
        typeof is_active === 'boolean' ? is_active : true,
      ]
    )

    res.status(201).json({ ...result.rows[0], product_count: 0 })
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'A category with this slug already exists' })
    }
    console.error(error)
    res.status(500).json({ error: 'Failed to create product category' })
  }
}

export async function updateProductCategory(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { slug, name, description, image_url, sort_order, is_active } = req.body
    const trimmedName = typeof name === 'string' ? name.trim() : ''

    if (!trimmedName) {
      return res.status(400).json({ error: 'Name is required' })
    }
    if (trimmedName.length > MAX_NAME_LENGTH) {
      return res.status(400).json({ error: `Name must be ${MAX_NAME_LENGTH} characters or fewer` })
    }

    const normalizedSlug = resolveSlug(slug, trimmedName)
    if (!normalizedSlug) {
      return res.status(400).json({ error: 'Slug must be lowercase letters, numbers, and hyphens only' })
    }

    const order = Number.isFinite(Number(sort_order)) ? Number(sort_order) : 0

    const result = await query(
      `UPDATE product_categories
       SET slug = $1,
           name = $2,
           description = $3,
           image_url = $4,
           sort_order = $5,
           is_active = COALESCE($6, is_active)
       WHERE id = $7
       RETURNING *`,
      [
        normalizedSlug,
        trimmedName,
        description?.trim() || null,
        image_url?.trim() || null,
        order,
        typeof is_active === 'boolean' ? is_active : null,
        id,
      ]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' })
    }

    await query('UPDATE products SET category = $1 WHERE category_id = $2', [trimmedName, id])

    res.json(result.rows[0])
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'A category with this slug already exists' })
    }
    console.error(error)
    res.status(500).json({ error: 'Failed to update product category' })
  }
}

export async function deleteProductCategory(req: Request, res: Response) {
  try {
    const { id } = req.params

    const usage = await query(
      'SELECT COUNT(*)::int AS count FROM products WHERE category_id = $1',
      [id]
    )
    const count = usage.rows[0]?.count ?? 0
    if (count > 0) {
      return res.status(409).json({
        error: `Category has ${count} product${count !== 1 ? 's' : ''}. Reassign them first.`,
      })
    }

    const result = await query('DELETE FROM product_categories WHERE id = $1 RETURNING id', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' })
    }
    res.json({ message: 'Category deleted' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to delete product category' })
  }
}
