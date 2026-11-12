import { Request, Response } from 'express'
import { query } from '../config/db.js'
import { signedPdfUrl } from '../utils/cloudinary.js'
import { liveQaFor } from '../utils/liveQa.js'
import { memberGuideFromRow } from '../utils/memberGuides.js'
import { PollError, RECENTLY_CLOSED_DAYS, castVote, pollFromRow, pollResults } from '../utils/memberPolls.js'
import { isActiveMember } from '../utils/seatPriority.js'
import { isUuid } from '../utils/zones.js'

const db = { query } as any
export const MEMBERS_ONLY_ERROR = 'This is for members only'

export async function listMemberGuides(req: Request, res: Response) {
  try {
    if (!(await isActiveMember(db, req.user!.id))) return res.status(403).json({ error: MEMBERS_ONLY_ERROR })
    const result = await query(
      `SELECT id, title, description, category, file_name, bytes, updated_at
       FROM member_guides WHERE is_published ORDER BY category, sort_order, created_at`
    )
    res.json(result.rows.map(memberGuideFromRow))
  } catch (error) {
    console.error('Failed to load guides:', error)
    res.status(500).json({ error: 'Failed to load the guides' })
  }
}

/** Non-members still see the date as a teaser; the join link is only for members. */
export async function getLiveQa(req: Request, res: Response) {
  try {
    const isMember = await isActiveMember(db, req.user!.id)
    res.json({ ...(await liveQaFor(isMember, new Date())), isMember })
  } catch (error) {
    console.error('Failed to load live Q&A:', error)
    res.status(500).json({ error: 'Failed to load the live Q&A' })
  }
}

async function memberPolls(userId: string, now: Date) {
  const result = await query(
    `SELECT id, question, description, opens_at, closes_at, closed_early_at
     FROM member_polls
     WHERE opens_at <= $1
       AND LEAST(closed_early_at, closes_at) > $1::timestamptz - make_interval(days => $2)
     ORDER BY (closed_early_at IS NULL AND closes_at > $1) DESC, closes_at DESC`,
    [now, RECENTLY_CLOSED_DAYS]
  )
  const results = await pollResults(db, result.rows.map((r: any) => r.id), userId)
  return result.rows.map((row: any) => pollFromRow(row, results.get(row.id), now))
}

export async function listMemberPolls(req: Request, res: Response) {
  try {
    if (!(await isActiveMember(db, req.user!.id))) return res.status(403).json({ error: MEMBERS_ONLY_ERROR })
    res.json(await memberPolls(req.user!.id, new Date()))
  } catch (error) {
    console.error('Failed to load polls:', error)
    res.status(500).json({ error: 'Failed to load the polls' })
  }
}

export async function voteInPoll(req: Request, res: Response) {
  const pollId = String(req.params.id)
  const optionId = req.body?.optionId
  if (!isUuid(pollId)) return res.status(404).json({ error: 'Poll not found' })
  if (typeof optionId !== 'string' || !isUuid(optionId)) {
    return res.status(400).json({ error: 'Pick one of the options in this poll' })
  }
  try {
    const now = new Date()
    await castVote(db, req.user!.id, pollId, optionId, now)
    const poll = (await memberPolls(req.user!.id, now)).find((p) => p.id === pollId)
    res.json(poll ?? null)
  } catch (error) {
    if (error instanceof PollError) return res.status(error.status).json({ error: error.message })
    console.error('Failed to save vote:', error)
    res.status(500).json({ error: 'Failed to save your vote' })
  }
}

export async function downloadMemberGuide(req: Request, res: Response) {
  const id = String(req.params.id)
  try {
    if (!(await isActiveMember(db, req.user!.id))) return res.status(403).json({ error: MEMBERS_ONLY_ERROR })
    if (!isUuid(id)) return res.status(404).json({ error: 'Guide not found' })
    const result = await query('SELECT public_id FROM member_guides WHERE id = $1 AND is_published', [id])
    if (!result.rows[0]) return res.status(404).json({ error: 'Guide not found' })
    res.json({ url: signedPdfUrl(result.rows[0].public_id) })
  } catch (error) {
    console.error('Failed to sign guide download:', error)
    res.status(500).json({ error: 'Failed to prepare the download' })
  }
}
