/**
 * In-memory stand-in for the ticket credit tables, driven by the SQL the wallet helpers send.
 * Only understands the statements used by utils/wallet.ts and utils/walletCheckout.ts.
 */
export interface FakeCredit {
  id: string
  user_id: string
  remaining: number
  amount?: number
  region_id?: string | null
  status?: string
  available?: boolean
}

export interface FakeHold {
  id: string
  credit_id: string
  purchase_batch_id: string | null
  plan_id: string | null
  payment_tx_id: string | null
  amount: number
  status: string
}

export function createFakeCreditDb(credits: FakeCredit[], batches: Record<string, any[]> = {}) {
  const state = {
    credits: credits.map((c) => ({ amount: c.remaining, region_id: null, status: 'active', available: true, ...c })),
    holds: [] as FakeHold[],
    ledger: [] as { id: string; type: string; amount: number; mpesa_amount?: number }[],
    paidTickets: [] as unknown[][],
    linkedTx: [] as unknown[][],
    regionUpdates: [] as unknown[][],
  }
  const heldOn = (creditId: string) =>
    state.holds.filter((h) => h.credit_id === creditId && h.status === 'held').reduce((s, h) => s + h.amount, 0)
  const total = () => state.credits.filter((c) => c.status === 'active').reduce((s, c) => s + c.remaining, 0)
  const scopeColumn = (sql: string): keyof FakeHold =>
    sql.includes('u.payment_tx_id = $1') ? 'payment_tx_id' : sql.includes('u.purchase_batch_id = $1') ? 'purchase_batch_id' : 'plan_id'

  const run = async (sql: string, params: any[] = []) => {
    if (sql.includes('WHERE t.purchase_batch_id = $1')) return { rows: batches[params[0]] ?? [] }
    if (sql.includes('AS free') && sql.includes('FROM ticket_credits c')) {
      const rows = state.credits
        .filter((c) => c.user_id === params[0] && c.status === 'active' && c.available)
        .map((c) => ({ id: c.id, region_id: c.region_id, free: c.remaining - heldOn(c.id) }))
        .filter((c) => c.free > 0)
      return { rows }
    }
    if (sql.includes('INSERT INTO ticket_credit_uses')) {
      state.holds.push({
        id: `hold-${state.holds.length + 1}`,
        credit_id: params[0],
        purchase_batch_id: params[1],
        plan_id: params[2],
        payment_tx_id: params[3],
        amount: Number(params[4]),
        status: 'held',
      })
      return { rows: [] }
    }
    if (sql.includes('FOR UPDATE OF u, c')) {
      const column = scopeColumn(sql)
      return { rows: state.holds.filter((h) => h[column] === params[0] && h.status === 'held') }
    }
    if (sql.includes('UPDATE ticket_credits') && sql.includes('remaining - $2')) {
      const credit = state.credits.find((c) => c.id === params[0])!
      credit.remaining = Math.max(0, credit.remaining - Number(params[1]))
      if (credit.remaining <= 0.005) credit.status = 'used'
      return { rows: [] }
    }
    if (sql.includes("UPDATE ticket_credit_uses SET status = 'committed'")) {
      state.holds.find((h) => h.id === params[0])!.status = 'committed'
      return { rows: [] }
    }
    if (sql.includes("UPDATE ticket_credit_uses u SET status = 'released'")) {
      const column = scopeColumn(sql)
      const released = state.holds.filter((h) => h[column] === params[0] && h.status === 'held')
      released.forEach((h) => (h.status = 'released'))
      return { rows: released.map((h) => ({ amount: h.amount })) }
    }
    if (sql.includes('UPDATE ticket_credit_uses SET payment_tx_id')) {
      state.linkedTx.push(params)
      for (const h of state.holds) {
        if (h.status === 'held' && !h.payment_tx_id && (params[1] as string[]).includes(h.purchase_batch_id ?? '')) {
          h.payment_tx_id = params[0]
        }
      }
      return { rows: [] }
    }
    if (sql.includes('UPDATE wallets SET balance')) return { rows: [{ balance: total() }] }
    if (sql.includes('INSERT INTO wallet_transactions')) {
      const id = `tx-${state.ledger.length + 1}`
      const pendingMpesa = sql.includes("'pending'")
      state.ledger.push({
        id,
        type: params[1],
        amount: pendingMpesa ? 0 : Number(params[2]),
        mpesa_amount: pendingMpesa ? Number(params[2]) : undefined,
      })
      return { rows: [{ id }] }
    }
    if (sql.includes('UPDATE tickets SET referral_region_id')) {
      state.regionUpdates.push(params)
      return { rows: [] }
    }
    if (sql.includes("UPDATE tickets SET payment_status = 'paid'")) {
      state.paidTickets.push(params)
      return { rows: [], rowCount: 1 }
    }
    return { rows: [] }
  }
  return { state, run }
}
