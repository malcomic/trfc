export interface Ticket {
    id: string;
    user_id: string;
    event_id: string;
    phone: string;
    payment_status: 'pending' | 'paid' | 'failed';
    mpesa_receipt: string | null;
    checkout_request_id: string | null;
    created_at: string;
    event_title?: string;
    event_date?: string;
    event_price?: number;
    event_location?: string;
    price?: number;
    location?: string;
}
/**
 * Buy tickets for an event
 */
export declare function buyTickets(eventId: string, quantity: number, phone: string): Promise<any>;
/**
 * Get all tickets for the current user
 */
export declare function getUserTickets(): Promise<Ticket[]>;
/**
 * Get a single ticket by ID
 */
export declare function getTicketById(ticketId: string): Promise<Ticket>;
/**
 * Update ticket payment status
 */
export declare function updateTicketPaymentStatus(ticketId: string, paymentStatus: string, mpesaReceipt?: string): Promise<any>;
/**
 * Download ticket as PDF
 * Triggers a browser download of the PDF file
 */
export declare function downloadTicket(ticketId: string): Promise<void>;
declare const _default: {
    buyTickets: typeof buyTickets;
    getUserTickets: typeof getUserTickets;
    getTicketById: typeof getTicketById;
    updateTicketPaymentStatus: typeof updateTicketPaymentStatus;
    downloadTicket: typeof downloadTicket;
};
export default _default;
//# sourceMappingURL=tickets.d.ts.map