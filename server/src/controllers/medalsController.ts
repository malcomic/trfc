import { Request, Response } from 'express'
import { query } from '../config/db.js'
import { phonesMatch } from '../utils/phone.js'
import { randomUUID } from 'crypto'
import { config } from '../config/env.js'
import {
  generateMedalQRCodeBuffer,
  generateMedalQRCodeDataUrl,
  shortMedalCode,
} from '../utils/qrCodeGenerator.js'
import { generateMedalPDF } from '../utils/medalPDFGenerator.js'
import { sendMedalBatchEmail } from '../utils/medalEmail.js'

function parseBenefits(benefits: unknown): string[] {
  if (Array.isArray(benefits)) {
    return benefits.map((b) => (typeof b === 'string' ? b.trim() : '')).filter(Boolean)
  }
  return []
}

function parseTierRow(row: Record<string, unknown>) {
  return {
    ...row,
    benefits: parseBenefits(row.benefits),
  }
}

async function getTierOptions(tierId: string, activeOnly = true) {
  const result = await query(
    `SELECT id, tier_id, distance_km, price, capacity, is_active
     FROM medal_options
     WHERE tier_id = $1 ${activeOnly ? 'AND is_active = true' : ''}
     ORDER BY distance_km ASC`,
    [tierId]
  )
  return result.rows.map((row) => ({
    ...row,
    price: Number(row.price),
    distance_km: Number(row.distance_km),
    capacity: row.capacity != null ? Number(row.capacity) : null,
  }))
}

export async function getMedals(_req: Request, res: Response) {
  try {
    const result = await query(
      `SELECT * FROM medal_tiers
       WHERE is_active = true
       ORDER BY sort_order ASC, created_at ASC`
    )

    const tiers = await Promise.all(
      result.rows.map(async (row) => {
        const options = await getTierOptions(row.id, true)
        const prices = options.map((o) => o.price)
        return {
          ...parseTierRow(row),
          options,
          min_price: prices.length > 0 ? Math.min(...prices) : null,
        }
      })
    )

    res.json(tiers)
  } catch (error) {
    console.error('Error fetching medals:', error)
    res.status(500).json({ error: 'Failed to fetch medals' })
  }
}

export async function getMedalBySlug(req: Request, res: Response) {
  try {
    const { slug } = req.params
    const result = await query(
      `SELECT * FROM medal_tiers
       WHERE slug = $1 AND is_active = true`,
      [slug]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medal tier not found' })
    }

    const tier = parseTierRow(result.rows[0])
    const options = await getTierOptions(result.rows[0].id, true)
    const prices = options.map((o) => o.price)

    res.json({
      ...tier,
      options,
      min_price: prices.length > 0 ? Math.min(...prices) : null,
    })
  } catch (error) {
    console.error('Error fetching medal:', error)
    res.status(500).json({ error: 'Failed to fetch medal' })
  }
}

