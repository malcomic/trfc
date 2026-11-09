import { Request, Response } from 'express'
import { query } from '../config/db.js'
import { isHttpsUrl } from '../utils/videoLink.js'

export const SITE_IMAGE_SLOTS = [
  'coach',
  'program_foundations',
  'program_fat_loss',
  'program_endurance',
  'program_hiking',
  'find_results_cover',
  'coach_hiring',
] as const
export type SiteImageSlot = (typeof SITE_IMAGE_SLOTS)[number]

const FIELDS = 'slot, image_url, alt_text, updated_at'
const MAX_ALT_LENGTH = 255

export function isSiteImageSlot(value: unknown): value is SiteImageSlot {
  return typeof value === 'string' && (SITE_IMAGE_SLOTS as readonly string[]).includes(value)
}

export interface SiteImageInput {
  imageUrl: string
  altText: string | null
}

export function parseSiteImageInput(body: any): SiteImageInput | string {
  const url = typeof body?.image_url === 'string' ? body.image_url.trim() : ''
  if (!isHttpsUrl(url)) return 'The image URL must start with https://'
  const alt = body?.alt_text
  if (alt != null && typeof alt !== 'string') return 'The alt text must be text'
  const altText = typeof alt === 'string' ? alt.trim() : ''
  if (altText.length > MAX_ALT_LENGTH) return `Keep the alt text under ${MAX_ALT_LENGTH} characters`
  return { imageUrl: url, altText: altText || null }
}

/** Public: images keyed by slot. `?slots=coach,program_hiking` limits the result to those slots. */
export async function getSiteImages(req: Request, res: Response) {
  try {
    const requested = typeof req.query.slots === 'string' ? req.query.slots.split(',') : []
    const slots = requested.length ? requested.filter(isSiteImageSlot) : [...SITE_IMAGE_SLOTS]
    const result = await query(`SELECT ${FIELDS} FROM site_images WHERE slot = ANY($1)`, [slots])
    res.json(Object.fromEntries(result.rows.map((row) => [row.slot, row])))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load images' })
  }
}

export async function upsertSiteImage(req: Request, res: Response) {
  try {
    const slot = req.params.slot
    if (!isSiteImageSlot(slot)) return res.status(404).json({ error: 'Unknown image slot' })
    const input = parseSiteImageInput(req.body)
    if (typeof input === 'string') return res.status(400).json({ error: input })
    const result = await query(
      `INSERT INTO site_images (slot, image_url, alt_text, updated_at, updated_by)
       VALUES ($1, $2, $3, NOW(), $4)
       ON CONFLICT (slot) DO UPDATE SET
         image_url = EXCLUDED.image_url, alt_text = EXCLUDED.alt_text,
         updated_at = NOW(), updated_by = EXCLUDED.updated_by
       RETURNING ${FIELDS}`,
      [slot, input.imageUrl, input.altText, req.user!.id]
    )
    res.json(result.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to save the image' })
  }
}

export async function deleteSiteImage(req: Request, res: Response) {
  try {
    const slot = req.params.slot
    if (!isSiteImageSlot(slot)) return res.status(404).json({ error: 'Unknown image slot' })
    await query('DELETE FROM site_images WHERE slot = $1', [slot])
    res.json({ message: 'Image removed' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to remove the image' })
  }
}
