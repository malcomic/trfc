import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  Award,
  CalendarDays,
  CalendarClock,
  Loader,
  MapPin,
  Package,
  Ticket,
  Truck,
  Wallet,
  WalletCards,
} from 'lucide-react'
import { pageRoot, cardSurface } from '../utils/themeClasses'
import {
  getMyCalendar,
  getMyDashboard,
  type CalendarEvent,
  type CalendarResponse,
  type MemberDashboard as MemberDashboardData,
  type MemberProfile,
} from '../api/users'
import { getUserTickets } from '../api/events'
import { getUserMedalPurchases, type UserMedalPurchase } from '../api/medals'
import { getPaymentHistory, paymentTypeLabel, type PaymentHistoryItem } from '../api/payments'
import {
  getPayableBatches,
  getPlans,
  getWallet,
  type PayableBatch,
  type PaymentPlan,
  type WalletSummary,
} from '../api/wallet'
import { formatEventDate } from '../utils/eventDate'
import { formatDate, formatKes } from '../utils/captainDisplay'
import StatTile from '../components/dashboard/StatTile'
import DashboardTabs from '../components/dashboard/DashboardTabs'
import DashboardHeader from '../components/dashboard/DashboardHeader'
import ProfileForm from '../components/dashboard/ProfileForm'
import TicketDownloadButton from '../components/TicketDownloadButton'
import { ToastStack, type ToastMessage } from '../components/Toast'
import WalletCard from '../components/wallet/WalletCard'
import WalletLedger from '../components/wallet/WalletLedger'
import TopUpModal from '../components/wallet/TopUpModal'
import PayEventsModal from '../components/wallet/PayEventsModal'
import InstallmentPlanCard from '../components/wallet/InstallmentPlanCard'
import CancelTicketDialog from '../components/wallet/CancelTicketDialog'
import EventCalendar from '../components/calendar/EventCalendar'
import { monthOfDay, monthRange, nairobiToday, shiftMonth } from '../utils/calendarGrid'

type Tab = 'upcoming' | 'calendar' | 'tickets' | 'wallet' | 'medals' | 'payments' | 'profile'

const TAB_LABELS: Record<Tab, string> = {
  upcoming: 'Upcoming',
  calendar: 'Calendar',
  tickets: 'All tickets',
  wallet: 'Wallet',
  medals: 'Medals',
  payments: 'Payments',
  profile: 'Profile',
}

const isTab = (value: string | null): value is Tab => !!value && value in TAB_LABELS

interface MemberTicket {
  id: string
  event_id: string
  event_title: string
  event_date: string | null
  location: string | null
  payment_status: string
  purchase_batch_id: string | null
  price: number | null
  ticket_type_name: string | null
  zone_name: string | null
  can_cancel?: boolean
  cancel_blocked_reason?: string | null
  cancel_credit_amount?: number
}

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-green-500/20 text-green-400',
  pending: 'bg-yellow-500/20 text-yellow-400',
  reserved: 'bg-blue-500/20 text-blue-300',
  failed: 'bg-red-500/20 text-red-400',
  cancelled: 'bg-white/5 text-fog line-through',
  going: 'bg-green-500/20 text-green-400',
  attended: 'bg-accent/20 text-accent light:bg-accent-light/20 light:text-accent-light',
  missed: 'bg-red-500/10 text-red-300',
}

