import { Link } from 'react-router-dom'
import { Loader } from 'lucide-react'
import type { Event } from '../../../types'
import { DASHBOARD_COPY } from '../../../content/dashboard'
import { eventDayKey } from '../../../utils/calendarGrid'
import { formatEventDate, formatEventTime } from '../../../utils/eventDate'
import { dashCard, dashHeading, dashMuted } from './ui'

const copy = DASHBOARD_COPY.comingUp

/** Active events on or after `today` (YYYY-MM-DD, Nairobi), soonest first. */
export function upcomingEvents(events: Event[], today: string): Event[] {
  return events
    .filter((e) => e.is_active !== false && e.event_date && eventDayKey(e.event_date) >= today)
    .sort((a, b) => Date.parse(a.event_date) - Date.parse(b.event_date))
}

/** `events` is null while loading; otherwise already filtered with `upcomingEvents`. */
export default function ComingUpList({ events, bookedEventIds }: { events: Event[] | null; bookedEventIds: Set<string> }) {
  return (
    <div className={dashCard}>
      <h2 className={`${dashHeading} mb-4`}>{copy.heading}</h2>
      {events === null ? (
        <div className="flex justify-center py-6">
          <Loader className="w-6 h-6 animate-spin text-cta" />
        </div>
      ) : events.length === 0 ? (
        <p className={dashMuted}>{copy.empty}</p>
      ) : (
        <ul className="divide-y divide-white/5 light:divide-black/8">
          {events.slice(0, 3).map((e) => {
            const booked = bookedEventIds.has(e.id)
            return (
              <li key={e.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-barlow font-semibold text-chalk light:text-chalk-light truncate">{e.title}</p>
                  <p className={dashMuted}>
                    {formatEventDate(e.event_date, { weekday: 'short', month: 'short', day: 'numeric' })} ·{' '}
                    {formatEventTime(e.event_date)}
                    {e.location ? ` · ${e.location}` : ''}
                  </p>
                  {!booked && (e.installments_allowed ?? 0) > 0 && (
                    <p className="text-xs text-fog light:text-fog-light mt-0.5">{copy.installments}</p>
                  )}
                </div>
                <Link
                  to={`/events/${e.id}`}
                  className={`shrink-0 rounded-lg px-4 py-2 font-barlow font-semibold text-sm no-underline ${
                    booked
                      ? 'border border-white/10 light:border-black/10 text-chalk light:text-chalk-light hover:border-cta'
                      : 'bg-cta text-cta-ink hover:bg-cta/90'
                  }`}
                >
                  {booked ? copy.details : copy.book}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
