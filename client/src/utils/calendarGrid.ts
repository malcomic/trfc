/**
 * Calendar helpers. Months are 'YYYY-MM' strings and days are 'YYYY-MM-DD' strings.
 * Event dates are Kenya wall-clock times serialized with a trailing Z, so everything
 * here reads UTC parts and never the browser's local time zone.
 */

export interface CalendarCell {
  day: string;
  date: number;
  inMonth: boolean;
  isToday: boolean;
  isPast: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

const toDay = (date: Date) =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

const parseMonth = (month: string) => {
  const [year, m] = month.split('-').map(Number);
  return { year, monthIndex: m - 1 };
};

export function eventDayKey(value: string): string {
  return toDay(new Date(value));
}

export function monthOfDay(day: string): string {
  return day.slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const { year, monthIndex } = parseMonth(month);
  const date = new Date(Date.UTC(year, monthIndex + delta, 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

export function monthRange(month: string): { from: string; to: string } {
  const { year, monthIndex } = parseMonth(month);
  return {
    from: toDay(new Date(Date.UTC(year, monthIndex, 1))),
    to: toDay(new Date(Date.UTC(year, monthIndex + 1, 0))),
  };
}

/** Six Monday-first weeks (42 cells) covering the month. */
export function buildMonthGrid(month: string, today: string): CalendarCell[] {
  const { year, monthIndex } = parseMonth(month);
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(Date.UTC(year, monthIndex, 1 - offset + i));
    const day = toDay(date);
    cells.push({
      day,
      date: date.getUTCDate(),
      inMonth: date.getUTCMonth() === monthIndex,
      isToday: day === today,
      isPast: day < today,
    });
  }
  return cells;
}

export function groupByDay<T extends { event_date: string }>(events: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const event of events) {
    const key = eventDayKey(event.event_date);
    const list = groups.get(key);
    if (list) list.push(event);
    else groups.set(key, [event]);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => a.event_date.localeCompare(b.event_date));
  }
  return groups;
}

export function formatMonthLabel(month: string): string {
  const { year, monthIndex } = parseMonth(month);
  return new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString('en-KE', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatDayLabel(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-KE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Today's date in Nairobi (UTC+3), used before the server has reported it. */
export function nairobiToday(now: Date = new Date()): string {
  return toDay(new Date(now.getTime() + 3 * 60 * 60 * 1000));
}

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
