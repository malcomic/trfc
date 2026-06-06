import { Request, Response } from 'express'
import { query } from '../config/db.js'

const VALID_ICONS = ['Building2', 'Megaphone', 'Crown', 'Handshake', 'Star', 'Award', 'Gem', 'Trophy'] as const
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function normalizeBenefits(benefits: unknown): string[] {
  if (!Array.isArray(benefits)) return []
  return benefits
    .map((b) => (typeof b === 'string' ? b.trim() : ''))
    .filter(Boolean)
}

function parseTierRow(row: Record<string, unknown>) {
  const benefits = row.benefits
  return {
    ...row,
    benefits: Array.isArray(benefits) ? benefits : [],
  }
}

export async function getActiveTierSlugs(): Promise<string[]> {
  const result = await query(
    'SELECT slug FROM sponsorship_tiers WHERE is_active = true ORDER BY sort_order ASC, created_at ASC'
  )
  return result.rows.map((row) => row.slug as string)
}

export async function getSponsorshipTiers(_req: Request, res: Response) {
  try {
    const result = await query(
      `SELECT * FROM sponsorship_tiers
       WHERE is_active = true
       ORDER BY sort_order ASC, created_at ASC`
    )
    res.json(result.rows.map(parseTierRow))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch sponsorship tiers' })
  }
}

export async function getAdminSponsorshipTiers(_req: Request, res: Response) {
  try {
    const result = await query(
      'SELECT * FROM sponsorship_tiers ORDER BY sort_order ASC, created_at ASC'
    )
    res.json(result.rows.map(parseTierRow))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch sponsorship tiers' })
  }
}

export async function createSponsorshipTier(req: Request, res: Response) {
  try {
    const { slug, name, price_display, benefits, icon, sort_order } = req.body

    if (!slug?.trim() || !name?.trim() || !price_display?.trim()) {
      return res.status(400).json({ error: 'Slug, name, and price are required' })
    }

    const normalizedSlug = slug.trim().toLowerCase()
    if (!SLUG_PATTERN.test(normalizedSlug)) {
      return res.status(400).json({ error: 'Slug must be lowercase letters, numbers, and hyphens only' })
    }

    const normalizedBenefits = normalizeBenefits(benefits)
    if (normalizedBenefits.length === 0) {
      return res.status(400).json({ error: 'At least one benefit is required' })
    }

    const tierIcon = icon && VALID_ICONS.includes(icon) ? icon : 'Handshake'
    const order = Number.isFinite(Number(sort_order)) ? Number(sort_order) : 0

    const result = await query(
      `INSERT INTO sponsorship_tiers (slug, name, price_display, benefits, icon, sort_order)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6) RETURNING *`,
      [normalizedSlug, name.trim(), price_display.trim(), JSON.stringify(normalizedBenefits), tierIcon, order]
    )

    res.status(201).json(parseTierRow(result.rows[0]))
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(400).json({ error: 'A tier with this slug already exists' })
    }
    console.error(error)
    res.status(500).json({ error: 'Failed to create sponsorship tier' })
  }
}

export async function updateSponsorshipTier(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { slug, name, price_display, benefits, icon, sort_order, is_active } = req.body

    if (!name?.trim() || !price_display?.trim()) {
      return res.status(400).json({ error: 'Name and price are required' })
    }

    const normalizedBenefits = normalizeBenefits(benefits)
    if (normalizedBenefits.length === 0) {
      return res.status(400).json({ error: 'At least one benefit is required' })
    }

    let normalizedSlug: string | undefined
    if (slug !== undefined) {
      normalizedSlug = slug.trim().toLowerCase()
      if (!SLUG_PATTERN.test(normalizedSlug)) {
        return res.status(400).json({ error: 'Slug must be lowercase letters, numbers, and hyphens only' })
      }
    }

    const tierIcon = icon && VALID_ICONS.includes(icon) ? icon : 'Handshake'
    const order = Number.isFinite(Number(sort_order)) ? Number(sort_order) : 0

    const result = await query(
      `UPDATE sponsorship_tiers
       SET slug = COALESCE($1, slug),
           name = $2,
           price_display = $3,
           benefits = $4::jsonb,
           icon = $5,
           sort_order = $6,
           is_active = COALESCE($7, is_active)
       WHERE id = $8
       RETURNING *`,
      [
        normalizedSlug ?? null,
        name.trim(),
        price_display.trim(),
        JSON.stringify(normalizedBenefits),
        tierIcon,
        order,
        typeof is_active === 'boolean' ? is_active : null,
        id,
      ]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sponsorship tier not found' })
    }

    res.json(parseTierRow(result.rows[0]))
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(400).json({ error: 'A tier with this slug already exists' })
    }
    console.error(error)
    res.status(500).json({ error: 'Failed to update sponsorship tier' })
  }
}

export async function deleteSponsorshipTier(req: Request, res: Response) {
  try {
    const { id } = req.params

    const tierResult = await query('SELECT slug FROM sponsorship_tiers WHERE id = $1', [id])
    if (tierResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sponsorship tier not found' })
    }

    const slug = tierResult.rows[0].slug as string
    const usage = await query('SELECT COUNT(*)::int AS count FROM partnerships WHERE tier = $1', [slug])
    if (usage.rows[0].count > 0) {
      return res.status(400).json({
        error: 'Cannot delete tier with existing partnership inquiries. Deactivate it instead.',
      })
    }

    await query('DELETE FROM sponsorship_tiers WHERE id = $1', [id])
    res.json({ message: 'Sponsorship tier deleted' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to delete sponsorship tier' })
  }
}
