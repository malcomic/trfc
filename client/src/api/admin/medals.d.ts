import type { MedalTier, MedalOption } from '../medals';
export declare function getAdminMedals(): Promise<MedalTier[]>;
export declare function updateAdminMedalTier(id: string, data: {
    name: string;
    description?: string | null;
    benefits: string[];
    image_url?: string | null;
    sort_order?: number;
    is_active?: boolean;
}): Promise<any>;
export declare function upsertAdminMedalOption(tierId: string, data: {
    id?: string;
    distance_km: number;
    price: number;
    capacity?: number | null;
    is_active?: boolean;
}): Promise<MedalOption>;
export declare function deleteAdminMedalOption(tierId: string, optionId: string): Promise<any>;
export interface AdminMedalPurchase {
    id: string;
    buyer_name: string | null;
    email: string | null;
    phone: string | null;
    payment_status: string;
    mpesa_receipt: string | null;
    checkout_request_id: string | null;
    purchase_batch_id: string | null;
    created_at: string;
    distance_km: number;
    price: number;
    tier_name: string;
    tier_slug: string;
}
export declare function getAdminMedalPurchases(): Promise<AdminMedalPurchase[]>;
//# sourceMappingURL=medals.d.ts.map