import { Request, Response } from 'express'
import { query } from '../config/db.js'
import { membershipFrom } from './usersController.js'
import {
  MembershipError,
  foundingTaken,
  getMembershipSettings,
  membershipHistory,
  quoteFor,
  renewalDeadline,
  latestPaidEnd,
  startMembershipCheckout,
} from '../utils/membership.js'
import { MPESA_PHONE_ERROR, toKenyanMsisdn } from '../utils/phone.js'
import { shopDiscountStatus } from '../utils/memberShopDiscount.js'

export function perkFromRow(row: any) {
  return {
    key: row.key as string,
    title: row.title as string,
    description: row.description as string,
    status: row.status as 'on' | 'coming_soon' | 'hidden',
    sortOrder: Number(row.sort_order),
    icon: (row.icon as string | null) ?? null,
    linkUrl: (row.link_url as string | null) ?? null,
    buttonLabel: (row.button_label as string | null) ?? null,
    settings: (row.settings as Record<string, unknown>) ?? {},
  }
}

/** Settings only admins may read; the Zoom link reaches members through the live Q&A endpoint instead. */
export const PRIVATE_SETTING_KEYS = ['zoom_url']

export function publicPerkFromRow(row: any) {
  const perk = perkFromRow(row)
  const settings = Object.fromEntries(
    Object.entries(perk.settings).filter(([key]) => !PRIVATE_SETTING_KEYS.includes(key))
  )
  return { ...perk, settings }
}

export async function listVisiblePerks() {
  const result = await query(
    `SELECT * FROM member_perks WHERE status <> 'hidden' ORDER BY sort_order, title`
  )
  return result.rows.map((row) => publicPerkFromRow(row))
}

function quoteJson(quote: ReturnType<typeof quoteFor>) {
  return {
    ...quote,
    startsAt: quote.startsAt.toISOString(),
    endsAt: quote.endsAt.toISOString(),
    renewalUntil: quote.renewalUntil?.toISOString() ?? null,
  }
}

export async function getMyMembership(req: Request, res: Response) {
  try {
    const userId = req.user!.id
    const [user, settings, history, taken, rows, perks] = await Promise.all([
      query(`SELECT member_until, phone FROM users WHERE id = $1`, [userId]),
      getMembershipSettings(),
      membershipHistory(userId),
      foundingTaken(),
      query(
        `SELECT id, price_type, amount, status, starts_at, ends_at, mpesa_receipt, paid_at, checkout_request_id, hold_expires_at
         FROM memberships
         WHERE user_id = $1 AND (status IN ('paid', 'cancelled') OR (status = 'pending' AND hold_expires_at > NOW()))
         ORDER BY starts_at DESC`,
        [userId]
      ),
      listVisiblePerks(),
    ])
    if (!user.rows[0]) return res.status(404).json({ error: 'User not found' })

    const now = new Date()
    const quote = quoteFor(history, settings, taken, now)
    const years = rows.rows.map((r: any) => ({
      id: r.id as string,
      priceType: r.price_type as string,
      amount: Number(r.amount),
      status: r.status as string,
      startsAt: new Date(r.starts_at).toISOString(),
      endsAt: new Date(r.ends_at).toISOString(),
      receipt: (r.mpesa_receipt as string | null) ?? null,
      paidAt: r.paid_at ? new Date(r.paid_at).toISOString() : null,
    }))
    const pendingRow = rows.rows.find((r: any) => r.status === 'pending' && r.checkout_request_id)
    const current =
      years.find(
        (y) => y.status === 'paid' && new Date(y.startsAt) <= now && new Date(y.endsAt) > now
      ) ?? null

    res.json({
      ...membershipFrom(user.rows[0].member_until, now),
      isFounding: years.some((y) => y.status === 'paid' && y.priceType === 'founding'),
      renewalUntil: renewalDeadline(latestPaidEnd(history), settings)?.toISOString() ?? null,
      current,
      history: years.filter((y) => y.status !== 'pending'),
      pending: pendingRow
        ? { checkoutRequestId: pendingRow.checkout_request_id as string, amount: Number(pendingRow.amount) }
        : null,
      quote: quoteJson(quote),
      founding: {
        limit: settings.foundingLimit,
        left: quote.foundingLeft,
        deadline: settings.foundingDeadline.toISOString(),
      },
      salesOpenAt: settings.salesOpenAt.toISOString(),
      phone: (user.rows[0].phone as string | null) ?? null,
      perks,
    })
  } catch (error) {
    console.error('Failed to load membership:', error)
    res.status(500).json({ error: 'Failed to load your membership' })
  }
}

export async function checkoutMembership(req: Request, res: Response) {
  const phone = toKenyanMsisdn(String(req.body?.phone ?? ''))
  if (!phone) return res.status(400).json({ error: MPESA_PHONE_ERROR })
  try {
    const result = await startMembershipCheckout(req.user!.id, phone)
    res.json({
      checkoutRequestId: result.checkoutRequestId,
      membershipId: result.membershipId,
      amount: result.amount,
      priceType: result.priceType,
      reused: result.reused,
    })
  } catch (error) {
    if (error instanceof MembershipError) return res.status(error.status).json({ error: error.message })
    console.error('Membership checkout failed:', error)
    res.status(500).json({ error: 'Failed to start the payment. Please try again.' })
  }
}

export async function getShopDiscount(req: Request, res: Response) {
  try {
    const status = await shopDiscountStatus(undefined, req.user!.id)
    res.json({
      available: status.available,
      amount: status.amount,
      isMember: status.membershipId != null,
      usedOrderId: status.usedOrderId,
    })
  } catch (error) {
    console.error('Failed to load the member shop discount:', error)
    res.status(500).json({ error: 'Failed to load your member discount' })
  }
}

export async function getPublicPerks(_req: Request, res: Response) {
  try {
    const [perks, settings, taken] = await Promise.all([listVisiblePerks(), getMembershipSettings(), foundingTaken()])
    const now = new Date()
    const quote = quoteFor([], settings, taken, now)
    res.json({
      perks,
      price: {
        standard: settings.standardPrice,
        founding: settings.foundingPrice,
        renewal: settings.renewalPrice,
        foundingLeft: quote.foundingLeft,
        foundingLimit: settings.foundingLimit,
        foundingDeadline: settings.foundingDeadline.toISOString(),
        salesOpenAt: settings.salesOpenAt.toISOString(),
        available: quote.available,
        reason: quote.reason ?? null,
      },
    })
  } catch (error) {
    console.error('Failed to load member perks:', error)
    res.status(500).json({ error: 'Failed to load member perks' })
  }
}
