import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { CalendarResponse } from '../../api/users'
import { useMemberDashboard } from '../../context/MemberDashboardContext'
import { monthOfDay, monthRange, nairobiToday, shiftMonth } from '../../utils/calendarGrid'
import EventCalendar from '../../components/calendar/EventCalendar'
import MemberPageHeader from '../../components/member/MemberPageHeader'
import CalendarBadge from '../../components/member/CalendarBadge'

export default function MemberCalendar() {
  const navigate = useNavigate()
  const { calendarMonth, setCalendarMonth, refreshKey, fetchCalendarMonth, notify } = useMemberDashboard()
  const [calendar, setCalendar] = useState<CalendarResponse | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchCalendarMonth(calendarMonth)
      .then((result) => {
        if (!cancelled) setCalendar(result)
      })
      .catch((err: any) => {
        if (!cancelled) notify('error', 'Calendar', err.response?.data?.error || 'Failed to load events for this month')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [calendarMonth, refreshKey, fetchCalendarMonth, notify])

  const today = calendar?.today ?? nairobiToday()
  const latestMonth = calendar?.latest ? monthOfDay(calendar.latest) : null
  const minMonth = calendar?.earliest ? monthOfDay(calendar.earliest) : null

  const jumpToNextEvent = async () => {
    if (!latestMonth) return
    setLoading(true)
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
      setLoading(false)
    }
  }

  return (
    <>
      <MemberPageHeader title="EVENT" highlight="CALENDAR" subtitle="Upcoming and past TRFC events, and where you stand on each." />
      <EventCalendar
        events={calendar && calendar.from === monthRange(calendarMonth).from ? calendar.events : []}
        month={calendarMonth}
        today={today}
        onMonthChange={setCalendarMonth}
        minMonth={minMonth}
        loading={loading}
        onJumpToNext={latestMonth && latestMonth > calendarMonth ? jumpToNextEvent : undefined}
        renderBadge={(event) => <CalendarBadge event={event} onViewWallet={() => navigate('/dashboard/wallet')} />}
        renderActions={(event) => {
          if (event.my_status === 'none') {
            if (event.is_past || event.sold_out) return null
            return (
              <Link
                to={`/events/${event.id}/checkout`}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-cta text-cta-ink font-barlow-condensed font-bold text-xs tracking-widest uppercase no-underline"
              >
                Get tickets <ArrowRight size={12} />
              </Link>
            )
          }
          if (event.my_status === 'missed') return null
          return (
            <Link to="/dashboard/tickets" className="text-xs text-accent light:text-accent-light no-underline hover:underline">
              View ticket
            </Link>
          )
        }}
      />
    </>
  )
}
