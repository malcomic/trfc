import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CalendarPlus, ChevronLeft, ChevronRight, LayoutGrid, List, Loader, MapPin } from 'lucide-react'
import Modal from '../ui/Modal'
import { cardSurface } from '../../utils/themeClasses'
import type { CalendarEvent } from '../../api/users'
import { formatEventTime } from '../../utils/eventDate'
import { downloadIcs, googleCalendarUrl } from '../../utils/calendar'
import {
  WEEKDAY_LABELS,
  buildMonthGrid,
  formatDayLabel,
  formatMonthLabel,
  groupByDay,
  monthOfDay,
  shiftMonth,
} from '../../utils/calendarGrid'

type View = 'month' | 'list'
type TimeFilter = 'all' | 'upcoming' | 'past'

const VIEW_STORAGE_KEY = 'trfc.calendarView'
const DESKTOP_QUERY = '(min-width: 768px)'
const MAX_CHIPS = 2

interface EventCalendarProps {
  events: CalendarEvent[]
  /** 'YYYY-MM' */
  month: string
  /** Nairobi date, 'YYYY-MM-DD' */
  today: string
  onMonthChange: (month: string) => void
  /** Earliest month the member can navigate back to. */
  minMonth?: string | null
  loading?: boolean
  /** Shown in the empty state when a later month has events. */
  onJumpToNext?: () => void
  renderBadge: (event: CalendarEvent) => ReactNode
  renderActions: (event: CalendarEvent) => ReactNode
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(DESKTOP_QUERY).matches : true
  )
  useEffect(() => {
    if (!window.matchMedia) return
    const media = window.matchMedia(DESKTOP_QUERY)
    const update = () => setIsDesktop(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return isDesktop
}

function readSavedView(): View | null {
  try {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY)
    return saved === 'month' || saved === 'list' ? saved : null
  } catch {
    return null
  }
}

function chipClass(event: CalendarEvent) {
  if (event.my_status === 'going' || event.my_status === 'attended') {
    return 'bg-accent light:bg-accent-light text-black light:text-white'
  }
  if (event.my_status === 'reserved') return 'bg-blue-500/25 text-blue-200 light:text-blue-800'
  if (event.my_status === 'pending') return 'bg-yellow-500/20 text-yellow-300 light:text-yellow-800'
  return 'bg-white/10 light:bg-black/10 text-chalk light:text-chalk-light'
}

function AddToCalendar({ event }: { event: CalendarEvent }) {
  const opts = { title: event.title, start: event.event_date, location: event.location }
  return (
    <div className="flex items-center gap-3 text-xs">
      <CalendarPlus size={14} className="text-fog light:text-fog-light" />
      <a
        href={googleCalendarUrl(opts)}
        target="_blank"
        rel="noreferrer"
        className="text-accent light:text-accent-light no-underline hover:underline"
      >
        Google
      </a>
      <button
        type="button"
        onClick={() => downloadIcs({ ...opts, filename: `${event.title.replace(/[^\w-]+/g, '-').toLowerCase()}.ics` })}
        className="text-accent light:text-accent-light hover:underline"
      >
        .ics file
      </button>
    </div>
  )
}

function EventRow({
  event,
  renderBadge,
  renderActions,
}: {
  event: CalendarEvent
  renderBadge: EventCalendarProps['renderBadge']
  renderActions: EventCalendarProps['renderActions']
}) {
  return (
    <div className={`${cardSurface} p-4 flex flex-wrap justify-between gap-3 items-start ${event.is_past ? 'opacity-80' : ''}`}>
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-barlow-condensed font-bold tracking-widest uppercase text-accent light:text-accent-light">
          {formatEventTime(event.event_date)}
        </p>
        <Link
          to={`/events/${event.id}`}
          className="block font-barlow-condensed font-bold text-lg text-chalk light:text-chalk-light no-underline hover:underline"
        >
          {event.title}
        </Link>
        {event.location && (
          <p className="text-sm text-fog light:text-fog-light inline-flex items-center gap-1">
            <MapPin size={12} /> {event.location}
          </p>
        )}
        {!event.is_past && <AddToCalendar event={event} />}
      </div>
      <div className="flex flex-col items-end gap-2">
        {renderBadge(event)}
        {renderActions(event)}
      </div>
    </div>
  )
}

export default function EventCalendar({
  events,
  month,
  today,
  onMonthChange,
  minMonth,
  loading,
  onJumpToNext,
  renderBadge,
  renderActions,
}: EventCalendarProps) {
  const isDesktop = useIsDesktop()
  const [savedView, setSavedView] = useState<View | null>(readSavedView)
  const view: View = savedView ?? (isDesktop ? 'month' : 'list')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [onlyMine, setOnlyMine] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  useEffect(() => setSelectedDay(null), [month])

  const chooseView = (next: View) => {
    setSavedView(next)
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next)
    } catch {
      // Storage can be unavailable in private mode; the choice still applies for this visit.
    }
  }

  const visible = useMemo(
    () =>
      events.filter((e) => {
        if (onlyMine && e.my_status === 'none') return false
        if (timeFilter === 'upcoming') return !e.is_past
        if (timeFilter === 'past') return e.is_past
        return true
      }),
    [events, onlyMine, timeFilter]
  )
  const byDay = useMemo(() => groupByDay(visible), [visible])
  const cells = useMemo(() => buildMonthGrid(month, today), [month, today])
  const dayKeys = useMemo(() => [...byDay.keys()].sort(), [byDay])

  const currentMonth = monthOfDay(today)
  const canGoBack = !minMonth || shiftMonth(month, -1) >= minMonth
  const selectedEvents = selectedDay ? byDay.get(selectedDay) ?? [] : []

  const dayPanel = selectedDay && (
    <div className="space-y-3">
      {selectedEvents.length === 0 ? (
        <p className="text-sm text-fog light:text-fog-light">No events on this day.</p>
      ) : (
        selectedEvents.map((e) => (
          <EventRow key={e.id} event={e} renderBadge={renderBadge} renderActions={renderActions} />
        ))
      )}
    </div>
  )

  const segment = (active: boolean) =>
    `px-3 py-1.5 text-xs font-barlow-condensed font-bold tracking-widest uppercase transition-colors ${
      active
        ? 'bg-accent light:bg-accent-light text-black light:text-white'
        : 'text-fog light:text-fog-light hover:text-chalk light:hover:text-chalk-light'
    }`

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onMonthChange(shiftMonth(month, -1))}
            disabled={!canGoBack}
            aria-label="Previous month"
            className="p-2 border border-white/10 light:border-black/10 disabled:opacity-30 hover:border-accent light:hover:border-accent-light"
          >
            <ChevronLeft size={16} />
          </button>
          <h3 className="font-barlow-condensed font-bold text-xl tracking-tight min-w-[10rem] text-center">
            {formatMonthLabel(month)}
          </h3>
          <button
            type="button"
            onClick={() => onMonthChange(shiftMonth(month, 1))}
            aria-label="Next month"
            className="p-2 border border-white/10 light:border-black/10 hover:border-accent light:hover:border-accent-light"
          >
            <ChevronRight size={16} />
          </button>
          {month !== currentMonth && (
            <button
              type="button"
              onClick={() => onMonthChange(currentMonth)}
              className="px-3 py-1.5 text-xs font-barlow-condensed font-bold tracking-widest uppercase border border-white/10 light:border-black/10 hover:border-accent light:hover:border-accent-light"
            >
              Today
            </button>
          )}
          {loading && <Loader size={16} className="animate-spin text-accent light:text-accent-light" />}
        </div>

        <div className="flex border border-white/10 light:border-black/10" role="group" aria-label="Calendar view">
          <button type="button" className={segment(view === 'month')} onClick={() => chooseView('month')}>
            <LayoutGrid size={12} className="inline mr-1 -mt-0.5" /> Month
          </button>
          <button type="button" className={segment(view === 'list')} onClick={() => chooseView('list')}>
            <List size={12} className="inline mr-1 -mt-0.5" /> List
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex border border-white/10 light:border-black/10" role="group" aria-label="Filter events">
          {(['all', 'upcoming', 'past'] as const).map((f) => (
            <button key={f} type="button" className={segment(timeFilter === f)} onClick={() => setTimeFilter(f)}>
              {f}
            </button>
          ))}
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-fog light:text-fog-light cursor-pointer">
          <input
            type="checkbox"
            checked={onlyMine}
            onChange={(e) => setOnlyMine(e.target.checked)}
            className="w-4 h-4"
          />
          Only my events
        </label>
      </div>

      {view === 'month' ? (
        <div className={`${cardSurface} p-2 sm:p-3`}>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAY_LABELS.map((d) => (
              <div
                key={d}
                className="text-center text-[10px] sm:text-xs font-barlow-condensed font-bold tracking-widest uppercase text-fog light:text-fog-light py-1"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell) => {
              const dayEvents = byDay.get(cell.day) ?? []
              const selected = cell.day === selectedDay
              return (
                <button
                  key={cell.day}
                  type="button"
                  onClick={() => setSelectedDay(selected ? null : cell.day)}
                  className={`min-h-[3.5rem] sm:min-h-[5.5rem] p-1 text-left align-top flex flex-col gap-1 border transition-colors ${
                    selected
                      ? 'border-accent light:border-accent-light'
                      : cell.isToday
                        ? 'border-accent/60 light:border-accent-light/60'
                        : 'border-transparent hover:border-white/10 light:hover:border-black/10'
                  } ${cell.inMonth ? '' : 'opacity-30'} ${cell.isPast && cell.inMonth ? 'opacity-60' : ''}`}
                >
                  <span
                    className={`text-xs font-bold ${
                      cell.isToday ? 'text-accent light:text-accent-light' : 'text-fog light:text-fog-light'
                    }`}
                  >
                    {cell.date}
                  </span>
                  {/* On phones there's no room for titles, so show dots instead. */}
                  <span className="flex flex-wrap gap-0.5 sm:hidden">
                    {dayEvents.slice(0, 3).map((e) => (
                      <span key={e.id} className={`w-1.5 h-1.5 rounded-full ${chipClass(e)}`} />
                    ))}
                  </span>
                  <span className="hidden sm:flex flex-col gap-0.5 w-full">
                    {dayEvents.slice(0, MAX_CHIPS).map((e) => (
                      <span key={e.id} className={`block truncate px-1 py-0.5 text-[11px] leading-tight ${chipClass(e)}`}>
                        {e.title}
                      </span>
                    ))}
                    {dayEvents.length > MAX_CHIPS && (
                      <span className="text-[11px] text-fog light:text-fog-light">+{dayEvents.length - MAX_CHIPS} more</span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {dayKeys.map((day) => (
            <section key={day} className="space-y-2">
              <h4
                className={`font-barlow-condensed font-bold text-sm tracking-widest uppercase ${
                  day === today ? 'text-accent light:text-accent-light' : 'text-fog light:text-fog-light'
                }`}
              >
                {formatDayLabel(day)}
                {day === today ? ' · Today' : ''}
              </h4>
              {byDay.get(day)!.map((e) => (
                <EventRow key={e.id} event={e} renderBadge={renderBadge} renderActions={renderActions} />
              ))}
            </section>
          ))}
        </div>
      )}

      {!loading && visible.length === 0 && (
        <div className="text-center py-8 text-fog light:text-fog-light space-y-2">
          <p>
            {events.length === 0
              ? `No events in ${formatMonthLabel(month)}.`
              : 'No events match these filters this month.'}
          </p>
          {onJumpToNext && (
            <button type="button" onClick={onJumpToNext} className="text-accent light:text-accent-light hover:underline">
              Jump to next event
            </button>
          )}
        </div>
      )}

      {view === 'month' && selectedDay && isDesktop && (
        <div className="space-y-3">
          <h4 className="font-barlow-condensed font-bold text-sm tracking-widest uppercase text-accent light:text-accent-light">
            {formatDayLabel(selectedDay)}
          </h4>
          {dayPanel}
        </div>
      )}
      <Modal
        isOpen={view === 'month' && !!selectedDay && !isDesktop}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? formatDayLabel(selectedDay) : undefined}
      >
        <div className="max-h-[60vh] overflow-y-auto">{dayPanel}</div>
      </Modal>
    </div>
  )
}