export async function createMedalPurchases(req: Request, res: Response) {
  try {
    const { slug } = req.params
    const { optionId, quantity, phone, email, buyerName } = req.body
    let userId = req.user?.id ?? null

    if (userId) {
      const userCheck = await query('SELECT id FROM users WHERE id = $1', [userId])
      if (userCheck.rows.length === 0) {
        userId = null
      }
    }

    if (!optionId || !quantity || !email || !phone || !buyerName) {
      return res.status(400).json({
        error: 'optionId, quantity, email, phone, and buyerName are required',
      })
    }

    const normalizedName = String(buyerName).trim()
    if (normalizedName.length < 2 || normalizedName.length > 150) {
      return res.status(400).json({
        error: 'Buyer name must be between 2 and 150 characters',
      })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'A valid email is required' })
    }

    if (!/^254\d{9}$/.test(String(phone))) {
      return res.status(400).json({
        error: 'Invalid phone number format. Expected format: 254XXXXXXXXX',
      })
    }

    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0 || qty > 100) {
      return res.status(400).json({ error: 'Quantity must be between 1 and 100' })
    }

    const tierResult = await query(
      `SELECT * FROM medal_tiers WHERE slug = $1 AND is_active = true`,
      [slug]
    )
    if (tierResult.rows.length === 0) {
      return res.status(404).json({ error: 'Medal tier not found' })
    }
    const tier = tierResult.rows[0]

    const optionResult = await query(
      `SELECT * FROM medal_options
       WHERE id = $1 AND tier_id = $2 AND is_active = true`,
      [optionId, tier.id]
    )
    if (optionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Medal option not found for this tier' })
    }
    const option = optionResult.rows[0]
    const unitPrice = Number(option.price)

    if (option.capacity != null) {
      const countResult = await query(
        `SELECT COUNT(*)::int AS cnt FROM medal_purchases
         WHERE medal_option_id = $1 AND payment_status IN ('pending', 'paid')`,
        [optionId]
      )
      const existing = countResult.rows[0].cnt
      if (existing + qty > option.capacity) {
        return res.status(400).json({
          error: `Only ${Math.max(0, option.capacity - existing)} spot(s) available`,
        })
      }
    }

    const purchaseBatchId = randomUUID()
    const purchaseIds: string[] = []
    for (let i = 0; i < qty; i++) {
      const insertResult = await query(
        `INSERT INTO medal_purchases (
           user_id, medal_option_id, purchase_batch_id, phone, email, buyer_name,
           payment_provider, payment_status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          userId,
          optionId,
          purchaseBatchId,
          phone,
          normalizedEmail,
          normalizedName,
          'mpesa',
          'pending',
        ]
      )
      purchaseIds.push(insertResult.rows[0].id)
    }

    res.status(201).json({
      purchaseBatchId,
      purchaseIds,
      quantity: qty,
      tierName: tier.name,
      tierSlug: tier.slug,
      distanceKm: Number(option.distance_km),
      pricePerMedal: unitPrice,
      totalPrice: unitPrice * qty,
      buyerName: normalizedName,
    })
  } catch (error: unknown) {
    const pgError = error as { code?: string; message?: string }
    console.error('Error creating medal purchases:', pgError?.message ?? error)
    if (pgError?.code === '42703' || pgError?.code === '42P01') {
      return res.status(500).json({
        error: 'Database schema is out of date. Restart the server to apply migrations.',
      })
    }
    res.status(500).json({ error: 'Failed to create medal purchases' })
  }
}

export async function getUserMedalPurchases(req: Request, res: Response) {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const result = await query(
      `SELECT
         p.id, p.user_id, p.medal_option_id, p.purchase_batch_id, p.payment_status,
         p.mpesa_receipt, p.checkout_request_id, p.buyer_name, p.phone, p.email, p.created_at,
         o.distance_km, o.price,
         t.name AS tier_name, t.slug AS tier_slug, t.image_url AS tier_image_url
       FROM medal_purchases p
       JOIN medal_options o ON p.medal_option_id = o.id
       JOIN medal_tiers t ON o.tier_id = t.id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC`,
      [userId]
    )

    res.json(
      result.rows.map((row) => ({
        ...row,
        price: Number(row.price),
        distance_km: Number(row.distance_km),
      }))
    )
  } catch (error) {
    console.error('Error fetching user medal purchases:', error)
    res.status(500).json({ error: 'Failed to fetch medal purchases' })
  }
}

export async function getPurchasesByCheckoutRequestId(req: Request, res: Response) {
  try {
    const { checkoutRequestId } = req.params
    const phoneQuery = typeof req.query.phone === 'string' ? req.query.phone : undefined
    const emailQuery =
      typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : undefined

    if (!checkoutRequestId) {
      return res.status(400).json({ error: 'checkoutRequestId is required' })
    }
    if (!phoneQuery && !emailQuery) {
      return res.status(400).json({ error: 'email or phone query parameter is required' })
    }

    const result = await query(
      `SELECT
         p.id, p.user_id, p.medal_option_id, p.phone, p.email, p.buyer_name, p.payment_status,
         p.checkout_request_id, p.mpesa_receipt,
         o.distance_km, o.price,
         t.name AS tier_name, t.slug AS tier_slug
       FROM medal_purchases p
       JOIN medal_options o ON p.medal_option_id = o.id
       JOIN medal_tiers t ON o.tier_id = t.id
       WHERE p.checkout_request_id = $1
       ORDER BY p.created_at ASC`,
      [checkoutRequestId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Purchases not found for this payment reference' })
    }

    const purchase = result.rows[0]
    const phoneOk = phoneQuery && purchase.phone && phonesMatch(phoneQuery, purchase.phone)
    const emailOk =
      emailQuery && purchase.email && purchase.email.toLowerCase() === emailQuery

    if (!phoneOk && !emailOk) {
      return res.status(403).json({ error: 'Email or phone does not match medal purchase' })
    }

    const quantity = result.rows.length
    const unitPrice = Number(purchase.price)
    const totalPrice = Math.round(unitPrice * quantity)

    const purchases = await Promise.all(
      result.rows.map(async (row) => {
        let qr_data_url: string | null = null
        const short_code = shortMedalCode(row.id)
        if (row.payment_status === 'paid') {
          qr_data_url = await generateMedalQRCodeDataUrl({
            purchaseId: row.id,
            tierSlug: row.tier_slug,
            distanceKm: Number(row.distance_km),
          })
        }
        return {
          id: row.id,
          buyer_name: row.buyer_name,
          payment_status: row.payment_status,
          short_code,
          qr_data_url,
        }
      })
    )

    res.json({
      tier_name: purchase.tier_name,
      tier_slug: purchase.tier_slug,
      distance_km: Number(purchase.distance_km),
      unit_price: unitPrice,
      quantity,
      total_price: totalPrice,
      payment_status: purchase.payment_status,
      phone: purchase.phone,
      email: purchase.email,
      buyer_name: purchase.buyer_name,
      mpesa_receipt: purchase.mpesa_receipt,
      checkout_request_id: purchase.checkout_request_id,
      purchases,
    })
  } catch (error) {
    console.error('Error fetching medal purchases by checkout:', error)
    res.status(500).json({ error: 'Failed to fetch medal purchase details' })
  }
}

function resolveBuyerName(
  buyerName: string | null | undefined,
  userName: string | null | undefined,
  email: string | null | undefined
): string {
  if (buyerName && buyerName.trim()) return buyerName.trim()
  if (userName && userName.trim() && userName !== 'Guest') return userName.trim()
  if (email) {
    const local = email.split('@')[0]
    if (local) return local
  }
  return 'Guest'
}

async function buildMedalPdfBuffer(purchaseId: string) {
  const result = await query(
    `SELECT
       p.id, p.user_id, p.phone, p.email, p.buyer_name, p.payment_status, p.mpesa_receipt,
       COALESCE(NULLIF(TRIM(u.name), ''), NULL) as user_name,
       o.distance_km, o.price,
       t.name as tier_name, t.slug as tier_slug
     FROM medal_purchases p
     LEFT JOIN users u ON p.user_id = u.id
     JOIN medal_options o ON p.medal_option_id = o.id
     JOIN medal_tiers t ON o.tier_id = t.id
     WHERE p.id = $1`,
    [purchaseId]
  )

  if (result.rows.length === 0) {
    return null
  }

  const purchase = result.rows[0]
  if (purchase.payment_status !== 'paid') {
    return { unpaid: true as const, purchase }
  }

  const buyerName = resolveBuyerName(
    purchase.buyer_name,
    purchase.user_name,
    purchase.email
  )
  const shortCode = shortMedalCode(purchase.id)
  const qrCodeBuffer = await generateMedalQRCodeBuffer({
    purchaseId: purchase.id,
    tierSlug: purchase.tier_slug,
    distanceKm: Number(purchase.distance_km),
  })

  const pdfBuffer = await generateMedalPDF({
    purchaseId: purchase.id,
    shortCode,
    tierName: purchase.tier_name,
    distanceKm: Number(purchase.distance_km),
    unitPrice: parseFloat(purchase.price),
    buyerName,
    buyerPhone: purchase.phone || '',
    mpesaReceipt: purchase.mpesa_receipt || null,
    supportEmail: config.contact.email,
    supportPhone: config.contact.phone,
    qrCodeBuffer,
  })

  return { unpaid: false as const, purchase, pdfBuffer, buyerName, shortCode }
}

export async function downloadMedalPDF(req: Request, res: Response) {
  try {
    const { purchaseId } = req.params
    const userId = req.user?.id
    const phoneQuery = typeof req.query.phone === 'string' ? req.query.phone : undefined
    const emailQuery =
      typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : undefined

    if (!purchaseId) {
      return res.status(400).json({ error: 'Purchase ID is required' })
    }

    const built = await buildMedalPdfBuffer(purchaseId)
    if (!built) {
      return res.status(404).json({ error: 'Medal purchase not found' })
    }

    const purchase = built.purchase
    const isOwner = userId && purchase.user_id === userId
    const phoneOk = phoneQuery && purchase.phone && phonesMatch(phoneQuery, purchase.phone)
    const emailOk =
      emailQuery && purchase.email && purchase.email.toLowerCase() === emailQuery

    if (!isOwner && !phoneOk && !emailOk) {
      return res.status(403).json({
        error: 'Unauthorized. Sign in or verify with the email/phone used at checkout.',
      })
    }

    if (built.unpaid) {
      return res.status(403).json({
        error: 'Medal is not yet paid. Please complete payment first.',
        status: purchase.payment_status,
      })
    }

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="medal-${built.shortCode}.pdf"`
    )
    res.setHeader('Content-Length', built.pdfBuffer!.length)
    res.send(built.pdfBuffer)
  } catch (error) {
    console.error('Error downloading medal PDF:', error)
    res.status(500).json({ error: 'Failed to generate medal PDF' })
  }
}

