export interface AdminTicketType {
    id: string;
    event_id: string;
    name: string;
    description?: string | null;
    price: number;
    capacity: number | null;
    sort_order: number;
    is_active: boolean;
    remaining: number | null;
    is_sold_out: boolean;
}
export interface AdminEvent {
    id: string;
    title: string;
    description?: string;
    location?: string;
    event_date: string;
    price?: number;
    capacity?: number;
    image_url?: string;
    is_active: boolean;
    ticket_types?: AdminTicketType[];
    min_price?: number | null;
    all_types_sold_out?: boolean;
}
export declare const getEventsForAdmin: () => Promise<AdminEvent[]>;
export declare const createEvent: (data: {
    title: string;
    description?: string;
    location?: string;
    event_date: string;
    image_url?: string;
}) => Promise<any>;
export declare const updateEvent: (id: string, data: {
    title: string;
    description?: string;
    location?: string;
    event_date: string;
    image_url?: string;
    is_active: boolean;
}) => Promise<any>;
export declare const deleteEvent: (id: string) => Promise<any>;
export declare const createEventTicketType: (eventId: string, data: {
    name: string;
    description?: string | null;
    price: number;
    capacity?: number | null;
    sort_order?: number;
    is_active?: boolean;
}) => Promise<AdminTicketType>;
export declare const updateEventTicketType: (eventId: string, typeId: string, data: {
    name: string;
    description?: string | null;
    price: number;
    capacity?: number | null;
    sort_order?: number;
    is_active?: boolean;
}) => Promise<AdminTicketType>;
export declare const deleteEventTicketType: (eventId: string, typeId: string) => Promise<any>;
//# sourceMappingURL=events.d.ts.map