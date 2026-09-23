export interface AdminTicket {
    id: string;
    event_id: string;
    event_title?: string;
    event_date?: string;
    ticket_type_name?: string | null;
    price?: number | null;
    phone?: string;
    payment_status: string;
    purchase_batch_id?: string;
    checked_in_at?: string | null;
    checked_in_by?: string | null;
    created_at: string;
}
export declare const getTicketsForAdmin: () => Promise<AdminTicket[]>;
//# sourceMappingURL=tickets.d.ts.map