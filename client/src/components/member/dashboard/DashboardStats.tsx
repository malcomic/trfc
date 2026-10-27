import { Link } from 'react-router-dom'
import type { MemberDashboard } from '../../../api/users'
import type { Event } from '../../../types'
import type { MemberTicket } from '../../../context/MemberDashboardContext'
import { DASHBOARD_COPY } from '../../../content/dashboard'
import { PROGRAMS, programWeek } from '../../../content/programs'
import { nairobiToday } from '../../../utils/calendarGrid'
import { formatEventDate } from '../../../utils/eventDate'
import { dashCard, dashLink, dashMuted } from './ui'

const copy = DASHBOARD_COPY.stats

interface StatCardProps {
  label: string
  value: string
  note?: string
  to?: string
}

function StatCard({ label, value, note, to }: StatCardProps) {
  return (
    <div className={`${dashCard} !p-5 flex flex-col gap-2`}>
      <p className={dashMuted}>{label}</p>
      <p className="font-bebas text-3xl tracking-wide leading-none text-chalk light:text-chalk-light break-words">{value}</p>
      {note &&
        (to ? (
          <Link to={to} className={`${dashLink} text-sm`}>
            {note}
          </Link>
        ) : (
          <p className="text-xs text-fog light:text-fog-light">{note}</p>
        ))}
    </div>
  )
}

const shortDate = (value: string) => formatEventDate(value, { weekday: 'short', month: 'short', day: 'numeric' })

interface DashboardStatsProps {
  data: MemberDashboard
  nextTicket?: MemberTicket
  nextEvent?: Event
  isMember: boolean
}

export default function DashboardStats({ data, nextTicket, nextEvent, isMember }: DashboardStatsProps) {
  const program = data.program ? PROGRAMS[data.program.id] : null
  const week = program ? programWeek(program, nairobiToday()) : null

  const next = nextTicket?.event_date
    ? { value: nextTicket.event_title, note: shortDate(nextTicket.event_date) }
    : nextEvent
      ? { value: nextEvent.title || copy.nextEvent.fallback, note: shortDate(nextEvent.event_date) }
      : null

  return (
    <div className={`grid grid-cols-2 gap-4 ${isMember ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
      <StatCard label={copy.saturdays.label} value={String(data.stats.saturdays_attended)} note={copy.saturdays.note} />
      {program && week ? (
        <StatCard
          label={copy.program.label(program.name)}
          value={`Week ${week.week}`}
          note={DASHBOARD_COPY.program.weekOf(week.week, week.total)}
        />
      ) : (
        <StatCard label={copy.program.none} value="—" note={copy.program.noneNote} to="/programs" />
      )}
      {next ? (
        <StatCard label={copy.nextEvent.label} value={next.value} note={next.note} />
      ) : (
        <StatCard label={copy.nextEvent.label} value={copy.nextEvent.none} note={copy.nextEvent.noneNote} to="/dashboard/calendar" />
      )}
      {data.captain ? (
        <StatCard label={copy.captain.label} value={data.captain.name} note={data.captain.zone} to="/dashboard/zone" />
      ) : (
        <StatCard label={copy.captain.label} value={copy.captain.none} note={copy.captain.noneNote} to="/dashboard/profile" />
      )}
      {isMember && <StatCard label={copy.points.label} value={copy.points.value} note={copy.points.note} />}
    </div>
  )
}
