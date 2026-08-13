/**
 * Event dates are stored as TIMESTAMP WITHOUT TIME ZONE (wall-clock Kenya time).
 * Postgres/node-pg serializes them with a trailing "Z", so browsers treat them as UTC
 * and shift display by +3h in Africa/Nairobi. Format with timeZone: 'UTC' so the
 * clock digits the admin entered are shown unchanged.
 */
export function parseEventDate(value) {
    if (!value)
        return null;
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}
export function formatEventDate(value, options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
}) {
    const d = parseEventDate(value);
    if (!d)
        return '';
    return d.toLocaleDateString('en-KE', { ...options, timeZone: 'UTC' });
}
export function formatEventTime(value, options = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
}) {
    const d = parseEventDate(value);
    if (!d)
        return '';
    return d.toLocaleTimeString('en-KE', { ...options, timeZone: 'UTC' });
}
export function formatEventDateTime(value) {
    const d = parseEventDate(value);
    if (!d)
        return '';
    return d.toLocaleString('en-KE', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
    });
}
/** Value for <input type="datetime-local"> matching the stored wall-clock time. */
export function toDatetimeLocalValue(value) {
    const d = parseEventDate(value);
    if (!d)
        return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
export function eventDateParts(value) {
    const d = parseEventDate(value);
    if (!d)
        return { day: null, mon: null };
    return {
        day: String(d.getUTCDate()).padStart(2, '0'),
        mon: d.toLocaleString('en-KE', { month: 'short', timeZone: 'UTC' }).toUpperCase(),
    };
}
//# sourceMappingURL=eventDate.js.map