import { Request, Response } from 'express'
import { getClient, query } from '../config/db.js'
import { isUuid } from '../utils/zones.js'

const COACH_LIST_SQL = `
  SELECT c.user_id, c.status, c.application_id, c.phone AS coach_phone, c.activated_at, c.created_at,
         u.name, u.email, u.phone,
         a.full_name AS application_name,
         COALESCE(
           (SELECT json_agg(json_build_object('id', p.id, 'slug', p.slug, 'name', p.name) ORDER BY p.sort_order, p.name)
            FROM coach_program_assignments cpa
            JOIN programs p ON p.id = cpa.program_id
            WHERE cpa.coach_id = c.user_id),
           '[]'::json
         ) AS programs
  FROM coaches c
  JOIN users u ON u.id = c.user_id
  LEFT JOIN coach_applications a ON a.id = c.application_id`

export async function listCoaches(_req: Request, res: Response) {
  try {
    const result = await query(`${COACH_LIST_SQL} ORDER BY c.activated_at DESC`)
    res.json({
      coaches: result.rows.map((r) => ({
        userId: r.user_id,
        name: r.name,
        email: r.email,
        phone: r.phone ?? r.coach_phone,
        status: r.status,
        applicationId: r.application_id,
        applicationName: r.application_name,
        activatedAt: r.activated_at,
        createdAt: r.created_at,
        programs: r.programs ?? [],
      })),
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load coaches' })
  }
}

export async function updateCoach(req: Request, res: Response) {
  try {
    const { userId } = req.params
    if (!isUuid(userId)) return res.status(404).json({ error: 'Coach not found' })
    const status = req.body?.status
    if (status !== 'active' && status !== 'suspended') {
      return res.status(400).json({ error: 'Status must be active or suspended' })
    }

    const result = await query(
      `UPDATE coaches SET status = $1 WHERE user_id = $2
       RETURNING user_id, status`,
      [status, userId]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Coach not found' })
    res.json({ userId: result.rows[0].user_id, status: result.rows[0].status })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to update coach' })
  }
}

export async function setCoachPrograms(req: Request, res: Response) {
  const client = await getClient()
  try {
    const { userId } = req.params
    if (!isUuid(userId)) return res.status(404).json({ error: 'Coach not found' })

    const programIds = req.body?.programIds
    if (!Array.isArray(programIds) || programIds.some((id) => typeof id !== 'string' || !id)) {
      return res.status(400).json({ error: 'Provide programIds as a list of program ids' })
    }
    const uniqueIds = [...new Set(programIds as string[])]

    const coach = await query(`SELECT user_id FROM coaches WHERE user_id = $1`, [userId])
    if (coach.rows.length === 0) return res.status(404).json({ error: 'Coach not found' })

    if (uniqueIds.length > 0) {
      const found = await query(`SELECT id FROM programs WHERE id = ANY($1::varchar[])`, [uniqueIds])
      if (found.rows.length !== uniqueIds.length) {
        return res.status(400).json({ error: 'One or more programs were not found' })
      }
    }

    let movedFrom: { programId: string; previousCoachId: string; previousCoachName: string }[] = []
    if (uniqueIds.length > 0) {
      const existing = await query(
        `SELECT a.program_id, a.coach_id, u.name
         FROM coach_program_assignments a
         JOIN users u ON u.id = a.coach_id
         WHERE a.program_id = ANY($1::varchar[]) AND a.coach_id <> $2`,
        [uniqueIds, userId]
      )
      movedFrom = existing.rows.map((r) => ({
        programId: r.program_id,
        previousCoachId: r.coach_id,
        previousCoachName: r.name,
      }))
    }

    await client.query('BEGIN')
    await client.query(`DELETE FROM coach_program_assignments WHERE coach_id = $1`, [userId])
    if (uniqueIds.length > 0) {
      await client.query(`DELETE FROM coach_program_assignments WHERE program_id = ANY($1::varchar[])`, [
        uniqueIds,
      ])
    }
    for (const programId of uniqueIds) {
      await client.query(
        `INSERT INTO coach_program_assignments (coach_id, program_id, assigned_by)
         VALUES ($1, $2, $3)`,
        [userId, programId, req.user?.id ?? null]
      )
    }
    await client.query('COMMIT')

    const programs = await query(
      `SELECT p.id, p.slug, p.name
       FROM coach_program_assignments a
       JOIN programs p ON p.id = a.program_id
       WHERE a.coach_id = $1
       ORDER BY p.sort_order, p.name`,
      [userId]
    )
    res.json({ userId, programs: programs.rows, movedFrom })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    console.error(error)
    res.status(500).json({ error: 'Failed to update program assignments' })
  } finally {
    client.release()
  }
}
