import { Link } from 'react-router-dom'
import { Loader, Ticket } from 'lucide-react'
import type { MemberTicket } from '../../../context/MemberDashboardContext'
import { DASHBOARD_COPY } from '../../../content/dashboard'
import { formatEventDate } from '../../../utils/eventDate'
import StatusBadge from '../StatusBadge'
import { dashCard, dashHeading, dashLink, dashMuted } from './ui'

const copy = DASHBOARD_COPY.tickets

/** `tickets` is null while loading; otherwise the upcoming tickets, soonest first. */
export default function TicketsSummaryCard({ tickets }: { tickets: MemberTicket[] | null }) {
  return (
    <div className={dashCard}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className={dashHeading}>{copy.heading}</h2>
        {tickets && tickets.length > 0 && (
          <Link to="/dashboard/tickets" className={`${dashLink} text-sm`}>
            {copy.all}
          </Link>
        )}
      </div>
      {tickets === null ? (
        <div className="flex justify-center py-6">
          <Loader className="w-6 h-6 animate-spin text-cta" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-4">
          <Ticket size={28} aria-hidden="true" className="mx-auto mb-3 text-mist light:text-mist-light" />
          <p className={`${dashMuted} max-w-sm mx-auto`}>{copy.empty}</p>
          <Link to="/dashboard/calendar" className={`${dashLink} inline-block mt-3`}>
            {copy.calendar}
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-white/5 light:divide-black/8">
          {tickets.slice(0, 3).map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="font-barlow font-semibold text-chalk light:text-chalk-light truncate">{t.event_title}</p>
                <p className={dashMuted}>
                  {t.event_date ? formatEventDate(t.event_date, { weekday: 'short', month: 'short', day: 'numeric' }) : '—'}
                  {t.ticket_type_name ? ` · ${t.ticket_type_name}` : ''}
                </p>
              </div>
              <StatusBadge status={t.payment_status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
