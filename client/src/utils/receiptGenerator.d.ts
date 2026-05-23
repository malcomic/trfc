import { PaymentHistoryItem } from '../api/payments';
interface ReceiptData {
    id: string;
    type: 'order' | 'ticket' | 'equipment_hire';
    amount: number;
    payment_status: string;
    created_at: string;
    mpesa_receipt?: string;
    checkout_request_id?: string;
    items?: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
}
export declare function generateReceiptText(data: PaymentHistoryItem | ReceiptData): string;
export declare function downloadReceiptAsText(data: PaymentHistoryItem | ReceiptData): void;
export declare function downloadReceiptAsCSV(payments: (PaymentHistoryItem | ReceiptData)[]): void;
export declare function getTypeLabel(type: string): string;
export declare function formatReceiptData(data: ReceiptData): {
    title: string;
    items: Array<{
        label: string;
        value: string;
    }>;
};
export {};
//# sourceMappingURL=receiptGenerator.d.ts.map