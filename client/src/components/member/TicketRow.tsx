import { cardSurface } from '../../utils/themeClasses'
import { formatEventDate } from '../../utils/eventDate'
import { formatKes } from '../../utils/captainDisplay'
import type { PaymentPlan } from '../../api/wallet'
import type { MemberTicket } from '../../context/MemberDashboardContext'
import TicketDownloadButton from '../TicketDownloadButton'
import StatusBadge from './StatusBadge'

export function isUpcoming(ticket: MemberTicket) {
  if (!ticket.event_date) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(ticket.event_date).getTime() >= today.getTime()
}

interface TicketRowProps {
  ticket: MemberTicket
  plan?: PaymentPlan
  onCancel: (ticket: MemberTicket) => void
  onViewPlan: () => void
}

export default function TicketRow({ ticket, plan, onCancel, onViewPlan }: TicketRowProps) {
  const reserved = ticket.payment_status === 'reserved'
  const remaining = plan ? Math.max(0, plan.total_amount - plan.amount_paid) : null
  const showCancelInfo = (ticket.payment_status === 'paid' || reserved) && isUpcoming(ticket)

  return (
    <div className={`${cardSurface} p-4 flex flex-wrap justify-between gap-3 items-start`}>
      <div className="min-w-0">
        <p className="font-barlow-condensed font-bold text-lg">{ticket.event_title}</p>
        {ticket.ticket_type_name && <p className="text-sm text-accent light:text-accent-light">{ticket.ticket_type_name}</p>}
        <p className="text-sm text-fog light:text-fog-light">
          {ticket.event_date ? formatEventDate(ticket.event_date, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
          {ticket.location ? ` · ${ticket.location}` : ''}
          {ticket.zone_name ? ` · Zone: ${ticket.zone_name}` : ''}
        </p>
        {showCancelInfo && !ticket.can_cancel && ticket.cancel_blocked_reason && (
          <p className="text-xs text-fog light:text-fog-light mt-1">{ticket.cancel_blocked_reason}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-2">
        <StatusBadge
          status={ticket.payment_status}
          label={reserved && remaining != null ? `Reserved · ${formatKes(remaining)} remaining` : undefined}
        />
        {ticket.price != null && (
          <p className="font-bebas text-xl text-accent light:text-accent-light">{formatKes(Number(ticket.price))}</p>
        )}
        {ticket.payment_status === 'paid' && (
          <TicketDownloadButton ticketId={ticket.id} paymentStatus={ticket.payment_status} eventTitle={ticket.event_title} compact />
        )}
        {reserved && (
          <button type="button" onClick={onViewPlan} className="text-xs text-accent light:text-accent-light hover:underline">
            View plan
          </button>
        )}
        {ticket.can_cancel && (
          <button type="button" onClick={() => onCancel(ticket)} className="text-xs text-red-400 hover:underline">
            Cancel ticket
          </button>
        )}
      </div>
    </div>
  )
}
