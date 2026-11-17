import { Request, Response } from 'express'
import { query } from '../config/db.js'
import { assertAssigned, CoachAccessError, getAssignedProgramIds } from '../utils/coachAccess.js'
import {
  computeEngagementStatus,
  countMissedSessions,
  ENGAGEMENT_ATTENTION_LIMIT,
  loadLastActivityByUser,
  type EngagementStatus,
} from '../utils/coachEngagement.js'
import { getPublishedContent } from '../utils/programCatalog.js'
import { loadProgress } from '../utils/programProgress.js'

function coachId(req: Request): string {
  return req.user!.id
}

function handleAccess(res: Response, error: unknown) {
  if (error instanceof CoachAccessError) {
    return res.status(error.status).json({ error: error.message })
  }
  console.error(error)
  return res.status(500).json({ error: 'Something went wrong' })
}

const DEFAULT_STATUSES: EngagementStatus[] = ['needs_attention', 'inactive']

function parseStatusFilter(raw: unknown): EngagementStatus[] {
  if (typeof raw !== 'string' || !raw.trim()) return DEFAULT_STATUSES
  const allowed = new Set<EngagementStatus>(['on_track', 'needs_attention', 'inactive', 'completed'])
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is EngagementStatus => allowed.has(s as EngagementStatus))
  return parts.length > 0 ? parts : DEFAULT_STATUSES
}

export async function getEngagementAttention(req: Request, res: Response) {
  try {
    const id = coachId(req)
    let programIds = await getAssignedProgramIds(id)
    if (programIds.length === 0) {
      return res.json({ items: [] })
    }

    const programFilter = typeof req.query.program === 'string' ? req.query.program : null
    if (programFilter) {
      const program = await assertAssigned(id, programFilter)
      programIds = [program.id]
    }

    const statusFilter = new Set(parseStatusFilter(req.query.status))

    const programs = await query(
      `SELECT id, slug, name FROM programs WHERE id = ANY($1::varchar[])`,
      [programIds]
    )
    const programById = new Map(programs.rows.map((p) => [p.id, p]))

    const items: Array<{
      participantId: string
      participantName: string
      programId: string
      programSlug: string
      programName: string
      engagementStatus: EngagementStatus
      daysSinceActivity: number
      currentWeek: number
      totalWeeks: number
      reasons: string[]
      lastActivityAt: string
    }> = []

    for (const programId of programIds) {
      const program = programById.get(programId)
      if (!program) continue

      const content = await getPublishedContent(programId)
      const totalWeeks = content?.weeks?.length ?? 0
      const roster = await query(
        `SELECT u.id, u.name, pe.enrolled_at, pe.status
         FROM program_enrollments pe
         JOIN users u ON u.id = pe.user_id
         WHERE pe.program = $1`,
        [programId]
      )
      if (roster.rows.length === 0) continue

      const userIds = roster.rows.map((r: { id: string }) => r.id)
      const lastByUser = await loadLastActivityByUser(programId, userIds)

      for (const row of roster.rows) {
        const progress = await loadProgress(row.id, programId, totalWeeks)
        const lastActivityAt = lastByUser.get(row.id) ?? new Date(row.enrolled_at)
        const missedSessionCount = countMissedSessions(content, progress)
        const completedSessionCount = progress.completed.filter((c) => c.done).length
        const engagement = computeEngagementStatus({
          graduated: progress.graduated || row.status === 'completed',
          enrolledAt: new Date(row.enrolled_at),
          lastActivityAt,
          currentWeek: progress.currentWeek,
          totalWeeks: progress.totalWeeks,
          missedSessionCount,
          completedSessionCount,
        })

        if (!statusFilter.has(engagement.status)) continue

        items.push({
          participantId: row.id,
          participantName: row.name,
          programId: program.id,
          programSlug: program.slug,
          programName: program.name,
          engagementStatus: engagement.status,
          daysSinceActivity: engagement.daysSinceActivity,
          currentWeek: progress.currentWeek,
          totalWeeks: progress.totalWeeks,
          reasons: engagement.reasons,
          lastActivityAt: lastActivityAt.toISOString(),
        })
      }
    }

    const rank = (s: EngagementStatus) => (s === 'inactive' ? 0 : s === 'needs_attention' ? 1 : 2)
    items.sort((a, b) => {
      const byStatus = rank(a.engagementStatus) - rank(b.engagementStatus)
      if (byStatus !== 0) return byStatus
      return b.daysSinceActivity - a.daysSinceActivity
    })

    res.json({ items: items.slice(0, ENGAGEMENT_ATTENTION_LIMIT) })
  } catch (error) {
    handleAccess(res, error)
  }
}
