const CURRENCY = 'KES';
function track(event, payload) {
    window.ttq?.track?.(event, {
        ...payload,
        currency: payload.currency ?? CURRENCY,
    });
}
function trackOnce(key, event, payload) {
    try {
        if (sessionStorage.getItem(key))
            return;
        sessionStorage.setItem(key, '1');
    }
    catch {
        /* private mode / storage blocked */
    }
    track(event, payload);
}
export function trackViewContent(content, value) {
    trackOnce(`ttq_view_${content.content_type}_${content.content_id}`, 'ViewContent', {
        contents: [content],
        value,
    });
}
export function trackAddToCart(content, value) {
    track('AddToCart', {
        contents: [content],
        value,
    });
}
export function trackInitiateCheckout(dedupeKey, payload) {
    trackOnce(`ttq_checkout_${dedupeKey}`, 'InitiateCheckout', payload);
}
export function trackCompletePayment(dedupeKey, payload) {
    trackOnce(`ttq_paid_${dedupeKey}`, 'CompletePayment', payload);
}
//# sourceMappingURL=tiktokPixel.js.map