const medalResendCooldown = new Map<string, number>()
const RESEND_COOLDOWN_MS = 60_000

export async function resendMedalEmail(req: Request, res: Response) {
  try {
    const userId = req.user?.id
    const { checkoutRequestId, purchaseId, email, phone } = req.body as {
      checkoutRequestId?: string
      purchaseId?: string
      email?: string
      phone?: string
    }

    let resolvedCheckoutId = checkoutRequestId?.trim() || ''

    if (!resolvedCheckoutId && purchaseId) {
      const purchaseResult = await query(
        `SELECT checkout_request_id, user_id, email, phone, payment_status
         FROM medal_purchases WHERE id = $1`,
        [purchaseId]
      )
      if (purchaseResult.rows.length === 0) {
        return res.status(404).json({ error: 'Medal purchase not found' })
      }
      const row = purchaseResult.rows[0]
      if (row.payment_status !== 'paid') {
        return res.status(403).json({ error: 'Medal is not yet paid' })
      }
      if (!row.checkout_request_id) {
        return res.status(400).json({ error: 'No payment reference on this purchase' })
      }
      resolvedCheckoutId = row.checkout_request_id
    }

    if (!resolvedCheckoutId) {
      return res.status(400).json({
        error: 'checkoutRequestId or purchaseId is required',
      })
    }

    const batchResult = await query(
      `SELECT id, user_id, email, phone, payment_status, checkout_request_id
       FROM medal_purchases
       WHERE checkout_request_id = $1
       ORDER BY created_at ASC`,
      [resolvedCheckoutId]
    )

    if (batchResult.rows.length === 0) {
      return res.status(404).json({ error: 'Medal purchases not found for this payment reference' })
    }

    const first = batchResult.rows[0]
    const allPaid = batchResult.rows.every((r) => r.payment_status === 'paid')
    if (!allPaid) {
      return res.status(403).json({ error: 'Medal purchase is not yet paid' })
    }

    const isOwner = userId && batchResult.rows.some((r) => r.user_id === userId)
    const emailQuery = typeof email === 'string' ? email.trim().toLowerCase() : undefined
    const phoneQuery = typeof phone === 'string' ? phone : undefined
    const phoneOk = phoneQuery && first.phone && phonesMatch(phoneQuery, first.phone)
    const emailOk =
      emailQuery && first.email && first.email.toLowerCase() === emailQuery

    if (!isOwner && !phoneOk && !emailOk) {
      return res.status(403).json({
        error: 'Unauthorized. Sign in or verify with the email/phone used at checkout.',
      })
    }

    const lastSent = medalResendCooldown.get(resolvedCheckoutId) || 0
    const now = Date.now()
    if (now - lastSent < RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((RESEND_COOLDOWN_MS - (now - lastSent)) / 1000)
      return res.status(429).json({
        error: `Please wait ${waitSec} second(s) before resending`,
      })
    }

    medalResendCooldown.set(resolvedCheckoutId, now)
    await sendMedalBatchEmail(resolvedCheckoutId)

    res.json({ success: true, message: 'Confirmation email sent' })
  } catch (error) {
    console.error('Error resending medal email:', error)
    res.status(500).json({ error: 'Failed to resend medal email' })
  }
}

