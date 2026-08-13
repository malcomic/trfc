export declare function googleCalendarUrl(opts: {
    title: string;
    start: string | Date;
    location?: string | null;
    details?: string;
    durationHours?: number;
}): string;
/**
 * Download a minimal .ics file for the event.
 */
export declare function downloadIcs(opts: {
    title: string;
    start: string | Date;
    location?: string | null;
    details?: string;
    durationHours?: number;
    filename?: string;
}): void;
//# sourceMappingURL=calendar.d.ts.map