function CalendarBadge({ event, onViewWallet }: { event: CalendarEvent; onViewWallet: () => void }) {
  switch (event.my_status) {
    case 'going':
      return <StatusBadge status="going" label={event.my_ticket_count > 1 ? `Going · ${event.my_ticket_count} tickets` : 'Going'} />
    case 'reserved':
      return (
        <button type="button" onClick={onViewWallet} className="hover:opacity-80" title="View your installment plan">
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

function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 text-xs font-bold uppercase ${STATUS_STYLES[status] ?? 'bg-white/5 text-fog'}`}>
      {label ?? status}
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

interface TicketRowProps {
  ticket: MemberTicket
  plan?: PaymentPlan
  onCancel: (ticket: MemberTicket) => void
  onViewPlan: () => void
}

function TicketRow({ ticket, plan, onCancel, onViewPlan }: TicketRowProps) {
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
          <button
            type="button"
            onClick={() => onCancel(ticket)}
            className="text-xs text-red-400 hover:underline"
          >
            Cancel ticket
          </button>
        )}
      </div>
    </div>
  )
}

export default function MemberDashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const initialTab = searchParams.get('tab')

  const [data, setData] = useState<MemberDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTabState] = useState<Tab>(isTab(initialTab) ? initialTab : 'upcoming')
  const [tabLoading, setTabLoading] = useState(false)

  const [tickets, setTickets] = useState<MemberTicket[] | null>(null)
  const [medals, setMedals] = useState<UserMedalPurchase[] | null>(null)
  const [payments, setPayments] = useState<PaymentHistoryItem[] | null>(null)
  const [wallet, setWallet] = useState<WalletSummary | null>(null)
  const [plans, setPlans] = useState<PaymentPlan[]>([])
  const [payable, setPayable] = useState<PayableBatch[]>([])
  const [ledgerKey, setLedgerKey] = useState(0)

  const [topUpAmount, setTopUpAmount] = useState<number | undefined>(undefined)
  const [topUpOpen, setTopUpOpen] = useState(false)
  const [payEventsOpen, setPayEventsOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<MemberTicket | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const [calendarMonth, setCalendarMonth] = useState(() => monthOfDay(nairobiToday()))
  const [calendar, setCalendar] = useState<CalendarResponse | null>(null)
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [calendarVersion, setCalendarVersion] = useState(0)
  const calendarCache = useRef(new Map<string, CalendarResponse>())

  const notify = useCallback((type: ToastMessage['type'], title: string, message?: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, type, title, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000)
  }, [])

  const setTab = (next: Tab) => {
    setTabState(next)
    setSearchParams(next === 'upcoming' ? {} : { tab: next }, { replace: true })
  }

  const loadTickets = useCallback(() => getUserTickets().then(setTickets).catch(() => setTickets([])), [])

  const loadWallet = useCallback(async () => {
    const [w, p, b] = await Promise.all([
      getWallet().catch(() => null),
      getPlans().catch(() => [] as PaymentPlan[]),
      getPayableBatches().catch(() => [] as PayableBatch[]),
    ])
    if (w) setWallet(w)
    setPlans(p)
    setPayable(b)
    setLedgerKey((k) => k + 1)
    if (w) setData((d) => (d ? { ...d, stats: { ...d.stats, wallet_balance: w.balance } } : d))
  }, [])

  const fetchCalendarMonth = useCallback(async (month: string) => {
    const cached = calendarCache.current.get(month)
    if (cached) return cached
    const { from, to } = monthRange(month)
    const result = await getMyCalendar(from, to)
    calendarCache.current.set(month, result)
    return result
  }, [])

  const refreshAll = useCallback(() => {
    getMyDashboard().then(setData).catch(() => undefined)
    loadTickets()
    loadWallet()
    setPayments(null)
    calendarCache.current.clear()
    setCalendarVersion((v) => v + 1)
  }, [loadTickets, loadWallet])

  useEffect(() => {
    if (tab !== 'calendar') return
    let cancelled = false
    setCalendarLoading(true)
    fetchCalendarMonth(calendarMonth)
      .then((result) => {
        if (!cancelled) setCalendar(result)
      })
      .catch((err: any) => {
        if (!cancelled) notify('error', 'Calendar', err.response?.data?.error || 'Failed to load events for this month')
      })
      .finally(() => {
        if (!cancelled) setCalendarLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tab, calendarMonth, calendarVersion, fetchCalendarMonth, notify])

  const calendarToday = calendar?.today ?? nairobiToday()
  const latestMonth = calendar?.latest ? monthOfDay(calendar.latest) : null
  const minCalendarMonth = calendar?.earliest ? monthOfDay(calendar.earliest) : null

  const jumpToNextEvent = async () => {
    if (!latestMonth) return
    setCalendarLoading(true)
    try {
      for (let m = shiftMonth(calendarMonth, 1); m <= latestMonth; m = shiftMonth(m, 1)) {
        const result = await fetchCalendarMonth(m)
        if (result.events.length > 0) {
          setCalendarMonth(m)
          return
        }
      }
      notify('info', 'Calendar', 'There are no later events yet.')
    } catch {
      notify('error', 'Calendar', 'Failed to look ahead for events')
    } finally {
      setCalendarLoading(false)
    }
  }

  useEffect(() => {
    getMyDashboard()
      .then(setData)
      .catch((err: any) => setError(err.response?.data?.error || 'Failed to load your dashboard'))
      .finally(() => setLoading(false))
    loadTickets()
    loadWallet()
  }, [loadTickets, loadWallet])

  useEffect(() => {
    const notice = (location.state as { notice?: string } | null)?.notice
    if (!notice) return
    notify('error', 'Installment plan', notice)
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [location, navigate, notify])

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

  const plansByBatch = useMemo(() => new Map(plans.map((p) => [p.purchase_batch_id, p])), [plans])

  const upcomingTickets = useMemo(
    () =>
      (tickets ?? [])
        .filter((t) => (t.payment_status === 'paid' || t.payment_status === 'reserved') && isUpcoming(t))
        .sort((a, b) => new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime()),
    [tickets]
  )
  const nextTicket = upcomingTickets.find((t) => t.payment_status === 'paid')

  const ticketsLoading = (tab === 'upcoming' || tab === 'tickets') && tickets === null
  const walletLoading = tab === 'wallet' && wallet === null
  const showSpinner = tabLoading || ticketsLoading || walletLoading
  const balance = wallet?.balance ?? data?.stats.wallet_balance ?? 0

  const updateProfile = (profile: MemberProfile) => setData((d) => (d ? { ...d, profile } : d))

  const openTopUp = (amount?: number) => {
    setTopUpAmount(amount)
    setPayEventsOpen(false)
    setTopUpOpen(true)
  }

  const renderTicket = (t: MemberTicket) => (
    <TicketRow
      key={t.id}
      ticket={t}
      plan={t.purchase_batch_id ? plansByBatch.get(t.purchase_batch_id) : undefined}
      onCancel={setCancelTarget}
      onViewPlan={() => setTab('wallet')}
    />
  )

  const activePlans = plans.filter((p) => p.status === 'active')
  const pastPlans = plans.filter((p) => p.status !== 'active')

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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
              <WalletCard
                balance={balance}
                payableCount={payable.length}
                onTopUp={() => openTopUp()}
                onPayEvents={() => setPayEventsOpen(true)}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatTile label="Upcoming events" value={data.stats.upcoming_events} icon={CalendarDays} />
              <StatTile label="Tickets" value={data.stats.tickets} icon={Ticket} />
              <StatTile label="Wallet balance" value={formatKes(balance)} icon={WalletCards} />
              <StatTile label="Installment plans" value={data.stats.active_plans} icon={CalendarClock} />
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
                    upcomingTickets.map(renderTicket)
                  )}
                </div>
              )}

              {tab === 'calendar' && (
                <EventCalendar
                  events={calendar && calendar.from === monthRange(calendarMonth).from ? calendar.events : []}
                  month={calendarMonth}
                  today={calendarToday}
                  onMonthChange={setCalendarMonth}
                  minMonth={minCalendarMonth}
                  loading={calendarLoading}
                  onJumpToNext={latestMonth && latestMonth > calendarMonth ? jumpToNextEvent : undefined}
                  renderBadge={(event) => <CalendarBadge event={event} onViewWallet={() => setTab('wallet')} />}
                  renderActions={(event) => {
                    if (event.my_status === 'none') {
                      if (event.is_past || event.sold_out) return null
                      return (
                        <Link
                          to={`/events/${event.id}/checkout`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-accent light:bg-accent-light text-black light:text-white font-barlow-condensed font-bold text-xs tracking-widest uppercase no-underline"
                        >
                          Get tickets <ArrowRight size={12} />
                        </Link>
                      )
                    }
                    if (event.my_status === 'missed') return null
                    return (
                      <button
                        type="button"
                        onClick={() => setTab('tickets')}
                        className="text-xs text-accent light:text-accent-light hover:underline"
                      >
                        View ticket
                      </button>
                    )
                  }}
                />
              )}

              {!showSpinner && tab === 'tickets' && tickets && (
                <div className="space-y-3">
                  {tickets.length === 0 ? (
                    <EmptyState message="No tickets yet." to="/events" cta="Browse events" />
                  ) : (
                    tickets.map(renderTicket)
                  )}
                  <p className="text-xs text-fog light:text-fog-light">
                    Paid tickets can be cancelled up to 7 days before the event, once per calendar month. There's no
                    refund: the ticket value goes to your wallet for future events.
                  </p>
                </div>
              )}

              {!showSpinner && tab === 'wallet' && wallet && (
                <div className="space-y-8">
                  <section className="space-y-3">
                    <h3 className="font-barlow-condensed font-bold text-sm tracking-widest uppercase text-accent light:text-accent-light">
                      Installment plans
                    </h3>
                    {activePlans.length === 0 ? (
                      <p className="text-sm text-fog light:text-fog-light">
                        No active plans. Events that allow it can be paid in 2 or 3 installments at checkout.
                      </p>
                    ) : (
                      activePlans.map((plan) => (
                        <InstallmentPlanCard
                          key={plan.id}
                          plan={plan}
                          balance={balance}
                          onChanged={refreshAll}
                          onNeedTopUp={openTopUp}
                          notify={notify}
                        />
                      ))
                    )}
                    {pastPlans.length > 0 && (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-fog light:text-fog-light">
                          Past plans ({pastPlans.length})
                        </summary>
                        <div className="space-y-3 mt-3">
                          {pastPlans.map((plan) => (
                            <InstallmentPlanCard
                              key={plan.id}
                              plan={plan}
                              balance={balance}
                              onChanged={refreshAll}
                              onNeedTopUp={openTopUp}
                              notify={notify}
                            />
                          ))}
                        </div>
                      </details>
                    )}
                  </section>

                  <section className="space-y-3">
                    <h3 className="font-barlow-condensed font-bold text-sm tracking-widest uppercase text-accent light:text-accent-light">
                      Wallet activity
                    </h3>
                    <WalletLedger key={ledgerKey} initial={wallet.transactions} />
                  </section>
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
                          <p className="font-barlow-condensed font-bold text-lg">{paymentTypeLabel(p)}</p>
                          <p className="text-sm text-fog light:text-fog-light">
                            {formatDate(p.created_at)}
                            {p.note ? ` · ${p.note}` : ''}
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

      <TopUpModal
        isOpen={topUpOpen}
        defaultAmount={topUpAmount}
        onClose={() => setTopUpOpen(false)}
        onSuccess={(amount) => {
          notify('success', 'Wallet topped up', `${formatKes(amount)} added to your wallet.`)
          loadWallet()
        }}
      />
      <PayEventsModal
        isOpen={payEventsOpen}
        onClose={() => setPayEventsOpen(false)}
        batches={payable}
        balance={balance}
        onNeedTopUp={openTopUp}
        onPaid={(result) => {
          setPayEventsOpen(false)
          notify(
            'success',
            'Tickets paid',
            `${formatKes(result.total)} paid from your wallet. Your tickets have been emailed to you.`
          )
          refreshAll()
        }}
      />
      <CancelTicketDialog
        ticket={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onCancelled={(result) => {
          setCancelTarget(null)
          notify(
            'success',
            'Ticket cancelled',
            result.credited > 0 ? `${formatKes(result.credited)} added to your wallet.` : undefined
          )
          refreshAll()
        }}
      />
      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  )
}
