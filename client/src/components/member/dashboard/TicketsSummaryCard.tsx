import { Link } from 'react-router-dom'
import { Loader, Ticket } from 'lucide-react'
import type { MemberTicket } from '../../../context/MemberDashboardContext'
import { DASHBOARD_COPY } from '../../../content/dashboard'
import { formatEventDate } from '../../../utils/eventDate'
import StatusBadge from '../StatusBadge'
import { formatCancelDeadline } from '../TicketRow'
import { dashCard, dashHeading, dashLink, dashMuted } from './ui'

const copy = DASHBOARD_COPY.tickets

interface TicketsSummaryCardProps {
  /** null while loading; otherwise the upcoming tickets, soonest first. */
  tickets: MemberTicket[] | null
  onCancel: (ticket: MemberTicket) => void
}

export default function TicketsSummaryCard({ tickets, onCancel }: TicketsSummaryCardProps) {
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
                {t.can_cancel && t.cancel_deadline && (
                  <p className="text-xs text-fog light:text-fog-light mt-0.5">
                    {copy.cancelUntil(formatCancelDeadline(t.cancel_deadline))}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <StatusBadge status={t.payment_status} />
                {t.can_cancel && (
                  <button type="button" onClick={() => onCancel(t)} className="text-xs text-red-400 hover:underline">
                    {copy.cancel}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
