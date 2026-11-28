import { Request, Response } from 'express'
import { query } from '../config/db.js'
import {
  FINDER_BODY_DEFAULT_LABELS,
  FINDER_BODY_SLOTS,
  isFinderBodySlot,
  type FinderBodySlot,
} from '../config/finderBodyPhotos.js'
import { FIND_CLIENT_SLOTS, isFindClientSlot, type FindClientSlot } from '../config/findClientStories.js'
import { isHttpsUrl } from '../utils/videoLink.js'

export const SITE_IMAGE_SLOTS = [
  'coach',
  'program_foundations',
  'program_fat_loss',
  'program_endurance',
  'program_hiking',
  'find_results_cover',
  'coach_hiring',
  ...FINDER_BODY_SLOTS,
  ...FIND_CLIENT_SLOTS,
] as const
export type SiteImageSlot = (typeof SITE_IMAGE_SLOTS)[number]

const FIELDS = 'slot, image_url, alt_text, updated_at'
const MAX_ALT_LENGTH = 255
const MAX_CATEGORY_LENGTH = 60
const MAX_QUOTE_LENGTH = 800
const MAX_NAME_LENGTH = 120
const MAX_RESULT_LENGTH = 160

export function isSiteImageSlot(value: unknown): value is SiteImageSlot {
  return typeof value === 'string' && (SITE_IMAGE_SLOTS as readonly string[]).includes(value)
}

export interface SiteImageInput {
  imageUrl: string
  altText: string | null
  bfMin?: number | null
  bfMax?: number | null
  category?: string
  quote?: string
  clientName?: string
  result?: string
}

function parseOptionalPercent(value: unknown, label: string): number | null | string {
  if (value === undefined || value === null || value === '') return null
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 100) {
    return `${label} must be a number from 0 to 100`
  }
  return Math.round(n * 10) / 10
}

/** Returns the trimmed value, or an error message string when invalid. */
function parseRequiredText(value: unknown, label: string, max: number): { value: string } | { error: string } {
  if (typeof value !== 'string') return { error: `${label} must be text` }
  const trimmed = value.trim()
  if (!trimmed) return { error: `${label} is required` }
  if (trimmed.length > max) return { error: `Keep the ${label.toLowerCase()} under ${max} characters` }
  return { value: trimmed }
}

export function parseSiteImageInput(body: any, slot?: string): SiteImageInput | string {
  const url = typeof body?.image_url === 'string' ? body.image_url.trim() : ''
  if (!isHttpsUrl(url)) return 'The image URL must start with https://'
  const alt = body?.alt_text
  if (alt != null && typeof alt !== 'string') return 'The alt text must be text'
  const altText = typeof alt === 'string' ? alt.trim() : ''
  if (altText.length > MAX_ALT_LENGTH) return `Keep the alt text under ${MAX_ALT_LENGTH} characters`

  const input: SiteImageInput = { imageUrl: url, altText: altText || null }
  if (slot && isFinderBodySlot(slot)) {
    const bfMin = parseOptionalPercent(body?.bf_min, 'Body fat min')
    if (typeof bfMin === 'string') return bfMin
    const bfMax = parseOptionalPercent(body?.bf_max, 'Body fat max')
    if (typeof bfMax === 'string') return bfMax
    if (bfMin != null && bfMax != null && bfMin > bfMax) {
      return 'Body fat min cannot be higher than body fat max'
    }
    input.bfMin = bfMin
    input.bfMax = bfMax
  }
  if (slot && isFindClientSlot(slot)) {
    const category = parseRequiredText(body?.category, 'Category', MAX_CATEGORY_LENGTH)
    if ('error' in category) return category.error
    const quote = parseRequiredText(body?.quote, 'Quote', MAX_QUOTE_LENGTH)
    if ('error' in quote) return quote.error
    const clientName = parseRequiredText(body?.client_name, 'Client name', MAX_NAME_LENGTH)
    if ('error' in clientName) return clientName.error
    const result = parseRequiredText(body?.result, 'Result', MAX_RESULT_LENGTH)
    if ('error' in result) return result.error
    input.category = category.value
    input.quote = quote.value
    input.clientName = clientName.value
    input.result = result.value
    if (!input.altText) {
      input.altText = `${clientName.value}, ${result.value}`.slice(0, MAX_ALT_LENGTH)
    }
  }
  return input
}

