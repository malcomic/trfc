/**
 * Build a Google Calendar "Add event" URL from event details.
 * Event times are wall-clock Kenya times stored without a real timezone;
 * emit floating local datetimes (no Z) so 9:00 stays 9:00 on the calendar.
 */
function toFloatingLocal(value) {
    const d = new Date(value);
    const pad = (n) => String(n).padStart(2, '0');
    return (`${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
        `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`);
}
export function googleCalendarUrl(opts) {
    const start = new Date(opts.start);
    const end = new Date(start.getTime() + (opts.durationHours ?? 3) * 60 * 60 * 1000);
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: opts.title,
        dates: `${toFloatingLocal(start)}/${toFloatingLocal(end)}`,
    });
    if (opts.location)
        params.set('location', opts.location);
    if (opts.details)
        params.set('details', opts.details);
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
/**
 * Download a minimal .ics file for the event.
 */
export function downloadIcs(opts) {
    const start = new Date(opts.start);
    const end = new Date(start.getTime() + (opts.durationHours ?? 3) * 60 * 60 * 1000);
    const escape = (s) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//TRFC//Tickets//EN',
        'BEGIN:VEVENT',
        `DTSTART:${toFloatingLocal(start)}`,
        `DTEND:${toFloatingLocal(end)}`,
        `SUMMARY:${escape(opts.title)}`,
    ];
    if (opts.location)
        lines.push(`LOCATION:${escape(opts.location)}`);
    if (opts.details)
        lines.push(`DESCRIPTION:${escape(opts.details)}`);
    lines.push('END:VEVENT', 'END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = opts.filename || 'trfc-event.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
//# sourceMappingURL=calendar.js.map