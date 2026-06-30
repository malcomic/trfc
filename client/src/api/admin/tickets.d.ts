export interface AdminTicket {
    id: string;
    event_id: string;
    event_title?: string;
    event_date?: string;
    phone?: string;
    payment_status: string;
    purchase_batch_id?: string;
    created_at: string;
}
export declare const getTicketsForAdmin: () => Promise<AdminTicket[]>;
//# sourceMappingURL=tickets.d.ts.map