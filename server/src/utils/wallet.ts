import type { PoolClient } from 'pg'
import { getClient, query } from '../config/db.js'

export type WalletTxType =
  | 'topup'
  | 'ticket_payment'
  | 'installment'
  | 'cancellation_credit'
  | 'plan_expiry_credit'
  | 'adjustment'

/** Wallet money may only leave the wallet to pay for event tickets (or an admin correction). */
const DEBIT_TYPES: WalletTxType[] = ['ticket_payment', 'installment', 'adjustment']

export const MIN_TOPUP = 10
export const MAX_TOPUP = 150_000

export class InsufficientFundsError extends Error {
  constructor(public balance: number, public required: number) {
    super('Insufficient wallet balance')
    this.name = 'InsufficientFundsError'
  }

  get shortfall() {
    return roundKes(this.required - this.balance)
  }
}

export interface WalletEntry {
  type: WalletTxType
  amount: number
  referenceType?: string | null
  referenceId?: string | null
  note?: string | null
  createdBy?: string | null
  checkoutRequestId?: string | null
  mpesaReceipt?: string | null
}

export interface WalletTx {
  id: string
  user_id: string
  type: WalletTxType
  amount: number
  mpesa_amount: number | null
  balance_after: number | null
  status: 'pending' | 'completed' | 'failed'
  reference_type: string | null
  reference_id: string | null
  checkout_request_id: string | null
  mpesa_receipt: string | null
  note: string | null
  created_at: string
}

export const roundKes = (value: number) => Math.round(value * 100) / 100

const TX_FIELDS = `id, user_id, type, amount::float AS amount, mpesa_amount::float AS mpesa_amount,
  balance_after::float AS balance_after, status, reference_type, reference_id, checkout_request_id, mpesa_receipt,
  note, created_at`

/**
 * Runs `fn` in a transaction holding the user's wallet row lock, so concurrent payments,
 * credits and cancellations for the same member are applied one at a time.
 */
