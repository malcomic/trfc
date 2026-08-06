export interface MedalOption {
    id: string;
    tier_id: string;
    distance_km: number;
    price: number;
    capacity: number | null;
    is_active: boolean;
}
export interface MedalTier {
    id: string;
    slug: string;
    name: string;
    description?: string | null;
    benefits: string[];
    image_url?: string | null;
    sort_order: number;
    is_active: boolean;
    options: MedalOption[];
    min_price: number | null;
}
export interface MedalPurchaseResult {
    purchaseBatchId: string;
    purchaseIds: string[];
    quantity: number;
    tierName: string;
    tierSlug: string;
    distanceKm: number;
    pricePerMedal: number;
    totalPrice: number;
    buyerName: string;
}
export interface MedalConfirmationDetails {
    tier_name: string;
    tier_slug: string;
    distance_km: number;
    unit_price: number;
    quantity: number;
    total_price: number;
    payment_status: string;
    phone: string | null;
    email: string | null;
    buyer_name: string;
    mpesa_receipt: string | null;
    checkout_request_id: string;
    purchases: {
        id: string;
        buyer_name: string;
        payment_status: string;
    }[];
}
export interface UserMedalPurchase {
    id: string;
    user_id: string | null;
    medal_option_id: string;
    purchase_batch_id: string | null;
    payment_status: string;
    mpesa_receipt: string | null;
    checkout_request_id: string | null;
    buyer_name: string | null;
    phone: string | null;
    email: string | null;
    created_at: string;
    distance_km: number;
    price: number;
    tier_name: string;
    tier_slug: string;
    tier_image_url: string | null;
}
export declare const getMedals: () => Promise<MedalTier[]>;
export declare const getMedalBySlug: (slug: string) => Promise<MedalTier>;
export declare const createMedalPurchases: (slug: string, data: {
    optionId: string;
    quantity: number;
    email: string;
    phone: string;
    buyerName: string;
}) => Promise<MedalPurchaseResult>;
export declare const getUserMedalPurchases: () => Promise<UserMedalPurchase[]>;
export declare const getMedalPurchasesByCheckoutRequestId: (checkoutRequestId: string, options: {
    email?: string;
    phone?: string;
}) => Promise<MedalConfirmationDetails>;
//# sourceMappingURL=medals.d.ts.map