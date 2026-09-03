export type TikTokContent = {
  content_id: string
  content_type: 'product' | 'event'
  content_name?: string
  quantity?: number
}

type TikTokEventPayload = {
  contents: TikTokContent[]
  value?: number
  currency?: string
}

const CURRENCY = 'KES'

function track(event: string, payload: TikTokEventPayload) {
  window.ttq?.track?.(event, {
    ...payload,
    currency: payload.currency ?? CURRENCY,
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
