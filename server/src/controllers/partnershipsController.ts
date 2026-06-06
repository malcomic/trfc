import { Request, Response } from 'express'
import { query } from '../config/db.js'
import { getActiveTierSlugs } from './sponsorshipTiersController.js'

const VALID_STATUSES = ['pending', 'contacted', 'approved', 'declined'] as const

export async function createPartnership(req: Request, res: Response) {
  try {
    const { company_name, contact_person, email, phone, tier, message } = req.body

    if (!company_name?.trim() || !contact_person?.trim() || !email?.trim() || !phone?.trim() || !tier?.trim()) {
      return res.status(400).json({ error: 'Company name, contact person, email, phone, and tier are required' })
    }

    const validTiers = await getActiveTierSlugs()
    if (!validTiers.includes(tier)) {
      return res.status(400).json({ error: 'Invalid sponsorship tier' })
    }

    const result = await query(
      `INSERT INTO partnerships (company_name, contact_person, email, phone, tier, message, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *`,
      [company_name.trim(), contact_person.trim(), email.trim(), phone.trim(), tier, message?.trim() || null]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to submit partnership inquiry' })
  }
}

export async function getAdminPartnerships(req: Request, res: Response) {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined
    let sql = 'SELECT * FROM partnerships'
    const params: string[] = []

    if (status && status !== 'all') {
      sql += ' WHERE status = $1'
      params.push(status)
    }

    sql += ' ORDER BY created_at DESC'
    const result = await query(sql, params)
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch partnerships' })
  }
}

export async function updatePartnershipStatus(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    const result = await query(
      'UPDATE partnerships SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Partnership inquiry not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to update partnership status' })
  }
}
