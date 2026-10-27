declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

export const META_CURRENCY = 'KES'

export type MetaContent = { id: string; quantity: number; item_price?: number }

/** Must match the server's `metaPurchaseEventId` so Meta merges browser and Conversions API events. */
export function metaPurchaseEventId(reference: string): string {
  return `purchase_${reference}`
}

export function buildPurchaseParams(value: number, contents: MetaContent[]) {
  return {
    value: Math.round(value * 100) / 100,
    currency: META_CURRENCY,
    content_type: 'product',
    content_ids: contents.map((c) => c.id),
    contents,
    num_items: contents.reduce((sum, c) => sum + c.quantity, 0),
  }
}

/** Fires one Meta Purchase per payment reference (repeat visits to the confirmation page are ignored). */
export function trackMetaPurchase(reference: string, value: number | null | undefined, contents: MetaContent[]) {
  if (!reference || value == null || !Number.isFinite(value) || value <= 0) return
  const eventId = metaPurchaseEventId(reference)
  try {
    if (sessionStorage.getItem(`fbq_${eventId}`)) return
    sessionStorage.setItem(`fbq_${eventId}`, '1')
  } catch {
    /* storage blocked */
  }
  window.fbq?.('track', 'Purchase', buildPurchaseParams(value, contents), { eventID: eventId })
}

function readCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((part) => part.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

/** Browser identifiers the server forwards with Conversions API events so Meta can match them to ad clicks. */
export function metaRequestHeaders(): Record<string, string> {
  if (typeof document === 'undefined') return {}
  const headers: Record<string, string> = { 'X-Meta-Source-Url': window.location.href }
  const fbp = readCookie('_fbp')
  const fbc = readCookie('_fbc')
  if (fbp) headers['X-Meta-Fbp'] = fbp
  if (fbc) headers['X-Meta-Fbc'] = fbc
  return headers
}
