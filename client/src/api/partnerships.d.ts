export interface PartnershipSubmission {
    company_name: string;
    contact_person: string;
    email: string;
    phone: string;
    tier: string;
    message?: string;
}
export declare const submitPartnership: (data: PartnershipSubmission) => Promise<any>;
//# sourceMappingURL=partnerships.d.ts.map