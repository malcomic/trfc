import { Request, Response } from 'express'
import { getClient, query } from '../config/db.js'
import { formatSessionTime } from '../utils/liveQa.js'
import { parsePollInput, parsePollUpdate, pollFromRow, pollResults } from '../utils/memberPolls.js'
import { publishAnnouncement } from '../utils/publishAnnouncement.js'
import { isUuid } from '../utils/zones.js'

const db = { query } as any
export const OPTIONS_LOCKED_ERROR = 'Options are locked once members have voted'

async function pollsJson(ids?: string[]) {
  const result = await query(
    `SELECT id, question, description, opens_at, closes_at, closed_early_at, created_at
     FROM member_polls ${ids ? 'WHERE id = ANY($1::uuid[])' : ''}
     ORDER BY created_at DESC
     LIMIT 200`,
    ids ? [ids] : []
  )
  const results = await pollResults(db, result.rows.map((r: any) => r.id), null)
  const now = new Date()
  return result.rows.map((row: any) => pollFromRow(row, results.get(row.id), now))
}

export async function listPolls(_req: Request, res: Response) {
  try {
    res.json(await pollsJson())
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load polls' })
  }
}

async function insertOptions(client: { query: typeof query }, pollId: string, options: string[]) {
  for (let i = 0; i < options.length; i++) {
    await client.query('INSERT INTO member_poll_options (poll_id, label, sort_order) VALUES ($1, $2, $3)', [
      pollId,
      options[i],
      (i + 1) * 10,
    ])
  }
}

export async function createPoll(req: Request, res: Response) {
  const parsed = parsePollInput(req.body)
  if (!parsed.ok) return res.status(400).json({ error: parsed.error })
  const p = parsed.value
  const client = await getClient()
  let pollId: string
  try {
    await client.query('BEGIN')
    const created = await client.query(
      `INSERT INTO member_polls (question, description, opens_at, closes_at, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [p.question, p.description, p.opensAt, p.closesAt, req.user?.id ?? null]
    )
    pollId = created.rows[0].id
    await insertOptions(client as any, pollId, p.options)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    console.error(error)
    return res.status(500).json({ error: 'Failed to create the poll' })
  } finally {
    client.release()
  }

  let announced = false
  if (p.announce) {
    try {
      const opensLater = p.opensAt.getTime() > Date.now()
      await publishAnnouncement(
        {
          title: `Member vote: ${p.question}`.slice(0, 150),
          body: opensLater
            ? `A new member vote opens on ${formatSessionTime(p.opensAt)}. Voting closes on ${formatSessionTime(p.closesAt)}.`
            : `A new member vote is open. Have your say before it closes on ${formatSessionTime(p.closesAt)}.`,
          linkUrl: '/dashboard/vote',
          linkLabel: 'Vote now',
          kind: 'news',
          audience: 'members',
          sendEmail: true,
        },
        req.user?.id ?? null
      )
      announced = true
    } catch (error) {
      console.error('Failed to announce poll:', error)
    }
  }
  try {
    const [poll] = await pollsJson([pollId])
    res.status(201).json({ poll, announced })
  } catch (error) {
    console.error(error)
    res.status(201).json({ poll: null, announced })
  }
}

const POLL_COLUMNS: Record<string, string> = {
  question: 'question',
  description: 'description',
  opensAt: 'opens_at',
  closesAt: 'closes_at',
}

export async function updatePoll(req: Request, res: Response) {
  const id = String(req.params.id)
  if (!isUuid(id)) return res.status(404).json({ error: 'Poll not found' })
  const parsed = parsePollUpdate(req.body)
  if (!parsed.ok) return res.status(400).json({ error: parsed.error })
  const { options, ...fields } = parsed.value
  const client = await getClient()
  try {
    await client.query('BEGIN')
    const existing = await client.query(
      `SELECT p.opens_at, p.closes_at, (SELECT COUNT(*)::int FROM member_votes v WHERE v.poll_id = p.id) AS votes
       FROM member_polls p WHERE p.id = $1 FOR UPDATE`,
      [id]
    )
    const current = existing.rows[0]
    if (!current) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Poll not found' })
    }
    const opensAt = fields.opensAt ?? new Date(current.opens_at)
    const closesAt = fields.closesAt ?? new Date(current.closes_at)
    if (closesAt.getTime() <= opensAt.getTime()) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'The poll must close after it opens' })
    }
    if (options && current.votes > 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: OPTIONS_LOCKED_ERROR })
    }

    const sets: string[] = []
    const params: unknown[] = []
    for (const [field, value] of Object.entries(fields)) {
      params.push(value)
      sets.push(`${POLL_COLUMNS[field]} = $${params.length}`)
    }
    if (sets.length > 0) {
      params.push(id)
      await client.query(`UPDATE member_polls SET ${sets.join(', ')} WHERE id = $${params.length}`, params)
    }
    if (options) {
      await client.query('DELETE FROM member_poll_options WHERE poll_id = $1', [id])
      await insertOptions(client as any, id, options)
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    console.error(error)
    return res.status(500).json({ error: 'Failed to save the poll' })
  } finally {
    client.release()
  }
  try {
    const [poll] = await pollsJson([id])
    res.json(poll)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load the poll' })
  }
}

export async function closePoll(req: Request, res: Response) {
  const id = String(req.params.id)
  if (!isUuid(id)) return res.status(404).json({ error: 'Poll not found' })
  try {
    const result = await query(
      'UPDATE member_polls SET closed_early_at = COALESCE(closed_early_at, NOW()) WHERE id = $1 RETURNING id',
      [id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Poll not found' })
    const [poll] = await pollsJson([id])
    res.json(poll)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to close the poll' })
  }
}

export async function deletePoll(req: Request, res: Response) {
  const id = String(req.params.id)
  if (!isUuid(id)) return res.status(404).json({ error: 'Poll not found' })
  try {
    const result = await query(
      `DELETE FROM member_polls p
       WHERE p.id = $1 AND NOT EXISTS (SELECT 1 FROM member_votes v WHERE v.poll_id = p.id)
       RETURNING p.id`,
      [id]
    )
    if (result.rows[0]) return res.json({ ok: true })
    const exists = await query('SELECT 1 FROM member_polls WHERE id = $1', [id])
    if (!exists.rows[0]) return res.status(404).json({ error: 'Poll not found' })
    res.status(409).json({ error: 'A poll with votes cannot be deleted. Close it instead.' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to delete the poll' })
  }
}
