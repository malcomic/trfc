import type { CalendarEvent } from '../../api/users'
import { formatKes } from '../../utils/captainDisplay'
import StatusBadge from './StatusBadge'

export default function CalendarBadge({ event, onViewWallet }: { event: CalendarEvent; onViewWallet: () => void }) {
  switch (event.my_status) {
    case 'going':
      return <StatusBadge status="going" label={event.my_ticket_count > 1 ? `Going · ${event.my_ticket_count} tickets` : 'Going'} />
    case 'reserved':
      return (
        <button type="button" onClick={onViewWallet} className="hover:opacity-80" title="View your payments in progress">
          <StatusBadge
            status="reserved"
            label={event.plan_remaining != null ? `Reserved · ${formatKes(event.plan_remaining)} left` : 'Reserved'}
          />
        </button>
      )
    case 'pending':
      return <StatusBadge status="pending" label="Pending payment" />
    case 'attended':
      return <StatusBadge status="attended" label="Attended" />
    case 'missed':
      return <StatusBadge status="missed" label="Missed" />
  }
  if (event.is_past) return <StatusBadge status="past" label="Past" />
  if (event.sold_out) return <StatusBadge status="failed" label="Sold out" />
  if (event.min_price != null) {
    return (
      <p className="font-bebas text-lg text-accent light:text-accent-light">
        {event.min_price > 0 ? `From ${formatKes(event.min_price)}` : 'Free'}
      </p>
    )
  }
  return null
}
