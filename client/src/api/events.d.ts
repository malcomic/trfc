import { Event } from '../types';
export declare const getEvents: () => Promise<any>;
export declare const getEventById: (id: string) => Promise<any>;
export declare const createEvent: (data: Partial<Event>) => Promise<any>;
export declare const updateEvent: (id: string, data: Partial<Event>) => Promise<any>;
export declare const deleteEvent: (id: string) => Promise<any>;
//# sourceMappingURL=events.d.ts.map