// --- Admin ---

export async function getAdminMedals(_req: Request, res: Response) {
  try {
    const result = await query(
      `SELECT * FROM medal_tiers ORDER BY sort_order ASC, created_at ASC`
    )

    const tiers = await Promise.all(
      result.rows.map(async (row) => {
        const options = await getTierOptions(row.id, false)
        return {
          ...parseTierRow(row),
          options,
        }
      })
    )

    res.json(tiers)
  } catch (error) {
    console.error('Error fetching admin medals:', error)
    res.status(500).json({ error: 'Failed to fetch medals' })
  }
}

export async function updateMedalTier(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { name, description, benefits, image_url, sort_order, is_active } = req.body

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required' })
    }

    const normalizedBenefits = Array.isArray(benefits)
      ? benefits.map((b: unknown) => (typeof b === 'string' ? b.trim() : '')).filter(Boolean)
      : []

    const order = Number.isFinite(Number(sort_order)) ? Number(sort_order) : 0

    const result = await query(
      `UPDATE medal_tiers
       SET name = $1,
           description = $2,
           benefits = $3::jsonb,
           image_url = $4,
           sort_order = $5,
           is_active = COALESCE($6, is_active)
       WHERE id = $7
       RETURNING *`,
      [
        name.trim(),
        description?.trim() || null,
        JSON.stringify(normalizedBenefits),
        image_url || null,
        order,
        typeof is_active === 'boolean' ? is_active : null,
        id,
      ]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medal tier not found' })
    }

    const options = await getTierOptions(id, false)
    res.json({ ...parseTierRow(result.rows[0]), options })
  } catch (error) {
    console.error('Error updating medal tier:', error)
    res.status(500).json({ error: 'Failed to update medal tier' })
  }
}

