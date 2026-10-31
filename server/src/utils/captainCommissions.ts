import { query } from '../config/db.js'
import { toKenyanMsisdn } from './phone.js'

export type CommissionSourceType = 'order' | 'medal' | 'equipment_hire' | 'ticket'
export type CommissionMatchMethod = 'account' | 'email' | 'phone'

const SOURCE_TABLES: Record<CommissionSourceType, string> = {
  order: 'orders',
  medal: 'medal_purchases',
  equipment_hire: 'equipment_hire',
  ticket: 'tickets',
}

const PURCHASE_QUERIES: Record<CommissionSourceType, string> = {
  order: `
    SELECT o.user_id, o.email, o.phone,
           COALESCE((SELECT SUM(oi.quantity * oi.unit_price) FROM order_items oi WHERE oi.order_id = o.id), 0) AS base_amount
    FROM orders o
    WHERE o.id = $1 AND o.payment_status = 'paid'`,
  medal: `
    SELECT p.user_id, p.email, p.phone, mo.price AS base_amount
    FROM medal_purchases p
    JOIN medal_options mo ON mo.id = p.medal_option_id
    WHERE p.id = $1 AND p.payment_status = 'paid'`,
  equipment_hire: `
    SELECT h.user_id, NULL AS email, h.phone, COALESCE(h.total_cost, 0) AS base_amount
    FROM equipment_hire h
    WHERE h.id = $1 AND h.payment_status = 'paid'`,
  ticket: `
    SELECT t.user_id, t.email, t.phone, t.referral_region_id,
           COALESCE(t.unit_price, ett.price, e.price, 0) AS base_amount
    FROM tickets t
    JOIN events e ON e.id = t.event_id
    LEFT JOIN event_ticket_types ett ON ett.id = t.ticket_type_id
    WHERE t.id = $1 AND t.payment_status = 'paid' AND t.commission_eligible`,
}

interface PurchaseRow {
  user_id: string | null
  email: string | null
  phone: string | null
  base_amount: string | number
  referral_region_id?: string | null
}

export function isCommissionSourceType(value: unknown): value is CommissionSourceType {
  return typeof value === 'string' && value in SOURCE_TABLES
}

export async function resolveReferredCustomer(
  purchase: Pick<PurchaseRow, 'user_id' | 'email' | 'phone'>
): Promise<{ userId: string; method: CommissionMatchMethod } | null> {
  if (purchase.user_id) {
    return { userId: purchase.user_id, method: 'account' }
  }

  const email = purchase.email?.trim().toLowerCase()
  if (email) {
    const byEmail = await query('SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1', [email])
    if (byEmail.rows.length > 0) {
      return { userId: byEmail.rows[0].id, method: 'email' }
    }
  }

  const msisdn = toKenyanMsisdn(purchase.phone)
  if (msisdn) {
    const byPhone = await query('SELECT id FROM users WHERE phone_normalized = $1 LIMIT 2', [msisdn])
    if (byPhone.rows.length === 1) {
      return { userId: byPhone.rows[0].id, method: 'phone' }
    }
  }

  return null
}

/**
 * Creates the zone commission for one paid purchase if its buyer was referred by an active zone.
 * Captains of that zone never earn the zone commission on their own purchases.
 * Safe to call repeatedly: (source_type, source_id) is unique. A reversed commission stays
 * reversed unless `reinstate` is set (admin explicitly re-marked the purchase as paid).
 */
