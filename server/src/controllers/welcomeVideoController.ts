import { Request, Response } from 'express'
import { query } from '../config/db.js'

export const WELCOME_VIDEO_SLOT = 'dashboard_welcome'
export const WELCOME_VIDEO_MAX_SHOWS = 3
export const WELCOME_VIDEO_DAYS = 14

/**
 * Called each time a member opens the dashboard overview. Counts a showing and returns the video
 * only while the member is still eligible; the check and the count happen in one update so two
 * tabs cannot use up two showings at once.
 */
export async function recordWelcomeVideoShown(req: Request, res: Response) {
  try {
    const videoResult = await query(
      'SELECT slot, source, provider, video_url, poster_url, updated_at FROM page_videos WHERE slot = $1',
      [WELCOME_VIDEO_SLOT]
    )
    const video = videoResult.rows[0]
    if (!video) return res.json({ show: false })

    const counted = await query(
      `UPDATE users SET welcome_video_shows = welcome_video_shows + 1
       WHERE id = $1 AND welcome_video_done_at IS NULL AND welcome_video_shows < $2
         AND created_at > NOW() - make_interval(days => $3)
       RETURNING welcome_video_shows`,
      [req.user!.id, WELCOME_VIDEO_MAX_SHOWS, WELCOME_VIDEO_DAYS]
    )
    const row = counted.rows[0]
    if (!row) return res.json({ show: false })

    res.json({ show: true, video, showsUsed: row.welcome_video_shows })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load the welcome video' })
  }
}

export async function markWelcomeVideoWatched(req: Request, res: Response) {
  try {
    await query(
      'UPDATE users SET welcome_video_done_at = NOW() WHERE id = $1 AND welcome_video_done_at IS NULL',
      [req.user!.id]
    )
    res.json({ ok: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to save your progress' })
  }
}
