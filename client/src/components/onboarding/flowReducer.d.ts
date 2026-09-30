import { type Q1Answer, type Q2Answer, type Tier } from '../../content/onboarding';
import type { ProgramId } from '../../content/programs';
export type Step = 'hero' | 'q1' | 'q2' | 'match' | 'access' | 'contact' | 'checkout' | 'waiting' | 'done' | 'failed';
export interface ContactState {
    name: string;
    phone: string;
    whatsapp: string;
}
export interface FlowState {
    step: Step;
    q1?: Q1Answer;
    q2?: Q2Answer;
    program?: ProgramId;
    fromCard: boolean;
    tier?: Tier;
    contact: ContactState;
    signupId?: string;
    amount?: number;
    isReturning?: boolean;
    msisdn?: string;
    checkoutRequestId?: string;
    paid: boolean;
    failureMessage?: string;
}
export type FlowAction = {
    type: 'START';
    program?: ProgramId;
} | {
    type: 'ANSWER_Q1';
    value: Q1Answer;
} | {
    type: 'ANSWER_Q2';
    value: Q2Answer;
} | {
    type: 'CONTINUE_TO_ACCESS';
} | {
    type: 'CHOOSE_TIER';
    tier: Tier;
} | {
    type: 'SWITCH_TO_FOUNDATIONS';
} | {
    type: 'SIGNUP_CREATED';
    contact: ContactState;
    signupId: string;
    program: ProgramId;
    tier: Tier;
    amount: number;
    isReturning: boolean;
    msisdn: string;
} | {
    type: 'PAYMENT_SENT';
    checkoutRequestId: string;
} | {
    type: 'PAYMENT_CONFIRMED';
} | {
    type: 'PAYMENT_FAILED';
    message: string;
} | {
    type: 'RETRY_PAYMENT';
} | {
    type: 'CHANGE_NUMBER';
} | {
    type: 'BACK';
} | {
    type: 'RESET';
};
export declare const initialFlowState: FlowState;
export declare function flowReducer(state: FlowState, action: FlowAction): FlowState;
export declare function loadFlowState(): FlowState;
export declare function saveFlowState(state: FlowState): void;
//# sourceMappingURL=flowReducer.d.ts.map