export async function upsertMedalOption(req: Request, res: Response) {
  try {
    const { tierId } = req.params
    const { id, distance_km, price, capacity, is_active } = req.body

    const distance = Number(distance_km)
    const optionPrice = Number(price)

    if (!Number.isFinite(distance) || distance <= 0) {
      return res.status(400).json({ error: 'distance_km must be a positive number' })
    }
    if (!Number.isFinite(optionPrice) || optionPrice < 0) {
      return res.status(400).json({ error: 'price must be a non-negative number' })
    }

    const tierCheck = await query('SELECT id FROM medal_tiers WHERE id = $1', [tierId])
    if (tierCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Medal tier not found' })
    }

    const cap =
      capacity === null || capacity === undefined || capacity === ''
        ? null
        : Number(capacity)
    if (cap != null && (!Number.isFinite(cap) || cap < 0)) {
      return res.status(400).json({ error: 'capacity must be a non-negative number or null' })
    }

    const active = typeof is_active === 'boolean' ? is_active : true

    let result
    if (id) {
      result = await query(
        `UPDATE medal_options
         SET distance_km = $1, price = $2, capacity = $3, is_active = $4
         WHERE id = $5 AND tier_id = $6
         RETURNING *`,
        [distance, optionPrice, cap, active, id, tierId]
      )
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Medal option not found' })
      }
    } else {
      result = await query(
        `INSERT INTO medal_options (tier_id, distance_km, price, capacity, is_active)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (tier_id, distance_km) DO UPDATE
         SET price = EXCLUDED.price, capacity = EXCLUDED.capacity, is_active = EXCLUDED.is_active
         RETURNING *`,
        [tierId, distance, optionPrice, cap, active]
      )
    }

    const row = result.rows[0]
    res.status(id ? 200 : 201).json({
      ...row,
      price: Number(row.price),
      distance_km: Number(row.distance_km),
      capacity: row.capacity != null ? Number(row.capacity) : null,
    })
  } catch (error: any) {
    if (error?.code === '23505') {
      return res.status(400).json({ error: 'An option with this distance already exists for the tier' })
    }
    console.error('Error upserting medal option:', error)
    res.status(500).json({ error: 'Failed to save medal option' })
  }
}

export async function deleteMedalOption(req: Request, res: Response) {
  try {
    const { tierId, optionId } = req.params

    const purchaseCheck = await query(
      `SELECT COUNT(*)::int AS cnt FROM medal_purchases WHERE medal_option_id = $1`,
      [optionId]
    )
    if (purchaseCheck.rows[0].cnt > 0) {
      await query(
        `UPDATE medal_options SET is_active = false WHERE id = $1 AND tier_id = $2`,
        [optionId, tierId]
      )
      return res.json({ deactivated: true, message: 'Option has purchases; deactivated instead of deleted' })
    }

    const result = await query(
      `DELETE FROM medal_options WHERE id = $1 AND tier_id = $2 RETURNING id`,
      [optionId, tierId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Medal option not found' })
    }

    res.json({ deleted: true })
  } catch (error) {
    console.error('Error deleting medal option:', error)
    res.status(500).json({ error: 'Failed to delete medal option' })
  }
}

export async function getAdminMedalPurchases(_req: Request, res: Response) {
  try {
    const result = await query(
      `SELECT
         p.id, p.buyer_name, p.email, p.phone, p.payment_status, p.mpesa_receipt,
         p.checkout_request_id, p.purchase_batch_id, p.created_at,
         p.redeemed_at, p.redeemed_by,
         o.distance_km, o.price,
         t.name AS tier_name, t.slug AS tier_slug
       FROM medal_purchases p
       JOIN medal_options o ON p.medal_option_id = o.id
       JOIN medal_tiers t ON o.tier_id = t.id
       ORDER BY p.created_at DESC
       LIMIT 500`
    )

    res.json(
      result.rows.map((row) => ({
        ...row,
        price: Number(row.price),
        distance_km: Number(row.distance_km),
      }))
    )
  } catch (error) {
    console.error('Error fetching admin medal purchases:', error)
    res.status(500).json({ error: 'Failed to fetch medal purchases' })
  }
}
