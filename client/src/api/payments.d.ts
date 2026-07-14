export interface PaymentInitiateRequest {
    phone: string;
    amount: number;
    orderId?: string;
    ticketId?: string;
    ticketBatchId?: string;
    equipmentHireId?: string;
}
export interface PaymentInitiateResponse {
    checkoutRequestId: string;
    merchantRequestId: string;
    responseCode: string;
    customerMessage: string;
}
export interface PaymentHistoryItem {
    id: string;
    type: 'order' | 'ticket' | 'equipment_hire';
    amount: number | null;
    payment_status: string;
    mpesa_receipt: string | null;
    checkout_request_id: string | null;
    created_at: string;
}
export declare function initiateSTKPush(data: PaymentInitiateRequest): Promise<PaymentInitiateResponse>;
export declare function checkPaymentStatus(checkoutRequestId: string): Promise<any>;
export declare function pollPaymentStatus(checkoutRequestId: string, options?: {
    interval: number;
    timeout: number;
}): Promise<any>;
export declare function getPaymentHistory(): Promise<PaymentHistoryItem[]>;
export declare function initializePaystackPayment(data: {
    email: string;
    amount: number;
    ticketBatchId: string;
}): Promise<{
    accessCode: string;
    reference: string;
    authorizationUrl: string;
    publicKey: string;
}>;
export declare function verifyPaystackPayment(reference: string): Promise<{
    status: string;
    payment_status: string;
    reference: string;
    receipt?: string | null;
    amount?: number;
    channel?: string;
    error?: string;
}>;
export declare function initiateEquipmentPayment(data: {
    phone: string;
    amount: number;
    equipmentHireId: string;
}): Promise<PaymentInitiateResponse>;
//# sourceMappingURL=payments.d.ts.map