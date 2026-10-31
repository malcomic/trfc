import { Link } from 'react-router-dom'
import { Clock, Ticket } from 'lucide-react'
import { cardSurface } from '../../utils/themeClasses'
import { formatKes } from '../../utils/captainDisplay'
import {
  CREDIT_REASON_LABELS,
  TICKET_VALUE_NOTE,
  formatCreditDate,
  type TicketCredit,
} from '../../api/wallet'

interface WalletCardProps {
  ticketValue: number
  upcoming: number
  credits: TicketCredit[]
  creditDays: number
  payableCount: number
  onPayEvents: () => void
}

/** "Ticket value": what the member can use on event tickets, and when each part of it ends. */
export default function WalletCard({ ticketValue, upcoming, credits, creditDays, payableCount, onPayEvents }: WalletCardProps) {
  const soonest = credits.find((c) => c.available && c.remaining - c.held > 0)
  return (
    <div className={`${cardSurface} p-6 space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light mb-1 flex items-center gap-1.5">
            <Ticket size={14} /> Ticket value
          </p>
          <p className="font-bebas text-4xl text-chalk light:text-chalk-light">{formatKes(ticketValue)}</p>
          <p className="text-xs text-fog light:text-fog-light mt-1">{TICKET_VALUE_NOTE}</p>
          {soonest && (
            <p className="text-xs text-amber-400 mt-1">
              {formatKes(soonest.remaining - soonest.held)} ends {formatCreditDate(soonest.expires_at)} ({soonest.days_left}{' '}
              day{soonest.days_left === 1 ? '' : 's'} left)
            </p>
          )}
          {upcoming > 0 && (
            <p className="text-xs text-fog light:text-fog-light mt-1">
              {formatKes(upcoming)} more appears the morning after your missed event.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/events"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-cta text-cta-ink font-barlow-condensed font-bold text-sm tracking-widest uppercase"
          >
            <Ticket size={14} /> Use on an event
          </Link>
          {payableCount > 0 && (
            <button
              type="button"
              onClick={onPayEvents}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-accent light:border-accent-light text-accent light:text-accent-light font-barlow-condensed font-bold text-sm tracking-widest uppercase"
            >
              Pay booked tickets ({payableCount})
            </button>
          )}
        </div>
      </div>

      {credits.length > 0 && (
        <ul className="divide-y divide-white/10 light:divide-black/10 border-t border-white/10 light:border-black/10">
          {credits.map((credit) => (
            <li key={credit.id} className="py-2 flex flex-wrap justify-between gap-2 text-sm">
              <span className="min-w-0">
                <span className="block text-chalk light:text-chalk-light">
                  {CREDIT_REASON_LABELS[credit.reason] ?? credit.reason}
                  {credit.event_title ? ` · ${credit.event_title}` : ''}
                </span>
                <span className="flex items-center gap-1 text-xs text-fog light:text-fog-light">
                  <Clock size={12} />
                  {credit.available
                    ? `Use by ${formatCreditDate(credit.expires_at)} · ${credit.days_left} day${credit.days_left === 1 ? '' : 's'} left`
                    : `Available from ${formatCreditDate(credit.available_from)}`}
                  {credit.held > 0 ? ` · ${formatKes(credit.held)} held for a payment` : ''}
                </span>
              </span>
              <span className="font-bebas text-lg text-chalk light:text-chalk-light">{formatKes(credit.remaining)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-fog light:text-fog-light">
        Ticket value lasts {creditDays} days from the day after the event it came from, until 11:59 pm on the last day. The
        oldest value is used first, and it cannot be extended.
      </p>
    </div>
  )
}
