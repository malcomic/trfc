export interface ScanEvent {
    id: string;
    title: string;
    event_date: string;
}
export type TicketScanStatus = 'valid' | 'already_checked_in' | 'unpaid' | 'not_found' | 'wrong_event' | 'ambiguous';
export type MedalScanStatus = 'valid' | 'already_redeemed' | 'unpaid' | 'not_found' | 'ambiguous';
export interface TicketScanResult {
    kind: 'ticket';
    status: TicketScanStatus;
    ticket: {
        id: string;
        shortCode: string;
        attendeeName: string | null;
        email: string | null;
        phone: string | null;
        eventId: string | null;
        eventTitle: string | null;
        eventDate: string | null;
        paymentStatus: string;
        checkedInAt: string | null;
    };
}
export interface MedalScanResult {
    kind: 'medal';
    status: MedalScanStatus;
    purchase: {
        id: string;
        shortCode: string;
        buyerName: string | null;
        email: string | null;
        phone: string | null;
        tierName: string | null;
        tierSlug: string | null;
        distanceKm: number;
        paymentStatus: string;
        redeemedAt: string | null;
    };
}
export interface EmptyScanResult {
    kind: null;
    status: 'not_found' | 'ambiguous';
}
export type ScanLookupResult = TicketScanResult | MedalScanResult | EmptyScanResult;
export declare const listScanEvents: () => Promise<ScanEvent[]>;
export declare const lookupScan: (body: {
    payload?: string;
    shortCode?: string;
    type?: "ticket" | "medal";
    eventId?: string;
}) => Promise<ScanLookupResult>;
export declare const admitScan: (body: {
    kind: "ticket" | "medal";
    id: string;
    eventId?: string;
}) => Promise<TicketScanResult | MedalScanResult>;
//# sourceMappingURL=scan.d.ts.map