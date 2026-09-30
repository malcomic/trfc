export type TikTokContent = {
    content_id: string;
    content_type: 'product' | 'event' | 'program';
    content_name?: string;
    quantity?: number;
};
type TikTokEventPayload = {
    contents: TikTokContent[];
    value?: number;
    currency?: string;
};
export declare function trackViewContent(content: TikTokContent, value?: number): void;
export declare function trackAddToCart(content: TikTokContent, value?: number): void;
export declare function trackInitiateCheckout(dedupeKey: string, payload: TikTokEventPayload): void;
export declare function trackCompletePayment(dedupeKey: string, payload: TikTokEventPayload): void;
export declare function trackClickButton(dedupeKey: string, payload: TikTokEventPayload): void;
export declare function trackCompleteRegistration(dedupeKey: string, payload: TikTokEventPayload): void;
export {};
//# sourceMappingURL=tiktokPixel.d.ts.map