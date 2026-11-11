import { toKenyanMsisdn } from './phone'

export type TikTokContent = {
  content_id: string
  content_type: 'product' | 'event' | 'program'
  content_name?: string
  quantity?: number
}

type TikTokEventPayload = {
  contents: TikTokContent[]
  value?: number
  currency?: string
}

export type TikTokUser = {
  email?: string | null
  phone?: string | null
  externalId?: string | null
}

export type TikTokIdentity = {
  email?: string
  phone_number?: string
  external_id?: string
}

const CURRENCY = 'KES'

/** Events wait on this so they carry the matching data from the latest identify call. */
let identifyQueue: Promise<void> = Promise.resolve()

export function normalizeTikTokEmail(email: string | null | undefined): string | null {
  const value = email?.trim().toLowerCase()
  return value && value.includes('@') ? value : null
}

/** TikTok wants E.164 with the leading "+" before hashing. */
export function normalizeTikTokPhone(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null
  const msisdn = toKenyanMsisdn(phone)
  if (msisdn) return `+${msisdn}`
  const digits = phone.replace(/\D/g, '')
  return phone.trim().startsWith('+') && digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null
}

async function sha256(value: string): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) return null
  const buf = await subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function buildTikTokIdentity(user: TikTokUser): Promise<TikTokIdentity | null> {
  const identity: TikTokIdentity = {}
  const email = normalizeTikTokEmail(user.email)
  const phone = normalizeTikTokPhone(user.phone)
  const externalId = user.externalId?.trim()
  const [emailHash, phoneHash, externalHash] = await Promise.all([
    email ? sha256(email) : null,
    phone ? sha256(phone) : null,
    externalId ? sha256(externalId) : null,
  ])
  if (emailHash) identity.email = emailHash
  if (phoneHash) identity.phone_number = phoneHash
  if (externalHash) identity.external_id = externalHash
  return Object.keys(identity).length ? identity : null
}

export function identifyTikTokUser(user: TikTokUser): Promise<void> {
  identifyQueue = identifyQueue
    .then(() => buildTikTokIdentity(user))
    .then((identity) => {
      if (identity) window.ttq?.identify?.(identity)
    })
    .catch(() => {
      /* matching data is best-effort; never block tracking */
    })
  return identifyQueue
}

function track(event: string, payload: TikTokEventPayload) {
  void identifyQueue.then(() => {
    window.ttq?.track?.(event, {
      ...payload,
      currency: payload.currency ?? CURRENCY,
    })
  })
}

function trackOnce(key: string, event: string, payload: TikTokEventPayload) {
  try {
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
  } catch {
    /* private mode / storage blocked */
  }
  track(event, payload)
}

export function trackViewContent(content: TikTokContent, value?: number) {
  trackOnce(`ttq_view_${content.content_type}_${content.content_id}`, 'ViewContent', {
    contents: [content],
    value,
  })
}

export function trackAddToCart(content: TikTokContent, value?: number) {
  track('AddToCart', {
    contents: [content],
    value,
  })
}

export function trackInitiateCheckout(dedupeKey: string, payload: TikTokEventPayload) {
  trackOnce(`ttq_checkout_${dedupeKey}`, 'InitiateCheckout', payload)
}

export function trackCompletePayment(dedupeKey: string, payload: TikTokEventPayload) {
  trackOnce(`ttq_paid_${dedupeKey}`, 'CompletePayment', payload)
}

export function trackClickButton(dedupeKey: string, payload: TikTokEventPayload) {
  trackOnce(`ttq_click_${dedupeKey}`, 'ClickButton', payload)
}

export function trackCompleteRegistration(dedupeKey: string, payload: TikTokEventPayload) {
  trackOnce(`ttq_reg_${dedupeKey}`, 'CompleteRegistration', payload)
}
