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
}) => Promise<{
    ticketIds: string[];
    purchaseBatchId: string;
    quantity: number;
    eventTitle: string;
    eventDate: string;
    pricePerTicket: number;
    totalPrice: number;
}>;
export declare const getUserTickets: () => Promise<any>;
export declare const getTicketsByCheckoutRequestId: (checkoutRequestId: string, options: {
    email?: string;
    phone?: string;
}) => Promise<{
    event_title: string;
    event_date: string;
    quantity: number;
    total_price: number;
    payment_status: string;
    phone: string | null;
    email: string | null;
    checkout_request_id: string;
}>;
//# sourceMappingURL=events.d.ts.map