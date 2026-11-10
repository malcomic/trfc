import type { PoolClient } from 'pg'
import { query } from '../config/db.js'
import { currentMembershipPeriod, getPerk, perkNumber } from './memberPerks.js'

type Queryable = Pick<PoolClient, 'query'>
const poolDb = { query } as unknown as Queryable

export const SHOP_DISCOUNT_PERK = 'clothes_discount'
export const DEFAULT_SHOP_DISCOUNT = 300

export interface ShopDiscountStatus {
  available: boolean
  amount: number
  membershipId: string | null
  usedOrderId: string | null
}

/**
 * The yearly member discount. A paid order uses it; a pending order holds it for 15 minutes, so failed
 * or abandoned payments give it back without a cleanup job. Pass `forUpdate` inside the order transaction.
 */
export async function shopDiscountStatus(
  db: Queryable = poolDb,
  userId: string | null | undefined,
  forUpdate = false
): Promise<ShopDiscountStatus> {
  const none = { available: false, amount: 0, membershipId: null, usedOrderId: null }
  if (!userId) return none
  const perk = await getPerk(db, SHOP_DISCOUNT_PERK)
  if (perk?.status !== 'on') return none
  const amount = perkNumber(perk, 'amount', DEFAULT_SHOP_DISCOUNT)
  const period = await currentMembershipPeriod(db, userId, forUpdate)
  if (!period) return { ...none, amount }
  const used = await db.query(
    `SELECT id FROM orders
     WHERE member_discount_membership_id = $1
       AND (payment_status = 'paid' OR (payment_status = 'pending' AND created_at > NOW() - INTERVAL '15 minutes'))
     ORDER BY created_at DESC
     LIMIT 1`,
    [period.id]
  )
  const usedOrderId = used.rows[0]?.id ?? null
  return { available: !usedOrderId, amount, membershipId: period.id, usedOrderId }
}

/** The discount never exceeds what the eligible items cost. */
export function memberDiscountFor(eligibleSubtotal: number, amount: number): number {
  return Math.max(0, Math.min(amount, eligibleSubtotal))
}
