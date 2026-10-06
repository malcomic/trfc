import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getUserTickets } from '../api/events'
import { getFlashStatus } from '../api/flashSales'
import { AlertCircle, Loader, Ticket, ArrowLeft, Zap, ArrowRight } from 'lucide-react'
import { pageRoot, cardSurface } from '../utils/themeClasses'
import { formatEventDate } from '../utils/eventDate'
import { formatTimeLeft, loadFlashAccess } from '../utils/flashAccess'

export default function MyTickets() {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [flashExpiresAt, setFlashExpiresAt] = useState<string | null>(null)

  useEffect(() => {
    getFlashStatus(loadFlashAccess()?.token)
      .then((status) => setFlashExpiresAt(status.eligible ? status.expiresAt : null))
      .catch(() => setFlashExpiresAt(null))
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getUserTickets()
        setTickets(data)
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load tickets')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className={pageRoot}>
      <section className="bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-14 pb-11">
        <div className="max-w-3xl mx-auto">
          <Link to="/account" className="inline-flex items-center gap-2 text-accent light:text-accent-light text-sm mb-4 no-underline hover:underline">
            <ArrowLeft size={14} /> Account
          </Link>
          <h1 className="font-bebas text-5xl text-chalk light:text-chalk-light">MY <span className="text-accent light:text-accent-light">TICKETS</span></h1>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-[6%] py-10 pb-20">
        {flashExpiresAt && (
          <Link
            to="/flash-sales"
            className="mb-6 flex items-center justify-between gap-4 bg-accent/10 light:bg-accent-light/10 border border-accent/30 light:border-accent-light/30 border-l-4 border-l-accent light:border-l-accent-light px-5 py-4 no-underline hover:bg-accent/15 light:hover:bg-accent-light/15 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Zap size={20} className="text-accent light:text-accent-light flex-shrink-0" />
              <div>
                <p className="font-barlow-condensed font-bold text-base tracking-wide text-chalk light:text-chalk-light">
                  Ticket-holder flash deals unlocked
                </p>
                <p className="text-xs text-fog light:text-fog-light">Ends in {formatTimeLeft(flashExpiresAt)}</p>
              </div>
            </div>
            <ArrowRight size={18} className="text-accent light:text-accent-light flex-shrink-0" />
          </Link>
        )}
        {loading && (
          <div className="flex justify-center py-16">
            <Loader className="w-10 h-10 animate-spin text-accent light:text-accent-light" />
          </div>
        )}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 flex gap-3 text-red-300 text-sm">
            <AlertCircle size={18} /> {error}
          </div>
        )}
        {!loading && !error && tickets.length === 0 && (
          <div className="text-center py-16 text-fog light:text-fog-light">
            <Ticket className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No tickets yet.</p>
            <Link to="/events" className="text-accent light:text-accent-light mt-4 inline-block no-underline hover:underline">Browse events</Link>
          </div>
        )}
        <div className="space-y-4">
          {tickets.map((t) => (
            <div key={t.id} className={`${cardSurface} p-5 flex flex-wrap gap-4 justify-between items-start`}>
              <div>
                <h3 className="font-barlow-condensed font-bold text-lg">{t.event_title}</h3>
                {t.ticket_type_name && (
                  <p className="text-sm text-accent light:text-accent-light">{t.ticket_type_name}</p>
                )}
                <p className="text-sm text-fog light:text-fog-light">{t.location}</p>
                <p className="text-sm text-fog light:text-fog-light mt-1">
                  {t.event_date ? formatEventDate(t.event_date, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                </p>
              </div>
              <div className="text-right">
                <span className={`inline-block px-3 py-1 text-xs font-bold uppercase ${t.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                  {t.payment_status}
                </span>
                {t.price != null && <p className="font-bebas text-xl text-accent light:text-accent-light mt-2">KES {Number(t.price).toLocaleString()}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
