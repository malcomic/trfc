import { Request, Response } from 'express'
import { query } from '../config/db.js'

const EQUIPMENT_PACKAGES = {
  daily: { price: 500, description: 'Daily rate' },
  weekly: { price: 2500, description: 'Weekly rate (7 days)' },
  monthly: { price: 8000, description: 'Monthly rate (30 days)' },
}

function calculateCost(
  packageType: string,
  startDate: Date,
  endDate: Date
): number {
  const days =
    Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1

  const rate =
    EQUIPMENT_PACKAGES[packageType as keyof typeof EQUIPMENT_PACKAGES]?.price ||
    500

  return days * rate
}

export async function getAvailableEquipment(
  req: Request,
  res: Response
) {
  try {
    const packages = Object.entries(EQUIPMENT_PACKAGES).map(([key, value]) => ({
      packageType: key,
      price: value.price,
      description: value.description,
    }))

    res.json(packages)
  } catch (error) {
    console.error('Error fetching equipment:', error)
    res.status(500).json({ error: 'Failed to fetch equipment' })
  }
}

export async function createEquipmentHireRequest(
  req: Request,
  res: Response
) {
  try {
    const { equipmentName, packageType, hireDate, returnDate } = req.body
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!equipmentName || !packageType || !hireDate || !returnDate) {
      return res.status(400).json({
        error: 'equipmentName, packageType, hireDate, and returnDate are required',
      })
    }

    if (!EQUIPMENT_PACKAGES[packageType as keyof typeof EQUIPMENT_PACKAGES]) {
      return res.status(400).json({
        error: 'Invalid packageType. Must be daily, weekly, or monthly',
      })
    }

    const startDate = new Date(hireDate)
    const endDate = new Date(returnDate)

    if (startDate >= endDate) {
      return res
        .status(400)
        .json({ error: 'returnDate must be after hireDate' })
    }

    const totalCost = calculateCost(packageType, startDate, endDate)

    const result = await query(
      `INSERT INTO equipment_hire
       (user_id, equipment_name, package_type, hire_date, return_date, total_cost, payment_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        userId,
        equipmentName,
        packageType,
        hireDate,
        returnDate,
        totalCost,
        'pending',
      ]
    )

    res.status(201).json({
      id: result.rows[0].id,
      equipmentName,
      packageType,
      hireDate,
      returnDate,
      totalCost,
      paymentStatus: 'pending',
    })
  } catch (error) {
    console.error('Error creating equipment hire request:', error)
    res.status(500).json({ error: 'Failed to create hire request' })
  }
}

export async function getEquipmentHireRequests(
  req: Request,
  res: Response
) {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const result = await query(
      `SELECT *
       FROM equipment_hire
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching equipment hire requests:', error)
    res.status(500).json({ error: 'Failed to fetch hire requests' })
  }
}

export async function getEquipmentHireById(req: Request, res: Response) {
  try {
    const { id } = req.params
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const result = await query(
      'SELECT * FROM equipment_hire WHERE id = $1 AND user_id = $2',
      [id, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Hire request not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching equipment hire:', error)
    res.status(500).json({ error: 'Failed to fetch hire request' })
  }
}

export async function confirmPaymentAndHire(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { mpesaReceipt, checkoutRequestId } = req.body
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const result = await query(
      `UPDATE equipment_hire
       SET payment_status = $1, mpesa_receipt = $2, checkout_request_id = $3
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      ['paid', mpesaReceipt || null, checkoutRequestId || null, id, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Hire request not found' })
    }

    res.json({
      message: 'Equipment hire confirmed',
      hire: result.rows[0],
    })
  } catch (error) {
    console.error('Error confirming hire payment:', error)
    res.status(500).json({ error: 'Failed to confirm hire' })
  }
}

export async function getEquipment(req: Request, res: Response) {
  try {
    res.json({ message: 'Get equipment' })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
}
