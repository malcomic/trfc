import { Request, Response } from 'express'
import { query } from '../config/db.js'
import {
  DEFAULT_TYPOGRAPHY,
  parseTypographyRow,
  validateTypography,
} from '../config/fontCatalog.js'

async function fetchTypographyRow() {
  const result = await query('SELECT * FROM site_typography WHERE id = 1')
  return result.rows[0] as Record<string, unknown> | undefined
}

export async function getTypography(_req: Request, res: Response) {
  try {
    const row = await fetchTypographyRow()
    res.json(parseTypographyRow(row))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch typography settings' })
  }
}

export async function updateTypography(req: Request, res: Response) {
  try {
    const validation = validateTypography(req.body)
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error })
    }

    const { settings } = validation
    const updatedBy = req.user?.id ?? null

    const result = await query(
      `INSERT INTO site_typography (id, display_font, body_font, condensed_font, sans_font, updated_by)
       VALUES (1, $1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         display_font = EXCLUDED.display_font,
         body_font = EXCLUDED.body_font,
         condensed_font = EXCLUDED.condensed_font,
         sans_font = EXCLUDED.sans_font,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING display_font, body_font, condensed_font, sans_font`,
      [
        settings.display_font,
        settings.body_font,
        settings.condensed_font,
        settings.sans_font,
        updatedBy,
      ]
    )

    res.json(parseTypographyRow(result.rows[0]))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to update typography settings' })
  }
}

export async function resetTypography(req: Request, res: Response) {
  try {
    const updatedBy = req.user?.id ?? null
    const defaults = { ...DEFAULT_TYPOGRAPHY }

    const result = await query(
      `INSERT INTO site_typography (id, display_font, body_font, condensed_font, sans_font, updated_by)
       VALUES (1, $1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         display_font = EXCLUDED.display_font,
         body_font = EXCLUDED.body_font,
         condensed_font = EXCLUDED.condensed_font,
         sans_font = EXCLUDED.sans_font,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING display_font, body_font, condensed_font, sans_font`,
      [
        defaults.display_font,
        defaults.body_font,
        defaults.condensed_font,
        defaults.sans_font,
        updatedBy,
      ]
    )

    res.json(parseTypographyRow(result.rows[0]))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to reset typography settings' })
  }
}
