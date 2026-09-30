import type { ProgramId } from '../content/programs';
import type { Tier } from '../content/onboarding';
export interface CreateSignupRequest {
    name: string;
    phone: string;
    whatsapp: string;
    program: ProgramId;
    tier: Tier;
    quizAnswers?: Record<string, string>;
}
export interface CreateSignupResponse {
    signupId: string;
    program: ProgramId;
    tier: Tier;
    amount: number;
    isReturning: boolean;
    phone: string;
}
export interface SignupStatus {
    id: string;
    program: ProgramId;
    tier: Tier;
    amount: number;
    payment_status: 'n/a' | 'pending' | 'paid' | 'failed';
}
export interface AdminSignup {
    id: string;
    program: ProgramId;
    tier: Tier;
    is_returning: boolean;
    amount: number;
    payment_status: SignupStatus['payment_status'];
    mpesa_receipt: string | null;
    whatsapp_sent_at: string | null;
    created_at: string;
    user_id: string | null;
    name: string | null;
    phone: string | null;
    whatsapp: string | null;
    access_tier: string | null;
    elite_expires_at: string | null;
}
export interface AdminSignupFilters {
    program?: string;
    tier?: string;
    payment_status?: string;
    from?: string;
    to?: string;
}
export declare function createSignup(data: CreateSignupRequest): Promise<CreateSignupResponse>;
export declare function getSignupStatus(signupId: string): Promise<SignupStatus>;
export declare function getAdminSignups(filters?: AdminSignupFilters): Promise<AdminSignup[]>;
//# sourceMappingURL=signups.d.ts.map