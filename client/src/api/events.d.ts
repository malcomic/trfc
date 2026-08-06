import { Event } from '../types';
export declare const getEvents: () => Promise<any>;
export declare const getEventById: (id: string) => Promise<any>;
export declare const createEvent: (data: Partial<Event>) => Promise<any>;
export declare const updateEvent: (id: string, data: Partial<Event>) => Promise<any>;
export declare const deleteEvent: (id: string) => Promise<any>;
export declare const buyEventTickets: (eventId: string, data: {
    quantity: number;
    email: string;
    phone: string;
    attendeeName: string;
}) => Promise<{
    ticketIds: string[];
    purchaseBatchId: string;
    quantity: number;
    eventTitle: string;
    eventDate: string;
    pricePerTicket: number;
    totalPrice: number;
    attendeeName: string;
}>;
export interface ConfirmationTicket {
    id: string;
    short_code: string;
    attendee_name: string;
    payment_status: string;
    qr_data_url: string | null;
}
export interface TicketConfirmationDetails {
    event_title: string;
    event_date: string;
    location: string | null;
    unit_price: number;
    quantity: number;
    total_price: number;
    payment_status: string;
    phone: string | null;
    email: string | null;
    attendee_name: string;
    mpesa_receipt: string | null;
    checkout_request_id: string;
    tickets: ConfirmationTicket[];
}
export declare const getUserTickets: () => Promise<any>;
export declare const getTicketsByCheckoutRequestId: (checkoutRequestId: string, options: {
    email?: string;
    phone?: string;
}) => Promise<TicketConfirmationDetails>;
//# sourceMappingURL=events.d.ts.map