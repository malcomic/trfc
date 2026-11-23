import { randomInt } from 'crypto'
import type { PoolClient } from 'pg'
import { query } from '../config/db.js'
import { getPointsSettings } from './pointsSettings.js'

type Queryable = Pick<PoolClient, 'query'>
const poolDb = { query } as unknown as Queryable

export type RewardKind = 'earn_spend' | 'referral' | 'redeem' | 'expire' | 'adjustment' | 'mom_prize'

const REFERRAL_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateReferralCode(): string {
  let code = 'R'
  for (let i = 0; i < 7; i++) code += REFERRAL_ALPHABET[randomInt(REFERRAL_ALPHABET.length)]
  return code
}

export async function ensureMemberReferralCode(userId: string, db: Queryable = poolDb): Promise<string> {
  const existing = await db.query(`SELECT referral_code FROM users WHERE id = $1`, [userId])
  if (existing.rows[0]?.referral_code) return existing.rows[0].referral_code
  for (let i = 0; i < 8; i++) {
    const code = generateReferralCode()
    try {
      const updated = await db.query(
        `UPDATE users SET referral_code = $2 WHERE id = $1 AND referral_code IS NULL RETURNING referral_code`,
        [userId, code]
      )
      if (updated.rows[0]?.referral_code) return updated.rows[0].referral_code
      const again = await db.query(`SELECT referral_code FROM users WHERE id = $1`, [userId])
      if (again.rows[0]?.referral_code) return again.rows[0].referral_code
    } catch {
      /* unique clash — retry */
    }
  }
  throw new Error('Could not create a referral code')
}

export async function rewardBalance(userId: string, db: Queryable = poolDb): Promise<number> {
  const result = await db.query(
    `SELECT COALESCE(SUM(points), 0)::int AS total FROM reward_ledger WHERE user_id = $1`,
    [userId]
  )
  return Number(result.rows[0]?.total ?? 0)
}

export async function appendRewardPoints(
  input: {
    userId: string
    points: number
    kind: RewardKind
    sourceRef?: string | null
    expiresAt?: Date | null
    createdBy?: string | null
    reason?: string | null
  },
  db: Queryable = poolDb
): Promise<{ id: string } | null> {
  if (input.points === 0) return null
  if (input.sourceRef) {
    const dup = await db.query(
      `SELECT id FROM reward_ledger WHERE user_id = $1 AND kind = $2 AND source_ref = $3 LIMIT 1`,
      [input.userId, input.kind, input.sourceRef]
    )
    if (dup.rows[0]) return null
  }
  const result = await db.query(
    `INSERT INTO reward_ledger (user_id, points, kind, source_ref, expires_at, created_by, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      input.userId,
      input.points,
      input.kind,
      input.sourceRef ?? null,
      input.expiresAt ?? null,
      input.createdBy ?? null,
      input.reason ?? null,
    ]
  )
  return result.rows[0] ?? null
}

/** Earn reward points from a paid amount in KSh. */
export async function earnFromSpend(
  userId: string,
  amountKes: number,
  sourceRef: string,
  db: Queryable = poolDb
): Promise<number> {
  const settings = await getPointsSettings()
  const points = Math.floor(Number(amountKes) / settings.spendKesPerPoint)
  if (points <= 0) return 0
  const expires = new Date()
  expires.setMonth(expires.getMonth() + settings.rewardExpiryMonths)
  const row = await appendRewardPoints(
    {
      userId,
      points,
      kind: 'earn_spend',
      sourceRef,
      expiresAt: expires,
    },
    db
  )
  return row ? points : 0
}

/** Redeem points (negative ledger row). Returns error string or null. */
export async function redeemRewardPoints(
  userId: string,
  points: number,
  sourceRef: string,
  db: Queryable = poolDb
): Promise<string | null> {
  if (!Number.isInteger(points) || points <= 0) return 'Points to redeem must be a positive whole number'
  const balance = await rewardBalance(userId, db)
  if (balance < points) return 'Not enough reward points'
  await appendRewardPoints(
    {
      userId,
      points: -points,
      kind: 'redeem',
      sourceRef,
    },
    db
  )
  return null
}

export async function attachMemberReferral(
  referredId: string,
  referralCode: string,
  db: Queryable = poolDb
): Promise<boolean> {
  const referrer = await db.query(
    `SELECT id FROM users WHERE referral_code = $1 LIMIT 1`,
    [referralCode.trim().toUpperCase()]
  )
  const referrerId = referrer.rows[0]?.id as string | undefined
  if (!referrerId || referrerId === referredId) return false
  const inserted = await db.query(
    `INSERT INTO member_referrals (referrer_id, referred_id, status)
     VALUES ($1, $2, 'pending')
     ON CONFLICT (referred_id) DO NOTHING
     RETURNING id`,
    [referrerId, referredId]
  )
  return inserted.rows.length > 0
}

export async function grantReferralRewardIfDue(referredId: string, db: Queryable = poolDb): Promise<number> {
  const settings = await getPointsSettings()
  const pending = await db.query(
    `SELECT id, referrer_id FROM member_referrals
     WHERE referred_id = $1 AND status = 'pending'
     FOR UPDATE`,
    [referredId]
  )
  const row = pending.rows[0]
  if (!row) return 0
  await db.query(
    `UPDATE member_referrals SET status = 'cleared', cleared_at = NOW() WHERE id = $1`,
    [row.id]
  )
  const expires = new Date()
  expires.setMonth(expires.getMonth() + settings.rewardExpiryMonths)
  await appendRewardPoints(
    {
      userId: row.referrer_id,
      points: settings.referralRewardPoints,
      kind: 'referral',
      sourceRef: `referral:${row.id}`,
      expiresAt: expires,
      reason: 'Member referral cleared',
    },
    db
  )
  return settings.referralRewardPoints
}

/** Expire aged positive earn rows by writing offsetting expire rows. */
export async function expireRewardPoints(now = new Date(), db: Queryable = poolDb): Promise<number> {
  const due = await db.query(
    `SELECT id, user_id, points FROM reward_ledger
     WHERE points > 0
       AND expires_at IS NOT NULL
       AND expires_at <= $1
       AND kind IN ('earn_spend', 'referral', 'adjustment', 'mom_prize')
       AND NOT EXISTS (
         SELECT 1 FROM reward_ledger x
         WHERE x.kind = 'expire' AND x.source_ref = 'expire:' || reward_ledger.id::text
       )
     LIMIT 200`,
    [now]
  )
  let n = 0
  for (const row of due.rows) {
    await appendRewardPoints(
      {
        userId: row.user_id,
        points: -Number(row.points),
        kind: 'expire',
        sourceRef: `expire:${row.id}`,
        reason: 'Expired after 12 months',
      },
      db
    )
    n++
  }
  return n
}
