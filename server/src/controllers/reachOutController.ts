import { Request, Response } from 'express'
import { query } from '../config/db.js'
import { isUuid } from '../utils/zones.js'
import {
  EXPORT_COLUMNS,
  EXPORT_MAX_ROWS,
  OutreachInputError,
  addOutreachEntry,
  countReachOutMembers,
  getOutreachLog,
  getReachOutStats,
  listReachOutMembers,
  listSavedFilters,
  logReachOutAccess,
  parseReachOutFilters,
  toCsv,
  toExportRow,
  type ReachOutScope,
} from '../utils/reachOut.js'

const MAX_PAGE_SIZE = 100
const DEFAULT_PAGE_SIZE = 50

/** Admins see everyone. A captain role would return `{ regionId }` for their zone here. */
function scopeFor(_req: Request): ReachOutScope {
  return {}
}

function positiveInt(value: unknown, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : fallback
}

export async function getStats(req: Request, res: Response) {
  try {
    res.json(await getReachOutStats(scopeFor(req)))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load Reach Out counts' })
  }
}

export async function getMembers(req: Request, res: Response) {
  try {
    const filters = parseReachOutFilters(req.query)
    const scope = scopeFor(req)
    const page = positiveInt(req.query.page, 1)
    const pageSize = positiveInt(req.query.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)

    const [total, members] = await Promise.all([
      countReachOutMembers(filters, scope),
      listReachOutMembers(filters, scope, { limit: pageSize, offset: (page - 1) * pageSize }),
    ])

    // Only the first page of a non-search view counts as "opened", so typing a search doesn't flood the log.
    if (page === 1 && !filters.search) {
      logReachOutAccess(req.user?.id, 'view', filters, total).catch((error) =>
        console.error('Failed to log Reach Out view:', error)
      )
    }

    res.json({ members, total, page, pageSize })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load members' })
  }
}

export async function getMemberLog(req: Request, res: Response) {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Member not found' })
    res.json(await getOutreachLog(req.params.id))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load contact history' })
  }
}

export async function createMemberLog(req: Request, res: Response) {
  try {
    const entry = await addOutreachEntry(req.params.id, req.user!.id, req.body?.status, req.body?.note)
    res.status(201).json(entry)
  } catch (error) {
    if (error instanceof OutreachInputError) return res.status(error.status).json({ error: error.message })
    console.error(error)
    res.status(500).json({ error: 'Failed to save contact' })
  }
}

export async function exportMembers(req: Request, res: Response) {
  try {
    const filters = parseReachOutFilters(req.query)
    const members = await listReachOutMembers(filters, scopeFor(req), { limit: EXPORT_MAX_ROWS, offset: 0 })
    // Exports must be traceable, so a failed log stops the download.
    await logReachOutAccess(req.user?.id, 'export', filters, members.length)

    const date = new Date().toISOString().slice(0, 10)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="reach-out-${date}.csv"`)
    res.send(toCsv(EXPORT_COLUMNS, members.map(toExportRow)))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to export members' })
  }
}

export async function getSavedFilters(req: Request, res: Response) {
  try {
    res.json(await listSavedFilters(scopeFor(req)))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load saved lists' })
  }
}

export async function createSavedFilter(req: Request, res: Response) {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
    if (!name || name.length > 100) return res.status(400).json({ error: 'Give the list a name (up to 100 characters)' })
    const filters = parseReachOutFilters(req.body?.filters)
    if (Object.keys(filters).length === 0) return res.status(400).json({ error: 'Choose at least one filter to save' })

    const result = await query(
      `INSERT INTO reach_out_saved_filters (name, filters, created_by) VALUES ($1, $2, $3)
       RETURNING id, name, filters, created_at`,
      [name, JSON.stringify(filters), req.user!.id]
    )
    const count = await countReachOutMembers(filters, scopeFor(req))
    res.status(201).json({ ...result.rows[0], filters, count })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to save list' })
  }
}

export async function deleteSavedFilter(req: Request, res: Response) {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ error: 'List not found' })
    const result = await query('DELETE FROM reach_out_saved_filters WHERE id = $1 RETURNING id', [req.params.id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'List not found' })
    res.json({ message: 'List deleted' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to delete list' })
  }
}
