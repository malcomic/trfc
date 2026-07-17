import { Calendar, MapPin, Printer, Ticket } from 'lucide-react'
import TicketDownloadButton from './TicketDownloadButton'

export interface TicketCardData {
  id: string
  shortCode: string
  attendeeName: string
  paymentStatus: string
  qrDataUrl: string | null
  eventTitle: string
  eventDate?: string | null
  location?: string | null
  unitPrice?: number | null
  mpesaReceipt?: string | null
  phone?: string | null
}

interface TicketCardProps {
  ticket: TicketCardData
  index?: number
  total?: number
  verify?: { email?: string; phone?: string }
  showActions?: boolean
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-KE', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatTime(dateStr?: string | null) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function TicketCard({
  ticket,
  index = 0,
  total = 1,
  verify,
  showActions = true,
}: TicketCardProps) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <article
      className="ticket-card relative overflow-hidden bg-ash light:bg-ash-light border border-white/10 light:border-black/10 print:break-inside-avoid print:border-black/20 print:shadow-none"
      data-ticket-id={ticket.id}
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-accent light:bg-accent-light print:bg-black" />

      <div className="flex flex-col md:flex-row">
        {/* Main body */}
        <div className="flex-1 p-5 md:p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="font-barlow-condensed text-[11px] tracking-[0.2em] uppercase text-accent light:text-accent-light">
                TRFC · Entry ticket
              </p>
              <h3 className="font-bebas text-2xl md:text-3xl text-chalk light:text-chalk-light mt-1 leading-none">
                {ticket.eventTitle}
              </h3>
            </div>
            {total > 1 && (
              <span className="shrink-0 text-xs text-fog light:text-fog-light font-barlow-condensed tracking-widest uppercase">
                {index + 1} / {total}
              </span>
            )}
          </div>

          <div className="mb-5 pb-4 border-b border-white/5 light:border-black/8">
            <p className="text-[10px] font-barlow-condensed tracking-widest uppercase text-fog light:text-fog-light mb-1">
              Attendee
            </p>
            <p className="font-bebas text-3xl text-accent light:text-accent-light leading-none tracking-wide">
              {ticket.attendeeName}
            </p>
            {ticket.phone && (
              <p className="text-sm text-fog light:text-fog-light mt-1">{ticket.phone}</p>
            )}
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex gap-2">
              <Calendar size={14} className="mt-0.5 text-accent light:text-accent-light shrink-0" />
              <div>
                <dt className="text-[10px] font-barlow-condensed tracking-widest uppercase text-fog">Date</dt>
                <dd className="text-chalk light:text-chalk-light">
                  {formatDate(ticket.eventDate)}
                  {formatTime(ticket.eventDate) ? ` · ${formatTime(ticket.eventDate)}` : ''}
                </dd>
              </div>
            </div>
            <div className="flex gap-2">
              <MapPin size={14} className="mt-0.5 text-accent light:text-accent-light shrink-0" />
              <div>
                <dt className="text-[10px] font-barlow-condensed tracking-widest uppercase text-fog">Venue</dt>
                <dd className="text-chalk light:text-chalk-light">{ticket.location || 'TBA'}</dd>
              </div>
            </div>
            {ticket.unitPrice != null && (
              <div className="flex gap-2">
                <Ticket size={14} className="mt-0.5 text-accent light:text-accent-light shrink-0" />
                <div>
                  <dt className="text-[10px] font-barlow-condensed tracking-widest uppercase text-fog">Price</dt>
                  <dd className="text-chalk light:text-chalk-light">
                    KES {Number(ticket.unitPrice).toLocaleString()}
                  </dd>
                </div>
              </div>
            )}
            {ticket.mpesaReceipt && (
              <div>
                <dt className="text-[10px] font-barlow-condensed tracking-widest uppercase text-fog">M-Pesa receipt</dt>
                <dd className="text-chalk light:text-chalk-light font-mono text-xs">{ticket.mpesaReceipt}</dd>
              </div>
            )}
          </dl>

          <p className="mt-4 text-[11px] text-fog light:text-fog-light">
            Present this QR at entry · One person per ticket · Bring valid ID if asked
          </p>
        </div>

        {/* Stub / QR */}
        <div className="md:w-48 border-t md:border-t-0 md:border-l border-dashed border-white/15 light:border-black/15 bg-smoke/40 light:bg-smoke-light/50 p-5 flex flex-col items-center justify-center gap-3">
          {ticket.qrDataUrl && ticket.paymentStatus === 'paid' ? (
            <img
              src={ticket.qrDataUrl}
              alt={`QR for ticket ${ticket.shortCode}`}
              className="w-36 h-36 bg-white p-2"
            />
          ) : (
            <div className="w-36 h-36 bg-night/40 light:bg-black/5 flex items-center justify-center text-xs text-fog text-center px-2">
              QR available after payment
            </div>
          )}
          <div className="text-center">
            <p className="text-[10px] font-barlow-condensed tracking-[0.2em] uppercase text-fog">Code</p>
            <p className="font-bebas text-2xl text-accent light:text-accent-light tracking-widest">
              {ticket.shortCode}
            </p>
          </div>
        </div>
      </div>

      {showActions && ticket.paymentStatus === 'paid' && (
        <div className="ticket-actions flex flex-wrap gap-2 px-5 pb-5 print:hidden">
          <TicketDownloadButton
            ticketId={ticket.id}
            paymentStatus={ticket.paymentStatus}
            eventTitle={ticket.eventTitle}
            verify={verify}
            compact
          />
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3 py-2 bg-smoke light:bg-smoke-light border border-white/10 light:border-black/10 font-barlow-condensed font-bold text-xs tracking-widest uppercase hover:border-accent light:hover:border-accent-light"
          >
            <Printer size={14} />
            Print
          </button>
        </div>
      )}
    </article>
  )
}
