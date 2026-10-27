import { Request, Response } from 'express'
import { query } from '../config/db.js'
import { isHttpsUrl, parseVideoLink } from '../utils/videoLink.js'

export const PAGE_VIDEO_SLOTS = ['find_hero', 'find_results'] as const
export type PageVideoSlot = (typeof PAGE_VIDEO_SLOTS)[number]

const FIELDS = 'slot, source, provider, video_url, poster_url, updated_at'

export function isPageVideoSlot(value: unknown): value is PageVideoSlot {
  return typeof value === 'string' && (PAGE_VIDEO_SLOTS as readonly string[]).includes(value)
}

export interface PageVideoInput {
  source: 'upload' | 'link'
  provider: 'file' | 'youtube' | 'vimeo'
  videoUrl: string
  posterUrl: string | null
}

export function parsePageVideoInput(body: any): PageVideoInput | string {
  const source = body?.source
  if (source !== 'upload' && source !== 'link') return 'Choose whether the video is an upload or a link'
  const parsed = parseVideoLink(body?.video_url)
  if (!parsed) {
    return source === 'link'
      ? 'Paste a YouTube, Vimeo or direct video (.mp4, .webm) link starting with https://'
      : 'The uploaded video URL is invalid'
  }
  if (source === 'upload' && parsed.provider !== 'file') return 'Uploads must be video files'
  const poster = body?.poster_url
  if (poster != null && poster !== '' && !isHttpsUrl(poster)) return 'The cover image URL must start with https://'
  return {
    source,
    provider: parsed.provider,
    videoUrl: String(body.video_url).trim(),
    posterUrl: poster ? String(poster).trim() : null,
  }
}

/** Public: videos for one page, keyed by slot (e.g. `?page=find` returns find_hero and find_results). */
export async function getPageVideos(req: Request, res: Response) {
  try {
    const page = typeof req.query.page === 'string' ? req.query.page : ''
    const slots = PAGE_VIDEO_SLOTS.filter((slot) => !page || slot.startsWith(`${page}_`))
    const result = await query(`SELECT ${FIELDS} FROM page_videos WHERE slot = ANY($1)`, [slots])
    res.json(Object.fromEntries(result.rows.map((row) => [row.slot, row])))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load videos' })
  }
}

export async function upsertPageVideo(req: Request, res: Response) {
  try {
    const slot = req.params.slot
    if (!isPageVideoSlot(slot)) return res.status(404).json({ error: 'Unknown video slot' })
    const input = parsePageVideoInput(req.body)
    if (typeof input === 'string') return res.status(400).json({ error: input })
    const result = await query(
      `INSERT INTO page_videos (slot, source, provider, video_url, poster_url, updated_at, updated_by)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       ON CONFLICT (slot) DO UPDATE SET
         source = EXCLUDED.source, provider = EXCLUDED.provider, video_url = EXCLUDED.video_url,
         poster_url = EXCLUDED.poster_url, updated_at = NOW(), updated_by = EXCLUDED.updated_by
       RETURNING ${FIELDS}`,
      [slot, input.source, input.provider, input.videoUrl, input.posterUrl, req.user!.id]
    )
    res.json(result.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to save the video' })
  }
}

export async function deletePageVideo(req: Request, res: Response) {
  try {
    const slot = req.params.slot
    if (!isPageVideoSlot(slot)) return res.status(404).json({ error: 'Unknown video slot' })
    await query('DELETE FROM page_videos WHERE slot = $1', [slot])
    res.json({ message: 'Video removed' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to remove the video' })
  }
}