export async function withWallet<T>(
  userId: string,
  fn: (client: PoolClient, wallet: { balance: number }) => Promise<T>
): Promise<T> {
  const client = await getClient()
  try {
    await client.query('BEGIN')
    await client.query('INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [userId])
    const locked = await client.query('SELECT balance::float AS balance FROM wallets WHERE user_id = $1 FOR UPDATE', [
      userId,
    ])
    const result = await fn(client, { balance: Number(locked.rows[0]?.balance ?? 0) })
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    throw error
  } finally {
    client.release()
  }
}

/** Must be called inside `withWallet` for the same user. */
export async function applyEntry(client: PoolClient, userId: string, entry: WalletEntry): Promise<WalletTx> {
  const amount = roundKes(entry.amount)
  if (!Number.isFinite(amount) || amount === 0) {
    throw new Error('Wallet entry amount must be a non-zero number')
  }
  if (amount < 0 && !DEBIT_TYPES.includes(entry.type)) {
    throw new Error(`Wallet entries of type ${entry.type} cannot debit the wallet`)
  }

  const current = await client.query('SELECT balance::float AS balance FROM wallets WHERE user_id = $1', [userId])
  const balance = Number(current.rows[0]?.balance ?? 0)
  if (balance + amount < 0) {
    throw new InsufficientFundsError(balance, -amount)
  }

  const updated = await client.query(
    `UPDATE wallets SET balance = balance + $2, updated_at = NOW()
     WHERE user_id = $1 RETURNING balance::float AS balance`,
    [userId, amount]
  )
  const tx = await client.query(
    `INSERT INTO wallet_transactions
       (user_id, type, amount, balance_after, status, reference_type, reference_id, note, created_by,
        checkout_request_id, mpesa_receipt)
     VALUES ($1, $2, $3, $4, 'completed', $5, $6, $7, $8, $9, $10)
     RETURNING ${TX_FIELDS}`,
    [
      userId,
      entry.type,
      amount,
      updated.rows[0].balance,
      entry.referenceType ?? null,
      entry.referenceId ?? null,
      entry.note ?? null,
      entry.createdBy ?? null,
      entry.checkoutRequestId ?? null,
      entry.mpesaReceipt ?? null,
    ]
  )
  return tx.rows[0]
}

/**
 * Creates the pending ledger row for an M-Pesa payment. Top-ups credit the wallet when confirmed;
 * installments paid by M-Pesa never touch the balance (walletAmount 0) and are kept for history and status polling.
 */
export async function createPendingMpesaTx(
  userId: string,
  params: {
    type: 'topup' | 'installment'
    walletAmount: number
    mpesaAmount: number
    phone: string
    referenceType?: string
    referenceId?: string
    note: string
  }
): Promise<string> {
  const result = await query(
    `INSERT INTO wallet_transactions
       (user_id, type, amount, mpesa_amount, status, phone, reference_type, reference_id, note)
     VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8) RETURNING id`,
    [
      userId,
      params.type,
      roundKes(params.walletAmount),
      roundKes(params.mpesaAmount),
      params.phone,
      params.referenceType ?? null,
      params.referenceId ?? null,
      params.note,
    ]
  )
  return result.rows[0].id
}

export async function attachCheckoutToTx(txId: string, checkoutRequestId: string): Promise<void> {
  await query('UPDATE wallet_transactions SET checkout_request_id = $1 WHERE id = $2', [checkoutRequestId, txId])
}

/** Credits a pending top-up once. Safe to call repeatedly for the same checkout. */
export async function creditTopupByCheckoutId(checkoutRequestId: string, mpesaReceipt: string | null): Promise<number> {
  const pending = await query(
    `SELECT id, user_id FROM wallet_transactions
     WHERE checkout_request_id = $1 AND type = 'topup' AND status = 'pending'`,
    [checkoutRequestId]
  )
  let credited = 0
  for (const row of pending.rows) {
    const applied = await withWallet(row.user_id, async (client) => {
      const tx = await client.query(
        `SELECT amount::float AS amount FROM wallet_transactions
         WHERE id = $1 AND status = 'pending' FOR UPDATE`,
        [row.id]
      )
      if (tx.rows.length === 0) return false
      const updated = await client.query(
        `UPDATE wallets SET balance = balance + $2, updated_at = NOW()
         WHERE user_id = $1 RETURNING balance::float AS balance`,
        [row.user_id, tx.rows[0].amount]
      )
      await client.query(
        `UPDATE wallet_transactions
         SET status = 'completed', balance_after = $2, mpesa_receipt = COALESCE($3, mpesa_receipt)
         WHERE id = $1`,
        [row.id, updated.rows[0].balance, mpesaReceipt]
      )
      return true
    })
    if (applied) credited++
  }
  return credited
}

export async function failWalletTxByCheckoutId(checkoutRequestId: string): Promise<void> {
  await query(
    `UPDATE wallet_transactions SET status = 'failed'
     WHERE checkout_request_id = $1 AND status = 'pending'`,
    [checkoutRequestId]
  )
}

export async function getWalletBalance(userId: string): Promise<number> {
  const result = await query('SELECT balance::float AS balance FROM wallets WHERE user_id = $1', [userId])
  return Number(result.rows[0]?.balance ?? 0)
}

export async function getWalletTransactions(
  userId: string,
  { limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}
): Promise<{ transactions: WalletTx[]; total: number }> {
  const [rows, total] = await Promise.all([
    query(
      `SELECT ${TX_FIELDS} FROM wallet_transactions
       WHERE user_id = $1 AND status <> 'failed'
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
    query(`SELECT COUNT(*)::int AS count FROM wallet_transactions WHERE user_id = $1 AND status <> 'failed'`, [userId]),
  ])
  return { transactions: rows.rows, total: total.rows[0].count }
}
