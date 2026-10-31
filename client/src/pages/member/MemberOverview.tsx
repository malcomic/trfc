import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, Loader } from 'lucide-react'
import type { Event } from '../../types'
import { getEvents } from '../../api/events'
import { DASHBOARD_COPY } from '../../content/dashboard'
import { nairobiToday } from '../../utils/calendarGrid'
import { useMemberDashboard } from '../../context/MemberDashboardContext'
import WalletCard from '../../components/wallet/WalletCard'
import { isUpcoming } from '../../components/member/TicketRow'
import DashboardGreeting from '../../components/member/dashboard/DashboardGreeting'
import DashboardStats from '../../components/member/dashboard/DashboardStats'
import ProgramProgressCard from '../../components/member/dashboard/ProgramProgressCard'
import TicketsSummaryCard from '../../components/member/dashboard/TicketsSummaryCard'
import ComingUpList, { upcomingEvents } from '../../components/member/dashboard/ComingUpList'
import ExploreBanner from '../../components/member/dashboard/ExploreBanner'
import {
  BecomeMemberCard,
  MemberPerksCard,
  MemberPriceCard,
  PointsCard,
} from '../../components/member/dashboard/MembershipCards'
import { legacyTabPath } from '../../utils/legacyTabs'

export default function MemberOverview() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { data, loading, error, tickets, wallet, ticketValue, payable, openPayEvents, isMember } = useMemberDashboard()
  const [events, setEvents] = useState<Event[] | null>(null)

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (!tab) return
    navigate(legacyTabPath(tab) ?? '/dashboard', { replace: true, state: location.state })
  }, [searchParams, navigate, location.state])

  useEffect(() => {
    let cancelled = false
    getEvents()
      .then((list: Event[]) => {
        if (!cancelled) setEvents(upcomingEvents(Array.isArray(list) ? list : [], nairobiToday()))
      })
      .catch(() => {
        if (!cancelled) setEvents([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const upcomingTickets = useMemo(
    () =>
      tickets === null
        ? null
        : tickets
            .filter((t) => (t.payment_status === 'paid' || t.payment_status === 'reserved') && isUpcoming(t))
            .sort((a, b) => new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime()),
    [tickets]
  )
  const nextTicket = upcomingTickets?.find((t) => t.payment_status === 'paid')
  const bookedEventIds = useMemo(() => new Set((upcomingTickets ?? []).map((t) => t.event_id)), [upcomingTickets])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader className="w-10 h-10 animate-spin text-cta" />
      </div>
    )
  }
  if (error || !data) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 p-4 flex gap-3 text-red-300 text-sm">
        <AlertCircle size={18} /> {error || 'Could not load your dashboard.'}
      </div>
    )
  }

  const statsCopy = DASHBOARD_COPY.stats

  return (
    <>
      <DashboardGreeting name={data.profile.name} membership={data.membership} />

      <div className="space-y-6">
        <div>
          <DashboardStats data={data} nextTicket={nextTicket} nextEvent={events?.[0]} isMember={isMember} />
          {data.stats.pending_payments > 0 && (
            <p className="text-sm text-fog light:text-fog-light mt-3">
              {statsCopy.pendingPayments(data.stats.pending_payments)}{' '}
              <Link to="/dashboard/payments" className="font-semibold text-chalk light:text-chalk-light underline underline-offset-4">
                {statsCopy.viewPayments}
              </Link>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ProgramProgressCard programId={data.program?.id ?? null} />
            <TicketsSummaryCard tickets={upcomingTickets} />
            <ComingUpList events={events} bookedEventIds={bookedEventIds} />
          </div>
          <div className="space-y-6">
            <WalletCard
              ticketValue={ticketValue}
              upcoming={wallet?.upcoming ?? 0}
              credits={wallet?.credits ?? []}
              creditDays={wallet?.creditDays ?? 60}
              payableCount={payable.length}
              onPayEvents={openPayEvents}
            />
            {isMember ? (
              <>
                <MemberPriceCard />
                <PointsCard />
              </>
            ) : (
              <BecomeMemberCard />
            )}
          </div>
        </div>

        {isMember && <MemberPerksCard />}
        <ExploreBanner />
      </div>
    </>
  )
}
