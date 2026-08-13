/**
 * Event dates are stored as TIMESTAMP WITHOUT TIME ZONE (wall-clock Kenya time).
 * Postgres/node-pg serializes them with a trailing "Z", so browsers treat them as UTC
 * and shift display by +3h in Africa/Nairobi. Format with timeZone: 'UTC' so the
 * clock digits the admin entered are shown unchanged.
 */
export declare function parseEventDate(value: string | Date | null | undefined): Date | null;
export declare function formatEventDate(value: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions): string;
export declare function formatEventTime(value: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions): string;
export declare function formatEventDateTime(value: string | Date | null | undefined): string;
/** Value for <input type="datetime-local"> matching the stored wall-clock time. */
export declare function toDatetimeLocalValue(value: string | Date | null | undefined): string;
export declare function eventDateParts(value?: string | Date | null): {
    day: string | null;
    mon: string | null;
};
//# sourceMappingURL=eventDate.d.ts.map