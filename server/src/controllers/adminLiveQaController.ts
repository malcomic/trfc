import { Request, Response } from 'express'
import { query } from '../config/db.js'
import { REMINDER_FROM_MS, getLiveQa, liveQaToSettings, parseLiveQaUpdate, type LiveQa } from '../utils/liveQa.js'

async function adminView(liveQa: LiveQa) {
  const sent = liveQa.nextAt
    ? await query('SELECT sent_at FROM live_qa_reminders WHERE session_at = $1', [liveQa.nextAt])
    : { rows: [] as any[] }
  return {
    on: liveQa.on,
    nextAt: liveQa.nextAt?.toISOString() ?? null,
    zoomUrl: liveQa.zoomUrl,
    title: liveQa.title,
    notes: liveQa.notes,
    reminderAt: liveQa.nextAt ? new Date(liveQa.nextAt.getTime() - REMINDER_FROM_MS).toISOString() : null,
    reminderSentAt: sent.rows[0]?.sent_at ? new Date(sent.rows[0].sent_at).toISOString() : null,
  }
}

export async function getLiveQaAdmin(_req: Request, res: Response) {
  try {
    res.json(await adminView(await getLiveQa()))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load the live Q&A' })
  }
}

export async function updateLiveQa(req: Request, res: Response) {
  const parsed = parseLiveQaUpdate(req.body)
  if (!parsed.ok) return res.status(400).json({ error: parsed.error })
  try {
    const result = await query(
      `UPDATE member_perks SET settings = settings || $1::jsonb, updated_by = $2, updated_at = NOW()
       WHERE key = 'live_qa' RETURNING key`,
      [JSON.stringify(liveQaToSettings(parsed.value)), req.user?.id ?? null]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'The live Q&A perk is missing' })
    res.json(await adminView(await getLiveQa()))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to save the live Q&A' })
  }
}
