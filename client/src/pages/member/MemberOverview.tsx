import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import AnswersPromptCard from '../../components/member/dashboard/AnswersPromptCard'
import MemberPassCard from '../../components/member/dashboard/MemberPassCard'
import {
  BecomeMemberCard,
  MemberPerksCard,
  MemberPriceCard,
  PointsCard,
} from '../../components/member/dashboard/MembershipCards'
import WelcomeVideoModal from '../../components/member/dashboard/WelcomeVideoModal'
import ImportantAnnouncementBanner from '../../components/member/dashboard/ImportantAnnouncementBanner'
import { legacyTabPath } from '../../utils/legacyTabs'
import { getPageVideos, type PageVideo } from '../../api/pageVideos'
import { markWelcomeVideoWatched, recordWelcomeVideoShown } from '../../api/welcomeVideo'

export default function MemberOverview() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { data, loading, error, tickets, wallet, ticketValue, payable, openPayEvents, isMember, cancelTicket } =
    useMemberDashboard()
  const [events, setEvents] = useState<Event[] | null>(null)
  const [welcomeVideo, setWelcomeVideo] = useState<PageVideo | null>(null)
  const [openVideo, setOpenVideo] = useState<PageVideo | null>(null)
  const welcomeRequested = useRef(false)
  // The dashboard provider clears location.state right after mount, so read it on the first render.
  const arrivedWithNotice = useRef(
    Boolean(
      (location.state as { notice?: string; joined?: string } | null)?.notice ||
        (location.state as { notice?: string; joined?: string } | null)?.joined ||
        searchParams.get('tab')
    )
  )

  useEffect(() => {
    getPageVideos('dashboard')
      .then((videos) => setWelcomeVideo(videos.dashboard_welcome ?? null))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!data || welcomeRequested.current || arrivedWithNotice.current) return
    welcomeRequested.current = true
    recordWelcomeVideoShown()
      .then((result) => {
        if (result.show) setOpenVideo(result.video)
      })
      .catch(() => undefined)
  }, [data])

  const closeWelcomeVideo = useCallback(() => setOpenVideo(null), [])
  const welcomeWatched = useCallback(() => {
    markWelcomeVideoWatched().catch(() => undefined)
  }, [])

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
      <DashboardGreeting
        name={data.profile.name}
        membership={data.membership}
        onWatchWelcome={welcomeVideo ? () => setOpenVideo(welcomeVideo) : undefined}
      />
      <WelcomeVideoModal video={openVideo} onClose={closeWelcomeVideo} onWatched={welcomeWatched} />

      <div className="space-y-6">
        <ImportantAnnouncementBanner />
        <AnswersPromptCard />
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
            <ProgramProgressCard />
            <TicketsSummaryCard tickets={upcomingTickets} onCancel={cancelTicket} />
            <ComingUpList events={events} bookedEventIds={bookedEventIds} />
          </div>
          <div className="space-y-6">
            <MemberPassCard userId={data.profile.id} />
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
