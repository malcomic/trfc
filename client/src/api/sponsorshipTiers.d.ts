export interface SponsorshipTier {
    id: string;
    slug: string;
    name: string;
    price_display: string;
    benefits: string[];
    icon: string;
    sort_order: number;
    is_active: boolean;
    created_at?: string;
}
export declare const getSponsorshipTiers: () => Promise<SponsorshipTier[]>;
//# sourceMappingURL=sponsorshipTiers.d.ts.map