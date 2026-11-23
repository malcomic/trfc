import { Request, Response } from 'express'
import { query } from '../config/db.js'
import {
  getLeaderboards,
  getMyLedger,
  getMyPointsSummary,
  reportMissingScan,
} from '../utils/pointsService.js'
import { getCurrentSeason, isCaptainUser } from '../utils/pointsEligibility.js'
import { getPointsSettings } from '../utils/pointsSettings.js'
import { nairobiDateString } from '../utils/pointsStreak.js'
import { redeemRewardPoints } from '../utils/rewardLedger.js'

export async function getMyPoints(req: Request, res: Response) {
  try {
    const summary = await getMyPointsSummary(req.user!.id)
    if (!summary) return res.status(404).json({ error: 'No active season' })
    res.json(summary)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load points' })
  }
}

export async function getMyPointsLedger(req: Request, res: Response) {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50))
    const offset = Math.max(0, Number(req.query.offset) || 0)
    res.json(await getMyLedger(req.user!.id, limit, offset))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load ledger' })
  }
}

export async function postMissingScan(req: Request, res: Response) {
  try {
    const eventId = typeof req.body?.eventId === 'string' ? req.body.eventId.trim() : ''
    if (!eventId) return res.status(400).json({ error: 'eventId is required' })
    const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 500) : undefined
    res.status(201).json(await reportMissingScan(req.user!.id, eventId, note))
  } catch (error: any) {
    const status = error?.status || 500
    if (status < 500) return res.status(status).json({ error: error.message })
    console.error(error)
    res.status(500).json({ error: 'Failed to submit report' })
  }
}

export async function getPointsLeaderboards(_req: Request, res: Response) {
  try {
    const boards = await getLeaderboards()
    if (!boards) return res.status(404).json({ error: 'No active season' })
    res.json(boards)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load leaderboards' })
  }
}

/** Redeems reward points; returns KSh value for checkout to apply. */
export async function postRedeemRewards(req: Request, res: Response) {
  try {
    const points = Number(req.body?.points)
    const sourceRef =
      typeof req.body?.sourceRef === 'string' && req.body.sourceRef.trim()
        ? req.body.sourceRef.trim().slice(0, 100)
        : `redeem:${req.user!.id}:${Date.now()}`
    const err = await redeemRewardPoints(req.user!.id, points, sourceRef)
    if (err) return res.status(400).json({ error: err })
    const settings = await getPointsSettings()
    res.json({ points, kesValue: points * settings.redeemKesPerPoint })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to redeem points' })
  }
}

export async function postDispute(req: Request, res: Response) {
  try {
    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : ''
    if (body.length < 10) return res.status(400).json({ error: 'Describe the dispute (at least 10 characters)' })
    const season = await getCurrentSeason()
    if (!season) return res.status(404).json({ error: 'No active season' })
    const row = await query(
      `INSERT INTO points_disputes (user_id, season_id, body)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user!.id, season.id, body.slice(0, 4000)]
    )
    res.status(201).json(row.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to submit dispute' })
  }
}

function nairobiYmd(d = new Date()): string {
  return nairobiDateString(d)
}

export async function postTransformationEntry(req: Request, res: Response) {
  try {
    const day = nairobiYmd()
    if (day > '2027-06-30') {
      return res.status(403).json({ error: 'Transformation entries closed on 30 June 2027' })
    }
    const story = typeof req.body?.story === 'string' ? req.body.story.trim() : ''
    if (story.length < 20) return res.status(400).json({ error: 'Share a short story (at least 20 characters)' })
    const season = await getCurrentSeason()
    if (!season) return res.status(404).json({ error: 'No active season' })
    if (await isCaptainUser(req.user!.id)) {
      return res.status(403).json({ error: 'Captains are not eligible for this award' })
    }
    const payload = {
      beforeUrl: typeof req.body?.beforeUrl === 'string' ? req.body.beforeUrl.trim().slice(0, 500) : null,
      afterUrl: typeof req.body?.afterUrl === 'string' ? req.body.afterUrl.trim().slice(0, 500) : null,
      story: story.slice(0, 4000),
      sharePhotos: req.body?.sharePhotos === true,
    }
    const row = await query(
      `INSERT INTO award_entries (season_id, award, user_id, source, payload)
       VALUES ($1, 'transformation', $2, 'self', $3::jsonb)
       RETURNING *`,
      [season.id, req.user!.id, JSON.stringify(payload)]
    )
    res.status(201).json(row.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to submit transformation entry' })
  }
}

export async function postCommunityNominate(req: Request, res: Response) {
  try {
    const day = nairobiYmd()
    if (day < '2027-07-01' || day > '2027-07-31') {
      return res.status(403).json({ error: 'Community Champion nominations are only open in July 2027' })
    }
    const nomineeId = typeof req.body?.nomineeId === 'string' ? req.body.nomineeId.trim() : ''
    if (!nomineeId) return res.status(400).json({ error: 'nomineeId is required' })
    if (nomineeId === req.user!.id) return res.status(400).json({ error: 'You cannot nominate yourself' })
    const season = await getCurrentSeason()
    if (!season) return res.status(404).json({ error: 'No active season' })
    const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 1000) : null
    const row = await query(
      `INSERT INTO award_entries (season_id, award, user_id, source, payload)
       VALUES ($1, 'community', $2, 'nomination', $3::jsonb)
       RETURNING *`,
      [season.id, nomineeId, JSON.stringify({ nominatedBy: req.user!.id, note })]
    )
    res.status(201).json(row.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to submit nomination' })
  }
}

export async function postCaptainFeedback(req: Request, res: Response) {
  try {
    const rating1 = Number(req.body?.rating1)
    const rating2 = Number(req.body?.rating2)
    if (![rating1, rating2].every((r) => Number.isInteger(r) && r >= 1 && r <= 5)) {
      return res.status(400).json({ error: 'rating1 and rating2 must be whole numbers from 1 to 5' })
    }
    const me = await query(`SELECT captain_id FROM users WHERE id = $1`, [req.user!.id])
    const captainId = me.rows[0]?.captain_id as string | undefined
    if (!captainId) return res.status(400).json({ error: 'Choose a captain before giving feedback' })
    const month = nairobiYmd().slice(0, 7)
    try {
      const row = await query(
        `INSERT INTO captain_feedback (user_id, captain_id, month, rating_1, rating_2)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [req.user!.id, captainId, month, rating1, rating2]
      )
      res.status(201).json(row.rows[0])
    } catch (err: any) {
      if (err?.code === '23505') {
        return res.status(409).json({ error: 'You already submitted feedback this month' })
      }
      throw err
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to submit feedback' })
  }
}
