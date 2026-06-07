import type { SponsorshipTier } from '../sponsorshipTiers';
export declare const getSponsorshipTiersForAdmin: () => Promise<SponsorshipTier[]>;
export declare const createSponsorshipTier: (data: {
    slug: string;
    name: string;
    price_display: string;
    benefits: string[];
    icon: string;
    sort_order: number;
}) => Promise<any>;
export declare const updateSponsorshipTier: (id: string, data: {
    slug?: string;
    name: string;
    price_display: string;
    benefits: string[];
    icon: string;
    sort_order: number;
    is_active: boolean;
}) => Promise<any>;
export declare const deleteSponsorshipTier: (id: string) => Promise<any>;
//# sourceMappingURL=sponsorshipTiers.d.ts.map