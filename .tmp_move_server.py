import io


def edit(p, pairs):
    s = io.open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert a in s, (p, a[:90])
        s = s.replace(a, b, 1)
    io.open(p, 'w', encoding='utf-8').write(s)


edit('server/src/utils/wallet.ts', [
    ("""  | 'late_payment'
  | 'legacy'""", """  | 'late_payment'
  | 'moved'
  | 'legacy'"""),
])

edit('server/src/utils/emailTemplates.ts', [
    ("""  late_payment: 'Late payment',""", """  late_payment: 'Late payment',
  moved: 'Moved to another event',"""),
])

edit('server/src/utils/installments.ts', [
    ("import { startMpesaForTx } from './walletMpesa.js'",
     "import { startMpesaForTx } from './walletMpesa.js'\nimport { payBatchesWithCredit, type CreditCheckoutResult } from './walletCheckout.js'"),
    ("  status: 'active' | 'completed' | 'cancelled' | 'expired'",
     "  status: 'active' | 'completed' | 'cancelled' | 'expired' | 'moved'"),
    ("export type PlanCloseReason = 'missed_deadline' | 'cancelled_early' | 'event_cancelled'",
     "export type PlanCloseReason = 'missed_deadline' | 'cancelled_early' | 'event_cancelled' | 'moved'"),
    ("""  await client.query(`UPDATE ticket_payment_plans SET status = $2 WHERE id = $1`, [
    planId,
    reason === 'missed_deadline' ? 'expired' : 'cancelled',
  ])""", """  await client.query(`UPDATE ticket_payment_plans SET status = $2 WHERE id = $1`, [
    planId,
    reason === 'missed_deadline' ? 'expired' : reason === 'moved' ? 'moved' : 'cancelled',
  ])"""),
    ("""        : reason === 'event_cancelled'
          ? `Event cancelled by TRFC: ${row.event_title}`
          : `Cancelled before the deadline: ${row.event_title}`,""", """        : reason === 'event_cancelled'
          ? `Event cancelled by TRFC: ${row.event_title}`
          : reason === 'moved'
            ? `Moved from ${row.event_title} to another event`
            : `Cancelled before the deadline: ${row.event_title}`,"""),
])

s = io.open('server/src/utils/installments.ts', encoding='utf-8').read()
s += """
export type MovePlanResult = CreditCheckoutResult & { moved: number; fromEvent: string }

/**
 * Moves a part-paid ticket to another event: the old seat is released, what was paid becomes ticket credit
 * usable straight away, and that credit (oldest first) pays the new booking. Any difference is paid by M-Pesa.
 * If the M-Pesa step fails, the credit stays on the member's account and the new booking can be paid later.
 */
export async function movePlanToEvent(
  planId: string,
  userId: string,
  opts: { purchaseBatchId: string; phone?: string | null }
): Promise<MovePlanResult> {
  const closed = await withWallet(userId, async (client) => {
    await lockActivePlan(client, planId, userId)
    await assertNoPaymentInFlight(client, planId)
    const plan = await client.query('SELECT event_id FROM ticket_payment_plans WHERE id = $1', [planId])
    const target = await client.query(
      `SELECT t.user_id, t.event_id, t.payment_status, t.checkout_request_id, e.cancelled_at,
              (e.event_date >= CURRENT_DATE) AS upcoming
       FROM tickets t JOIN events e ON e.id = t.event_id
       WHERE t.purchase_batch_id = $1`,
      [opts.purchaseBatchId]
    )
    const rows = target.rows
    if (rows.length === 0 || rows.some((r) => r.user_id !== userId)) {
      throw new InstallmentError('New booking not found', 404)
    }
    if (rows[0].event_id === plan.rows[0]?.event_id) {
      throw new InstallmentError('Choose a different event to move to')
    }
    if (rows.some((r) => r.payment_status !== 'pending' || r.checkout_request_id)) {
      throw new InstallmentError('The new booking is no longer awaiting payment', 409)
    }
    if (!rows[0].upcoming || rows[0].cancelled_at) {
      throw new InstallmentError('The new event is no longer open for booking', 409)
    }
    const result = await closePlanToCredit(client, planId, 'moved')
    if (!result) throw new InstallmentError('This payment plan is no longer active', 409)
    return result
  })

  const paid = await payBatchesWithCredit(userId, {
    batchIds: [opts.purchaseBatchId],
    useCredit: true,
    phone: opts.phone ?? null,
  })
  return { ...paid, moved: closed.credited, fromEvent: closed.eventTitle }
}
"""
io.open('server/src/utils/installments.ts', 'w', encoding='utf-8').write(s)

edit('server/src/controllers/walletController.ts', [
    ("""  getPlansForUser,
  payPlanInstallments,""", """  getPlansForUser,
  movePlanToEvent,
  payPlanInstallments,"""),
])
s = io.open('server/src/controllers/walletController.ts', encoding='utf-8').read()
s += """
/** Moves what was paid towards one event onto a new booking for another event. */
export async function movePaymentPlan(req: Request, res: Response) {
  try {
    const purchaseBatchId = req.body?.purchaseBatchId
    if (typeof purchaseBatchId !== 'string' || !purchaseBatchId) {
      return res.status(400).json({ error: 'purchaseBatchId is required' })
    }
    const phone = req.body?.phone ? toKenyanMsisdn(req.body.phone) : null
    if (req.body?.phone && !phone) {
      return res.status(400).json({ error: 'Enter a valid M-Pesa number, e.g. 07XX XXX XXX' })
    }
    res.json(await movePlanToEvent(String(req.params.id), req.user!.id, { purchaseBatchId, phone }))
  } catch (error) {
    sendWalletError(
      res,
      error,
      'Your earlier payments are now ticket value, but the new booking could not be paid. Finish paying from your dashboard.'
    )
  }
}
"""
io.open('server/src/controllers/walletController.ts', 'w', encoding='utf-8').write(s)

edit('server/src/routes/wallet.ts', [
    ("router.post('/plans/:id/release', simpleRateLimit(10, 10 * 60_000), releasePaymentPlan)",
     "router.post('/plans/:id/release', simpleRateLimit(10, 10 * 60_000), releasePaymentPlan)\nrouter.post('/plans/:id/move', simpleRateLimit(10, 10 * 60_000), movePaymentPlan)"),
])
s = io.open('server/src/routes/wallet.ts', encoding='utf-8').read()
s = s.replace("  releasePaymentPlan,\n", "  releasePaymentPlan,\n  movePaymentPlan,\n", 1)
assert 'movePaymentPlan,\n' in s
io.open('server/src/routes/wallet.ts', 'w', encoding='utf-8').write(s)
print('ok')
