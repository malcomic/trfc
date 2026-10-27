import { query } from '../config/db.js'
import { MIN_TOPUP, roundKes, withWallet } from './wallet.js'

export interface WalletLimitSettings {
  capMultiplier: number
  ticketsPerEvent: number
  capFloor: number
  capCeiling: number
}

export interface WalletLimit {
  cap: number
  /** Σ over upcoming events of (highest active ticket price × tickets per event), before the multiplier and clamp. */
  base: number
  settings: WalletLimitSettings
}

export const DEFAULT_WALLET_LIMIT_SETTINGS: WalletLimitSettings = {
  capMultiplier: 1.5,
  ticketsPerEvent: 4,
  capFloor: 5000,
  capCeiling: 100_000,
}

/** Unconfirmed top-ups older than this are treated as abandoned and stop counting against the cap. */
const PENDING_TOPUP_WINDOW_MINUTES = 15
const CACHE_TTL_MS = 60_000

let cached: { value: WalletLimit; expiresAt: number } | null = null

export class WalletLimitError extends Error {
  status = 400
  constructor(public cap: number, public headroom: number) {
    super(
      headroom < MIN_TOPUP
        ? `Your wallet is at its limit of KES ${cap.toLocaleString()}. Spend some of your balance before topping up again.`
        : `You can add at most KES ${headroom.toLocaleString()} right now (wallet limit KES ${cap.toLocaleString()}).`
    )
    this.name = 'WalletLimitError'
  }
}

export function computeCap(settings: WalletLimitSettings, base: number): number {
  const scaled = roundKes(base * settings.capMultiplier)
  return roundKes(Math.min(settings.capCeiling, Math.max(settings.capFloor, scaled)))
}

export async function getWalletLimitSettings(): Promise<WalletLimitSettings> {
  const result = await query(
    `SELECT cap_multiplier::float AS cap_multiplier, tickets_per_event, cap_floor::float AS cap_floor,
            cap_ceiling::float AS cap_ceiling
     FROM wallet_settings WHERE id = 1`
  )
  const row = result.rows[0]
  if (!row) return DEFAULT_WALLET_LIMIT_SETTINGS
  return {
    capMultiplier: Number(row.cap_multiplier),
    ticketsPerEvent: Number(row.tickets_per_event),
    capFloor: Number(row.cap_floor),
    capCeiling: Number(row.cap_ceiling),
  }
}

export async function updateWalletLimitSettings(settings: WalletLimitSettings, updatedBy: string): Promise<void> {
  await query(
    `INSERT INTO wallet_settings (id, cap_multiplier, tickets_per_event, cap_floor, cap_ceiling, updated_at, updated_by)
     VALUES (1, $1, $2, $3, $4, NOW(), $5)
     ON CONFLICT (id) DO UPDATE SET
       cap_multiplier = EXCLUDED.cap_multiplier, tickets_per_event = EXCLUDED.tickets_per_event,
       cap_floor = EXCLUDED.cap_floor, cap_ceiling = EXCLUDED.cap_ceiling,
       updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
    [settings.capMultiplier, settings.ticketsPerEvent, settings.capFloor, settings.capCeiling, updatedBy]
  )
  cached = null
}

async function getUpcomingEventsBase(ticketsPerEvent: number): Promise<number> {
  const result = await query(
    `SELECT COALESCE(SUM(max_price), 0)::float AS base
     FROM (
       SELECT MAX(t.price) AS max_price
       FROM events e
       JOIN event_ticket_types t ON t.event_id = e.id AND t.is_active = true
       WHERE e.is_active = true AND e.event_date >= CURRENT_DATE
       GROUP BY e.id
     ) upcoming`
  )
  return roundKes(Number(result.rows[0]?.base ?? 0) * ticketsPerEvent)
}

/** The cap is the same for every member, so it is cached briefly. */
export async function getWalletLimit({ fresh = false }: { fresh?: boolean } = {}): Promise<WalletLimit> {
  if (!fresh && cached && cached.expiresAt > Date.now()) return cached.value
  const settings = await getWalletLimitSettings()
  const base = await getUpcomingEventsBase(settings.ticketsPerEvent)
  const value = { cap: computeCap(settings, base), base, settings }
  cached = { value, expiresAt: Date.now() + CACHE_TTL_MS }
  return value
}

export function clearWalletLimitCache() {
  cached = null
}

type Run = (sql: string, params: unknown[]) => Promise<{ rows: any[] }>

async function getPendingTopupTotal(run: Run, userId: string): Promise<number> {
  const result = await run(
    `SELECT COALESCE(SUM(amount), 0)::float AS pending
     FROM wallet_transactions
     WHERE user_id = $1 AND type = 'topup' AND status = 'pending'
       AND created_at > NOW() - INTERVAL '${PENDING_TOPUP_WINDOW_MINUTES} minutes'`,
    [userId]
  )
  return Number(result.rows[0]?.pending ?? 0)
}

/** How much more the member may top up. Never negative; a balance above the cap (e.g. from refunds) simply gives 0. */
export function headroomFor(cap: number, balance: number, pending: number): number {
  return Math.max(0, Math.floor(cap - balance - pending))
}

export async function getTopUpHeadroom(userId: string, balance: number): Promise<{ cap: number; headroom: number }> {
  const { cap } = await getWalletLimit()
  const pending = await getPendingTopupTotal(query, userId)
  return { cap, headroom: headroomFor(cap, balance, pending) }
}

/**
 * Checks the cap and records the pending top-up while holding the wallet lock, so two top-ups started
 * at the same time cannot both slip under the limit. Refunds and confirmed M-Pesa credits are never capped.
 */
export async function reserveTopup(
  userId: string,
  params: { amount: number; phone: string; note: string }
): Promise<{ txId: string; cap: number; headroom: number }> {
  const { cap } = await getWalletLimit()
  return withWallet(userId, async (client, wallet) => {
    const pending = await getPendingTopupTotal((sql, params) => client.query(sql, params), userId)
    const headroom = headroomFor(cap, wallet.balance, pending)
    if (params.amount > headroom) throw new WalletLimitError(cap, headroom)
    const amount = roundKes(params.amount)
    const result = await client.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, mpesa_amount, status, phone, note)
       VALUES ($1, 'topup', $2, $2, 'pending', $3, $4) RETURNING id`,
      [userId, amount, params.phone, params.note]
    )
    return { txId: result.rows[0].id, cap, headroom: headroom - amount }
  })
}