async function upsertBodyMeta(slot: FinderBodySlot, label: string | null, bfMin: number | null, bfMax: number | null, userId: string) {
  await query(
    `INSERT INTO finder_body_photo_meta (slot, label, bf_min, bf_max, updated_at, updated_by)
     VALUES ($1, $2, $3, $4, NOW(), $5)
     ON CONFLICT (slot) DO UPDATE SET
       label = EXCLUDED.label, bf_min = EXCLUDED.bf_min, bf_max = EXCLUDED.bf_max,
       updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
    [slot, label || FINDER_BODY_DEFAULT_LABELS[slot], bfMin, bfMax, userId]
  )
}

async function upsertClientStoryMeta(
  slot: FindClientSlot,
  category: string,
  quote: string,
  clientName: string,
  result: string,
  userId: string
) {
  await query(
    `INSERT INTO find_client_story_meta (slot, category, quote, client_name, result, updated_at, updated_by)
     VALUES ($1, $2, $3, $4, $5, NOW(), $6)
     ON CONFLICT (slot) DO UPDATE SET
       category = EXCLUDED.category, quote = EXCLUDED.quote, client_name = EXCLUDED.client_name,
       result = EXCLUDED.result, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
    [slot, category, quote, clientName, result, userId]
  )
}

/** Public: images keyed by slot. `?slots=coach,program_hiking` limits the result to those slots. */
export async function getSiteImages(req: Request, res: Response) {
  try {
    const requested = typeof req.query.slots === 'string' ? req.query.slots.split(',') : []
    const slots = requested.length ? requested.filter(isSiteImageSlot) : [...SITE_IMAGE_SLOTS]
    const result = await query(`SELECT ${FIELDS} FROM site_images WHERE slot = ANY($1)`, [slots])
    const bodySlots = slots.filter(isFinderBodySlot)
    const clientSlots = slots.filter(isFindClientSlot)
    const metaRows =
      bodySlots.length > 0
        ? (
            await query(
              `SELECT slot, label, bf_min, bf_max FROM finder_body_photo_meta WHERE slot = ANY($1)`,
              [bodySlots]
            )
          ).rows
        : []
    const clientMetaRows =
      clientSlots.length > 0
        ? (
            await query(
              `SELECT slot, category, quote, client_name, result FROM find_client_story_meta WHERE slot = ANY($1)`,
              [clientSlots]
            )
          ).rows
        : []
    const metaBySlot = Object.fromEntries(metaRows.map((row) => [row.slot, row]))
    const clientMetaBySlot = Object.fromEntries(clientMetaRows.map((row) => [row.slot, row]))
    res.json(
      Object.fromEntries(
        result.rows.map((row) => {
          const meta = metaBySlot[row.slot]
          const clientMeta = clientMetaBySlot[row.slot]
          return [
            row.slot,
            {
              ...row,
              ...(meta
                ? {
                    label: meta.label,
                    bf_min: meta.bf_min != null ? Number(meta.bf_min) : null,
                    bf_max: meta.bf_max != null ? Number(meta.bf_max) : null,
                  }
                : {}),
              ...(clientMeta
                ? {
                    category: clientMeta.category,
                    quote: clientMeta.quote,
                    client_name: clientMeta.client_name,
                    result: clientMeta.result,
                  }
                : {}),
            },
          ]
        })
      )
    )
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load images' })
  }
}

export async function upsertSiteImage(req: Request, res: Response) {
  try {
    const slot = req.params.slot
    if (!isSiteImageSlot(slot)) return res.status(404).json({ error: 'Unknown image slot' })
    const input = parseSiteImageInput(req.body, slot)
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
    if (isFinderBodySlot(slot)) {
      await upsertBodyMeta(slot, input.altText, input.bfMin ?? null, input.bfMax ?? null, req.user!.id)
    }
    if (isFindClientSlot(slot) && input.category && input.quote && input.clientName && input.result) {
      await upsertClientStoryMeta(slot, input.category, input.quote, input.clientName, input.result, req.user!.id)
    }
    const row = result.rows[0]
    res.json({
      ...row,
      ...(isFinderBodySlot(slot)
        ? {
            label: input.altText || FINDER_BODY_DEFAULT_LABELS[slot],
            bf_min: input.bfMin ?? null,
            bf_max: input.bfMax ?? null,
          }
        : {}),
      ...(isFindClientSlot(slot)
        ? {
            category: input.category,
            quote: input.quote,
            client_name: input.clientName,
            result: input.result,
          }
        : {}),
    })
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
    if (isFinderBodySlot(slot)) {
      await query('DELETE FROM finder_body_photo_meta WHERE slot = $1', [slot])
    }
    if (isFindClientSlot(slot)) {
      await query('DELETE FROM find_client_story_meta WHERE slot = $1', [slot])
    }
    res.json({ message: 'Image removed' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to remove the image' })
  }
}

export { FIND_CLIENT_SLOTS, isFindClientSlot }
