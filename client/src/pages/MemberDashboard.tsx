import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  Award,
  CalendarDays,
  Loader,
  MapPin,
  Package,
  Ticket,
  Truck,
  Wallet,
} from 'lucide-react'
import { pageRoot, cardSurface } from '../utils/themeClasses'
import { getMyDashboard, type MemberDashboard as MemberDashboardData, type MemberProfile } from '../api/users'
import { getUserTickets } from '../api/events'
import { getUserMedalPurchases, type UserMedalPurchase } from '../api/medals'
import { getPaymentHistory, type PaymentHistoryItem } from '../api/payments'
import { formatEventDate } from '../utils/eventDate'
import { formatDate, formatKes } from '../utils/captainDisplay'
import StatTile from '../components/dashboard/StatTile'
import DashboardTabs from '../components/dashboard/DashboardTabs'
import DashboardHeader from '../components/dashboard/DashboardHeader'
import ProfileForm from '../components/dashboard/ProfileForm'
import TicketDownloadButton from '../components/TicketDownloadButton'
import { ToastStack, type ToastMessage } from '../components/Toast'

type Tab = 'upcoming' | 'tickets' | 'medals' | 'payments' | 'profile'

const TAB_LABELS: Record<Tab, string> = {
  upcoming: 'Upcoming',
  tickets: 'All tickets',
  medals: 'Medals',
  payments: 'Payments',
  profile: 'Profile',
}

const PAYMENT_TYPE_LABELS: Record<PaymentHistoryItem['type'], string> = {
  order: 'Shop order',
  ticket: 'Event ticket',
  equipment_hire: 'Equipment hire',
  medal: 'Medal',
}