export async function recordCaptainCommission(
  sourceType: CommissionSourceType,
  sourceId: string,
  options: { reinstate?: boolean } = {}
): Promise<boolean> {
  try {
    const purchaseResult = await query(PURCHASE_QUERIES[sourceType], [sourceId])
    const purchase = purchaseResult.rows[0] as PurchaseRow | undefined
    if (!purchase) return false

    const baseAmount = Math.round(Number(purchase.base_amount) * 100) / 100
    if (!(baseAmount > 0)) return false

    const customer = await resolveReferredCustomer(purchase)
    if (!customer) return false

    const table = SOURCE_TABLES[sourceType]
    const onConflict = options.reinstate
      ? `ON CONFLICT (source_type, source_id) DO UPDATE
           SET status = 'pending', approved_at = NULL
           WHERE captain_commissions.status = 'reversed'`
      : 'ON CONFLICT (source_type, source_id) DO NOTHING'

    const inserted = await query(
      `INSERT INTO captain_commissions
         (region_id, referred_user_id, source_type, source_id, match_method, base_amount, rate, amount)
       SELECT r.id, u.id, $2, s.id, $3, $4::numeric, r.commission_rate,
              ROUND($4::numeric * r.commission_rate, 2)
       FROM users u
       JOIN regions r ON r.id = COALESCE($6::uuid, u.referred_by_region_id)
       JOIN ${table} s ON s.id = $5
       WHERE u.id = $1
         AND r.is_active = true
         AND NOT EXISTS (
           SELECT 1 FROM captains own WHERE own.user_id = u.id AND own.region_id = r.id AND own.status = 'active'
         )
         AND ($6::uuid IS NOT NULL OR s.created_at >= COALESCE(u.referred_at, '-infinity'::timestamptz))
       ${onConflict}
       RETURNING id`,
      [customer.userId, sourceType, customer.method, baseAmount, sourceId, purchase.referral_region_id ?? null]
    )
    return inserted.rows.length > 0
  } catch (error) {
    console.error(`Failed to record captain commission for ${sourceType} ${sourceId}:`, error)
    return false
  }
}

export async function recordCaptainCommissionsForCheckout(checkoutRequestId: string): Promise<number> {
  let created = 0
  try {
    for (const sourceType of Object.keys(SOURCE_TABLES) as CommissionSourceType[]) {
      const rows = await query(
        `SELECT id FROM ${SOURCE_TABLES[sourceType]}
         WHERE checkout_request_id = $1 AND payment_status = 'paid'`,
        [checkoutRequestId]
      )
      for (const row of rows.rows) {
        if (await recordCaptainCommission(sourceType, row.id)) created++
      }
    }
  } catch (error) {
    console.error(`Failed to record captain commissions for checkout ${checkoutRequestId}:`, error)
  }
  return created
}

export async function recordCaptainCommissionsForMedalBatch(batchId: string): Promise<number> {
  let created = 0
  try {
    const rows = await query(
      `SELECT id FROM medal_purchases WHERE purchase_batch_id = $1 AND payment_status = 'paid'`,
      [batchId]
    )
    for (const row of rows.rows) {
      if (await recordCaptainCommission('medal', row.id)) created++
    }
  } catch (error) {
    console.error(`Failed to record captain commissions for medal batch ${batchId}:`, error)
  }
  return created
}

/** Reverses a commission that has not been paid out yet. Returns true if one was reversed. */
export async function reverseCaptainCommission(
  sourceType: CommissionSourceType,
  sourceId: string
): Promise<boolean> {
  try {
    const result = await query(
      `UPDATE captain_commissions SET status = 'reversed', approved_at = NULL
       WHERE source_type = $1 AND source_id = $2 AND status IN ('pending', 'approved')
       RETURNING id`,
      [sourceType, sourceId]
    )
    return result.rows.length > 0
  } catch (error) {
    console.error(`Failed to reverse captain commission for ${sourceType} ${sourceId}:`, error)
    return false
  }
}

/** Records any missing commissions for purchases paid in the last `days` days. */
export async function syncCaptainCommissions(days = 90): Promise<number> {
  let created = 0
  for (const sourceType of Object.keys(SOURCE_TABLES) as CommissionSourceType[]) {
    const rows = await query(
      `SELECT s.id FROM ${SOURCE_TABLES[sourceType]} s
       LEFT JOIN captain_commissions cc ON cc.source_type = $1 AND cc.source_id = s.id
       WHERE s.payment_status = 'paid'
         AND s.created_at >= NOW() - ($2::int * INTERVAL '1 day')
         AND cc.id IS NULL`,
      [sourceType, days]
    )
    for (const row of rows.rows) {
      if (await recordCaptainCommission(sourceType, row.id)) created++
    }
  }
  return created
}
