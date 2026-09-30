export type PaymentPollStatus = 'pending' | 'success' | 'failed';
export interface PaymentPollingMessages {
    rejected?: string;
    timeout?: string;
    unreachable?: string;
}
export declare function usePaymentPolling(checkoutRequestId: string | null | undefined, enabled: boolean, messages?: PaymentPollingMessages): {
    status: PaymentPollStatus;
    error: string;
};
//# sourceMappingURL=usePaymentPolling.d.ts.map