export declare const getEventsForAdmin: () => Promise<any>;
export declare const createEvent: (data: {
    title: string;
    description?: string;
    location?: string;
    event_date: string;
    price: number;
    capacity?: number;
    image_url?: string;
}) => Promise<any>;
export declare const updateEvent: (id: string, data: {
    title: string;
    description?: string;
    location?: string;
    event_date: string;
    price: number;
    capacity?: number;
    image_url?: string;
    is_active: boolean;
}) => Promise<any>;
export declare const deleteEvent: (id: string) => Promise<any>;
//# sourceMappingURL=events.d.ts.map