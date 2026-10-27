import { createHash } from 'crypto'
import axios from 'axios'
import type { Request } from 'express'
import { query } from '../config/db.js'
import { config } from '../config/env.js'
import { toKenyanMsisdn } from './phone.js'

export const META_CURRENCY = 'KES'

/** Shared with the browser pixel (`purchase_<reference>`) so Meta counts the two as one purchase. */
export function metaPurchaseEventId(reference: string): string {
  return `purchase_${reference}`
}

export function isMetaCapiConfigured(): boolean {
  return Boolean(config.meta.pixelId && config.meta.capiAccessToken)
}

export interface MetaBrowserContext {
  clientIp: string | null
  userAgent: string | null
  fbp: string | null
  fbc: string | null
  sourceUrl: string | null
}

function cookieValue(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

function header(req: Request, name: string): string | null {
  const value = req.headers?.[name.toLowerCase()]
  const first = Array.isArray(value) ? value[0] : value
  return first ? String(first).slice(0, 2000) : null
}

/** Reads what Meta needs to attribute a server event to the visitor's browser. */
export function captureMetaContext(req: Request): MetaBrowserContext {
  const forwarded = header(req, 'x-forwarded-for')?.split(',')[0]?.trim()
  return {
    clientIp: forwarded || req.socket?.remoteAddress || null,
    userAgent: header(req, 'user-agent'),
    fbp: header(req, 'x-meta-fbp') || cookieValue(req.headers?.cookie, '_fbp'),
    fbc: header(req, 'x-meta-fbc') || cookieValue(req.headers?.cookie, '_fbc'),
    sourceUrl: header(req, 'x-meta-source-url') || header(req, 'referer'),
  }
}

export async function saveMetaContext(reference: string, context: MetaBrowserContext): Promise<void> {
  try {
    await query(
      `INSERT INTO meta_checkout_context (reference, client_ip, user_agent, fbp, fbc, source_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (reference) DO UPDATE SET
         client_ip = EXCLUDED.client_ip, user_agent = EXCLUDED.user_agent,
         fbp = COALESCE(EXCLUDED.fbp, meta_checkout_context.fbp), fbc = COALESCE(EXCLUDED.fbc, meta_checkout_context.fbc),
         source_url = COALESCE(EXCLUDED.source_url, meta_checkout_context.source_url), created_at = NOW()`,
      [reference, context.clientIp, context.userAgent, context.fbp, context.fbc, context.sourceUrl]
    )
  } catch (error) {
    console.error('Failed to save Meta checkout context:', error)
  }
}

async function loadMetaContext(reference: string): Promise<MetaBrowserContext | null> {
  const result = await query(
    `SELECT client_ip, user_agent, fbp, fbc, source_url FROM meta_checkout_context WHERE reference = $1`,
    [reference]
  )
  const row = result.rows[0]
  if (!row) return null
  return { clientIp: row.client_ip, userAgent: row.user_agent, fbp: row.fbp, fbc: row.fbc, sourceUrl: row.source_url }
}

export interface PurchaseLine {
  id: string
  quantity: number
  value: number
}

export interface PurchaseCustomer {
  userId?: string | null
  email?: string | null
  phone?: string | null
  name?: string | null
}

export interface CollectedPurchase {
  value: number
  contents: { id: string; quantity: number; item_price: number }[]
  customer: PurchaseCustomer
}

const round2 = (value: number) => Math.round(value * 100) / 100

/** Merges lines with the same content id and works out the total value. */
export function summarisePurchase(lines: PurchaseLine[], customer: PurchaseCustomer): CollectedPurchase | null {
  const byId = new Map<string, { quantity: number; value: number }>()
  for (const line of lines) {
    const current = byId.get(line.id) ?? { quantity: 0, value: 0 }
    current.quantity += line.quantity
    current.value += line.value
    byId.set(line.id, current)
  }
  const value = round2(lines.reduce((sum, line) => sum + line.value, 0))
  if (byId.size === 0 || value <= 0) return null
  return {
    value,
    contents: [...byId].map(([id, { quantity, value: total }]) => ({
      id,
      quantity,
      item_price: round2(total / Math.max(quantity, 1)),
    })),
    customer,
  }
}

/** Everything paid under one payment reference: shop orders, event tickets, medals, equipment hire and program signups. */
async function collectPurchase(reference: string): Promise<CollectedPurchase | null> {
  const [orders, tickets, medals, hires, signups] = await Promise.all([
    query(
      `SELECT o.id, o.total_amount::float AS total, o.email, o.phone, o.user_id,
              COALESCE(json_agg(json_build_object('id', oi.product_id, 'quantity', oi.quantity))
                FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
       FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.checkout_request_id = $1 AND o.payment_status = 'paid'
       GROUP BY o.id`,
      [reference]
    ),
    query(
      `SELECT t.event_id, COALESCE(t.unit_price, ett.price, e.price, 0)::float AS price, t.email, t.phone, t.user_id,
              t.attendee_name
       FROM tickets t
       JOIN events e ON e.id = t.event_id
       LEFT JOIN event_ticket_types ett ON ett.id = t.ticket_type_id
       WHERE t.checkout_request_id = $1 AND t.payment_status = 'paid'`,
      [reference]
    ),
    query(
      `SELECT mt.slug AS tier_slug, mo.distance_km, mo.price::float AS price, mp.email, mp.phone, mp.user_id, mp.buyer_name
       FROM medal_purchases mp
       JOIN medal_options mo ON mo.id = mp.medal_option_id
       JOIN medal_tiers mt ON mt.id = mo.tier_id
       WHERE mp.checkout_request_id = $1 AND mp.payment_status = 'paid'`,
      [reference]
    ),
    query(
      `SELECT id, total_cost::float AS total, phone, user_id FROM equipment_hire
       WHERE checkout_request_id = $1 AND payment_status = 'paid'`,
      [reference]
    ),
    query(
      `SELECT program, tier, amount::float AS amount, user_id FROM signups
       WHERE checkout_request_id = $1 AND payment_status = 'paid'`,
      [reference]
    ),
  ])

  const lines: PurchaseLine[] = []
  const customer: PurchaseCustomer = {}
  const remember = (row: { email?: string | null; phone?: string | null; user_id?: string | null }, name?: string | null) => {
    customer.email ||= row.email ?? null
    customer.phone ||= row.phone ?? null
    customer.userId ||= row.user_id ?? null
    customer.name ||= name ?? null
  }

  for (const order of orders.rows) {
    const items = (order.items as { id: string; quantity: number }[]).filter((item) => item.id)
    const units = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
    if (items.length === 0) {
      lines.push({ id: `order_${order.id}`, quantity: 1, value: Number(order.total) })
    } else {
      // Spread the order total (which may include delivery) across its items by quantity.
      for (const item of items) {
        lines.push({ id: String(item.id), quantity: Number(item.quantity), value: (Number(order.total) * Number(item.quantity)) / units })
      }
    }
    remember(order)
  }
  for (const ticket of tickets.rows) {
    lines.push({ id: `event_${ticket.event_id}`, quantity: 1, value: Number(ticket.price) })
    remember(ticket, ticket.attendee_name)
  }
  for (const medal of medals.rows) {
    lines.push({ id: `medal_${medal.tier_slug}_${medal.distance_km}`, quantity: 1, value: Number(medal.price) })
    remember(medal, medal.buyer_name)
  }
  for (const hire of hires.rows) {
    lines.push({ id: `hire_${hire.id}`, quantity: 1, value: Number(hire.total) })
    remember(hire)
  }
  for (const signup of signups.rows) {
    lines.push({ id: `program_${signup.program}_${signup.tier}`, quantity: 1, value: Number(signup.amount) })
    remember(signup)
  }

  if (customer.userId && (!customer.email || !customer.phone || !customer.name)) {
    const user = await query('SELECT name, email, phone FROM users WHERE id = $1', [customer.userId])
    const row = user.rows[0]
    if (row) {
      customer.email ||= row.email
      customer.phone ||= row.phone
      customer.name ||= row.name
    }
  }
  return summarisePurchase(lines, customer)
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

/** Meta wants identifiers normalised (lowercase, digits-only phone with country code) and SHA-256 hashed. */
export function buildUserData(customer: PurchaseCustomer, context: MetaBrowserContext | null) {
  const userData: Record<string, string | string[]> = {}
  const email = customer.email?.trim().toLowerCase()
  if (email) userData.em = [sha256(email)]
  const phone = toKenyanMsisdn(customer.phone)
  if (phone) userData.ph = [sha256(phone)]
  const [first, ...rest] = (customer.name ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (first) userData.fn = [sha256(first)]
  if (rest.length) userData.ln = [sha256(rest[rest.length - 1])]
  if (customer.userId) userData.external_id = [sha256(String(customer.userId))]
  userData.country = [sha256('ke')]
  if (context?.clientIp) userData.client_ip_address = context.clientIp
  if (context?.userAgent) userData.client_user_agent = context.userAgent
  if (context?.fbp) userData.fbp = context.fbp
  if (context?.fbc) userData.fbc = context.fbc
  return userData
}

export function buildPurchaseEvent(reference: string, purchase: CollectedPurchase, context: MetaBrowserContext | null) {
  // Website events must carry the browser's user agent; without it Meta only accepts the event as system-generated.
  const isWebsite = Boolean(context?.userAgent)
  return {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    event_id: metaPurchaseEventId(reference),
    action_source: isWebsite ? 'website' : 'system_generated',
    ...(isWebsite && context?.sourceUrl ? { event_source_url: context.sourceUrl } : {}),
    user_data: buildUserData(purchase.customer, context),
    custom_data: {
      currency: META_CURRENCY,
      value: purchase.value,
      content_type: 'product',
      content_ids: purchase.contents.map((c) => c.id),
      contents: purchase.contents,
      num_items: purchase.contents.reduce((sum, c) => sum + c.quantity, 0),
      order_id: reference,
    },
  }
}

/**
 * Reports a paid checkout to the Meta Conversions API, at most once per reference.
 * Never throws: tracking must not affect payments.
 */
export async function sendMetaPurchase(reference: string, contextOverride?: MetaBrowserContext): Promise<boolean> {
  if (!isMetaCapiConfigured() || !reference) return false
  const eventId = metaPurchaseEventId(reference)
  try {
    const purchase = await collectPurchase(reference)
    if (!purchase) return false

    const claimed = await query(
      `INSERT INTO meta_events (event_id, event_name, value) VALUES ($1, 'Purchase', $2)
       ON CONFLICT (event_id) DO UPDATE SET status = 'pending', error = NULL
         WHERE meta_events.status = 'failed'
       RETURNING event_id`,
      [eventId, purchase.value]
    )
    if (claimed.rows.length === 0) return false

    const context = contextOverride ?? (await loadMetaContext(reference))
    const { pixelId, capiAccessToken, apiVersion, testEventCode } = config.meta
    await axios.post(
      `https://graph.facebook.com/${apiVersion}/${pixelId}/events`,
      {
        data: [buildPurchaseEvent(reference, purchase, context)],
        ...(testEventCode ? { test_event_code: testEventCode } : {}),
      },
      { params: { access_token: capiAccessToken }, timeout: 15000 }
    )
    await query(`UPDATE meta_events SET status = 'sent' WHERE event_id = $1`, [eventId])
    return true
  } catch (error: any) {
    const message = error?.response?.data?.error?.message || error?.message || String(error)
    console.error(`Meta Conversions API purchase failed for ${reference}: ${message}`)
    await query(`UPDATE meta_events SET status = 'failed', error = $2 WHERE event_id = $1`, [eventId, message.slice(0, 1000)]).catch(
      () => undefined
    )
    return false
  }
}

/** Fire-and-forget wrapper for payment code paths. */
export function reportMetaPurchase(reference: string, contextOverride?: MetaBrowserContext): void {
  void sendMetaPurchase(reference, contextOverride)
}