interface MemberTicket {
  id: string
  event_id: string
  event_title: string
  event_date: string | null
  location: string | null
  payment_status: string
  price: number | null
  ticket_type_name: string | null
  zone_name: string | null
}

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-green-500/20 text-green-400',
  pending: 'bg-yellow-500/20 text-yellow-400',
  failed: 'bg-red-500/20 text-red-400',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 text-xs font-bold uppercase ${STATUS_STYLES[status] ?? 'bg-white/5 text-fog'}`}>
      {status}
    </span>
  )
}

function EmptyState({ message, to, cta }: { message: string; to?: string; cta?: string }) {
  return (
    <div className="text-center py-10 text-fog light:text-fog-light">
      <p>{message}</p>
      {to && cta && (
        <Link to={to} className="text-accent light:text-accent-light mt-3 inline-block no-underline hover:underline">
          {cta}
        </Link>
      )}
    </div>
  )
}

function isUpcoming(ticket: MemberTicket) {
  if (!ticket.event_date) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(ticket.event_date).getTime() >= today.getTime()
}

function TicketRow({ ticket }: { ticket: MemberTicket }) {
  return (
    <div className={`${cardSurface} p-4 flex flex-wrap justify-between gap-3 items-start`}>
      <div>
        <p className="font-barlow-condensed font-bold text-lg">{ticket.event_title}</p>
        {ticket.ticket_type_name && <p className="text-sm text-accent light:text-accent-light">{ticket.ticket_type_name}</p>}
        <p className="text-sm text-fog light:text-fog-light">
          {ticket.event_date ? formatEventDate(ticket.event_date, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
          {ticket.location ? ` · ${ticket.location}` : ''}
          {ticket.zone_name ? ` · Zone: ${ticket.zone_name}` : ''}
        </p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <StatusBadge status={ticket.payment_status} />
        {ticket.price != null && (
          <p className="font-bebas text-xl text-accent light:text-accent-light">{formatKes(Number(ticket.price))}</p>
        )}
        {ticket.payment_status === 'paid' && (
          <TicketDownloadButton ticketId={ticket.id} paymentStatus={ticket.payment_status} eventTitle={ticket.event_title} compact />
        )}
      </div>
    </div>
  )
}

export default function MemberDashboard() {
  const [data, setData] = useState<MemberDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('upcoming')
  const [tabLoading, setTabLoading] = useState(false)

  const [tickets, setTickets] = useState<MemberTicket[] | null>(null)
  const [medals, setMedals] = useState<UserMedalPurchase[] | null>(null)
  const [payments, setPayments] = useState<PaymentHistoryItem[] | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const notify = (type: ToastMessage['type'], title: string, message?: string) => {
    const id = Date.now()
    setToasts((t) => [...t, { id, type, title, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }

  useEffect(() => {
    getMyDashboard()
      .then(setData)
      .catch((err: any) => setError(err.response?.data?.error || 'Failed to load your dashboard'))
      .finally(() => setLoading(false))
    getUserTickets()
      .then(setTickets)
      .catch(() => setTickets([]))
  }, [])

  useEffect(() => {
    if (!data) return
    if (tab === 'medals' && medals === null) {
      setTabLoading(true)
      getUserMedalPurchases()
        .then(setMedals)
        .catch(() => setMedals([]))
        .finally(() => setTabLoading(false))
    }
    if (tab === 'payments' && payments === null) {
      setTabLoading(true)
      getPaymentHistory()
        .then(setPayments)
        .catch(() => setPayments([]))
        .finally(() => setTabLoading(false))
    }
  }, [data, tab, medals, payments])

  const upcomingTickets = useMemo(
    () =>
      (tickets ?? [])
        .filter((t) => t.payment_status === 'paid' && isUpcoming(t))
        .sort((a, b) => new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime()),
    [tickets]
  )
  const nextTicket = upcomingTickets[0]

  const ticketsLoading = (tab === 'upcoming' || tab === 'tickets') && tickets === null
  const showSpinner = tabLoading || ticketsLoading

  const updateProfile = (profile: MemberProfile) => setData((d) => (d ? { ...d, profile } : d))

  return (
    <div className={pageRoot}>
      <DashboardHeader title="MY" highlight="DASHBOARD">
        {data && (
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <span className="text-chalk light:text-chalk-light font-barlow-condensed font-bold text-lg">{data.profile.name}</span>
            {data.captain && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/15 light:bg-accent-light/15 border border-accent/30 light:border-accent-light/30 text-accent light:text-accent-light font-barlow-condensed font-bold text-xs tracking-widest uppercase">
                <MapPin size={12} /> Captain {data.captain.name} · {data.captain.zone}
              </span>
            )}
            <span className="text-sm text-fog light:text-fog-light">Member since {formatDate(data.profile.created_at)}</span>
          </div>
        )}
      </DashboardHeader>

      <div className="max-w-5xl mx-auto px-[6%] py-10 pb-20 space-y-8">
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

        {data && (
          <>
            <div className={`${cardSurface} p-6`}>
              {nextTicket ? (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light mb-1">
                      Your next event
                    </p>
                    <h2 className="font-barlow-condensed font-bold text-2xl tracking-tighter">{nextTicket.event_title}</h2>
                    <p className="text-sm text-fog light:text-fog-light">
                      {formatEventDate(nextTicket.event_date!, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                      {nextTicket.location ? ` · ${nextTicket.location}` : ''}
                    </p>
                  </div>
                  <TicketDownloadButton
                    ticketId={nextTicket.id}
                    paymentStatus={nextTicket.payment_status}
                    eventTitle={nextTicket.event_title}
                  />
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-barlow-condensed font-bold text-xl tracking-tighter mb-1">No upcoming events yet</h2>
                    <p className="text-sm text-fog light:text-fog-light">Find your next run, ride or session with the TRFC community.</p>
                  </div>
                  <Link
                    to="/events"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent light:bg-accent-light text-black light:text-white font-barlow-condensed font-bold text-sm tracking-widest uppercase no-underline"
                  >
                    Browse events <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatTile label="Upcoming events" value={data.stats.upcoming_events} icon={CalendarDays} />
              <StatTile label="Tickets" value={data.stats.tickets} icon={Ticket} />
              <StatTile label="Medals" value={data.stats.medals} icon={Award} />
              <StatTile label="Orders" value={data.stats.orders} icon={Package} />
              <StatTile label="Equipment hires" value={data.stats.equipment_hires} icon={Truck} />
              <StatTile label="Total spent" value={formatKes(data.stats.total_spent)} icon={Wallet} />
            </div>
            {data.stats.pending_payments > 0 && (
              <p className="text-sm text-fog light:text-fog-light -mt-4">
                {data.stats.pending_payments} payment{data.stats.pending_payments === 1 ? ' is' : 's are'} still pending.{' '}
                <Link to="/account/payments" className="text-accent light:text-accent-light no-underline hover:underline">
                  View payments
                </Link>
              </p>
            )}

            <div>
              <DashboardTabs tabs={TAB_LABELS} active={tab} onChange={setTab} />

              {showSpinner && tab !== 'profile' && (
                <div className="flex justify-center py-10">
                  <Loader className="w-8 h-8 animate-spin text-accent light:text-accent-light" />
                </div>
              )}

              {!showSpinner && tab === 'upcoming' && (
                <div className="space-y-3">
                  {upcomingTickets.length === 0 ? (
                    <EmptyState message="You have no upcoming events." to="/events" cta="Browse events" />
                  ) : (
                    upcomingTickets.map((t) => <TicketRow key={t.id} ticket={t} />)
                  )}
                </div>
              )}

              {!showSpinner && tab === 'tickets' && tickets && (
                <div className="space-y-3">
                  {tickets.length === 0 ? (
                    <EmptyState message="No tickets yet." to="/events" cta="Browse events" />
                  ) : (
                    tickets.map((t) => <TicketRow key={t.id} ticket={t} />)
                  )}
                </div>
              )}

              {!showSpinner && tab === 'medals' && medals && (
                <div className="space-y-3">
                  {medals.length === 0 ? (
                    <EmptyState message="No medal challenges yet." to="/medals" cta="See medal challenges" />
                  ) : (
                    medals.map((m) => (
                      <div key={m.id} className={`${cardSurface} p-4 flex flex-wrap justify-between gap-3 items-center`}>
                        <div>
                          <p className="font-barlow-condensed font-bold text-lg">{m.tier_name}</p>
                          <p className="text-sm text-fog light:text-fog-light">
                            {m.distance_km} km · {formatDate(m.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bebas text-xl text-accent light:text-accent-light">{formatKes(m.price)}</p>
                          <StatusBadge status={m.payment_status} />
                        </div>
                      </div>
                    ))
                  )}
                  <Link to="/account/medals" className="inline-block text-sm text-accent light:text-accent-light no-underline hover:underline">
                    Manage medals
                  </Link>
                </div>
              )}

              {!showSpinner && tab === 'payments' && payments && (
                <div className="space-y-3">
                  {payments.length === 0 ? (
                    <EmptyState message="You have not made any payments yet." />
                  ) : (
                    payments.map((p) => (
                      <div key={`${p.type}-${p.id}`} className={`${cardSurface} p-4 flex flex-wrap justify-between gap-3 items-center`}>
                        <div>
                          <p className="font-barlow-condensed font-bold text-lg">{PAYMENT_TYPE_LABELS[p.type] ?? p.type}</p>
                          <p className="text-sm text-fog light:text-fog-light">
                            {formatDate(p.created_at)}
                            {p.mpesa_receipt ? ` · ${p.mpesa_receipt}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bebas text-xl text-accent light:text-accent-light">
                            {p.amount != null ? formatKes(p.amount) : '—'}
                          </p>
                          <StatusBadge status={p.payment_status} />
                        </div>
                      </div>
                    ))
                  )}
                  <Link to="/account/payments" className="inline-block text-sm text-accent light:text-accent-light no-underline hover:underline">
                    Receipts and CSV export
                  </Link>
                </div>
              )}

              {tab === 'profile' && <ProfileForm profile={data.profile} onSaved={updateProfile} notify={notify} />}
            </div>
          </>
        )}
      </div>

      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  )
}
