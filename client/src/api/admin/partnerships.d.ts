export interface AdminPartnership {
    id: string;
    company_name: string;
    contact_person: string;
    email: string;
    phone: string;
    tier: string;
    message?: string;
    status: string;
    created_at: string;
}
export declare const getPartnershipsForAdmin: (status?: string) => Promise<AdminPartnership[]>;
export declare const updatePartnershipStatus: (id: string, status: string) => Promise<any>;
//# sourceMappingURL=partnerships.d.ts.map