import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getEvents } from '../api/events'
import { AlertCircle, ChevronRight, Search, X, MapPin } from 'lucide-react'
import { Event } from '../types'
import { pageRoot, inputField } from '../utils/themeClasses'
import { getSafeImageUrl } from '../utils/imageUrl'

const EVENT_IMAGE_FALLBACK =
  'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&q=80'

const FILTERS = ['All', 'Race', 'Training', 'Social', 'Charity']

function formatDate(dateStr?: string) {
  if (!dateStr) return { day: '—', mon: '———' }
  const d = new Date(dateStr)
  return {
    day: d.getDate().toString().padStart(2, '0'),
    mon: d.toLocaleString('en-KE', { month: 'short' }).toUpperCase(),
  }
}

export default function Events() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')

  useEffect(() => { fetchEvents() }, [])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const data = await getEvents()
      setEvents(data)
    } catch (err) {
      setError('Failed to load events. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = events.filter((e) => {
    const matchSearch =
      !search ||
      e.title?.toLowerCase().includes(search.toLowerCase()) ||
      e.location?.toLowerCase().includes(search.toLowerCase())
    const category = (e as any).category || ''
    const matchFilter =
      activeFilter === 'All' ||
      category.toLowerCase() === activeFilter.toLowerCase()
    return matchSearch && matchFilter
  })

  return (
    <div className={pageRoot}>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] py-16 md:py-20">
        <div className="absolute left-0 top-0 bottom-0 w-0.75 bg-gradient-to-b from-transparent via-fire to-transparent opacity-70" />
        <div className="absolute right-[-1%] bottom-[-20px] font-bebas text-clamp-3xl text-fire/5 leading-none pointer-events-none select-none letter-spacing-tighter">
          {loading ? '00' : String(events.length).padStart(2, '0')}
        </div>
        <div className="max-w-5xl mx-auto relative z-1">
          <div className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire flex items-center gap-2 mb-3.5 before:w-5 before:h-0.5 before:bg-fire">On The Calendar</div>
          <h1 className="font-bebas text-clamp-lg leading-tight text-chalk light:text-chalk-light mb-6 letter-spacing-tighter">
            UPCOMING<br /><span className="text-transparent" style={{ WebkitTextStroke: '2px #FF4500' }}>EVENTS</span>
          </h1>
          <div className="flex items-center gap-7 flex-wrap">
            <div className="flex items-baseline gap-1.5">
              <span className="font-bebas text-4xl text-fire leading-none">
                {loading ? '—' : events.length}
              </span>
              <span className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog light:text-fog-light">Events Scheduled</span>
            </div>
            <div className="w-px h-7 bg-white/10 light:bg-black/10" />
            <div className="flex items-baseline gap-1.5">
              <span className="font-bebas text-4xl text-fire leading-none">NBI</span>
              <span className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog light:text-fog-light">Nairobi & Beyond</span>
            </div>
            <div className="w-px h-7 bg-white/10 light:bg-black/10" />
            <div className="flex items-baseline gap-1.5">
              <span className="font-bebas text-4xl text-fire leading-none">FREE</span>
              <span className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog light:text-fog-light">To Register</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Toolbar ── */}
      <div className="bg-ash light:bg-ash-light border-b border-white/5 light:border-black/8 px-[6%] py-5">
        <div className="max-w-5xl mx-auto flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-52 max-w-sm">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fog pointer-events-none transition-colors duration-200"><Search size={14} /></span>
            <input
              className={`w-full ${inputField} font-barlow text-sm px-3.5 py-2.5 pl-10 clip-angled-sm transition-colors duration-200 focus:border-fire/40`}
              type="text"
              placeholder="Search events or locations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="absolute right-3 top-1/2 -translate-y-1/2 bg-none border-0 text-fog light:text-fog-light cursor-pointer p-0.5 flex transition-colors duration-200 hover:text-chalk light:hover:text-chalk-light" onClick={() => setSearch('')}>
                <X size={13} />
              </button>
            )}
          </div>

          {/* Category filters */}
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase px-4.5 py-2 transition-all duration-200 clip-angled-sm white-space-nowrap ${
                activeFilter === f
                  ? 'bg-fire text-white border border-fire'
                  : 'bg-smoke light:bg-smoke-light text-fog light:text-fog-light border border-white/10 light:border-black/10 hover:border-white/20 light:hover:border-black/20 hover:text-chalk light:hover:text-chalk-light'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-5xl mx-auto px-[6%] py-10 pb-20">

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 border-l-4 border-l-red-500 px-4 py-3.5 mb-8 text-sm text-red-600 dark:text-red-400">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.25" />
            <span>{error}</span>
          </div>
        )}

        {/* Skeleton loading */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0.5">
            {Array(6).fill(null).map((_, i) => (
              <div key={i} className="bg-ash light:bg-ash-light overflow-hidden">
                <div className="h-55 bg-smoke light:bg-smoke-light animate-pulse" style={{ animation: 'evtShimmer 1.5s ease infinite' }} />
                <div className="p-5 flex flex-col gap-2.5">
                  <div className="h-3 bg-smoke light:bg-smoke-light rounded animate-pulse" style={{ width: '70%' }} />
                  <div className="h-3 bg-smoke light:bg-smoke-light rounded animate-pulse" style={{ width: '45%' }} />
                  <div className="h-3 bg-smoke light:bg-smoke-light rounded animate-pulse" style={{ width: '55%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results label */}
        {!loading && !error && (
          <p className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog light:text-fog-light mb-6">
            Showing <span className="text-fire">{filtered.length}</span> of {events.length} event{events.length !== 1 ? 's' : ''}
            {search && <> matching "<span className="text-fire">{search}</span>"</>}
          </p>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-25">
            <div className="font-bebas text-clamp-2xl text-fire/10 leading-none mb-4 letter-spacing-tighter">NO<br />EVENTS</div>
            <p className="font-barlow-condensed font-bold text-xl letter-spacing-widest text-transform-uppercase text-fog light:text-fog-light mb-2">
              {search || activeFilter !== 'All' ? 'No matches found' : 'Nothing scheduled yet'}
            </p>
            <p className="text-sm text-mist light:text-mist-light">
              {search || activeFilter !== 'All'
                ? 'Try a different search or filter'
                : 'New events are added regularly — check back soon'}
            </p>
          </div>
        )}

        {/* Event grid */}
        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0.5">
            {filtered.map((event, idx) => {
              const { day, mon } = formatDate((event as any).event_date || (event as any).date || (event as any).start_date)
              const isFeatured = idx === 0

              return (
                <Link
                  to={`/events/${event.id}`}
                  key={event.id}
                  className={`block text-decoration-none bg-ash light:bg-ash-light relative overflow-hidden border border-transparent hover:border-fire/30 transition-all duration-250 hover:-translate-y-1 hover:z-10 ${isFeatured ? 'md:col-span-2 lg:col-span-2' : ''}`}
                >
                  {/* Image */}
                  <div className="relative overflow-hidden bg-smoke light:bg-smoke-light" style={{ height: isFeatured ? '320px' : '220px' }}>
                    <img
                      src={getSafeImageUrl((event as any).image_url, EVENT_IMAGE_FALLBACK)}
                      alt={event.title}
                      className="w-full h-full object-cover brightness-75 saturate-80 transition-all duration-500 ease-out group-hover:scale-107 group-hover:brightness-90 group-hover:saturate-100"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = EVENT_IMAGE_FALLBACK
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 h-3/5 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

                    {/* Date badge */}
                    <div className="absolute top-3.5 left-3.5 bg-night light:bg-night-light border border-white/10 light:border-black/10 px-3 py-2 text-center min-w-12 clip-angled-sm z-10">
                      <div className="font-bebas text-2xl text-fire leading-none">{day}</div>
                      <div className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fog light:text-fog-light mt-0.5">{mon}</div>
                    </div>

                    {/* Category tag */}
                    {(event as any).category && (
                      <span className="absolute top-3.5 right-3.5 font-barlow-condensed font-black text-xs letter-spacing-widest text-transform-uppercase px-2.5 py-1 bg-fire text-white z-10">
                        {(event as any).category}
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="px-5.5 py-5.5 border-t border-white/5 light:border-black/8 flex flex-col gap-3.5">
                    <h3 className="font-barlow-condensed font-bold text-lg letter-spacing-tighter text-chalk light:text-chalk-light leading-tight">{event.title}</h3>
                    {event.location && (
                      <div className="flex items-center gap-1.75 text-sm text-fog light:text-fog-light">
                        <MapPin size={11} className="text-fire flex-shrink-0" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    {event.description && (
                      <p className="text-sm text-chalk/45 light:text-chalk-light/45 leading-relaxed line-clamp-2">{event.description}</p>
                    )}

                    <div className="flex items-center justify-between pt-3.5 border-t border-white/5 light:border-black/8 mt-auto">
                      <div>
                        <div className="font-bebas text-3xl text-fire leading-none">
                          {(event as any).price === 0 || !(event as any).price
                            ? 'FREE'
                            : `KES ${Number((event as any).price).toLocaleString()}`}
                        </div>
                        <div className="font-barlow-condensed text-xs letter-spacing-widest text-transform-uppercase text-fog light:text-fog-light mt-0.5">Entry Fee</div>
                      </div>
                      <div className="flex items-center gap-1.5 font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire transition-gap duration-200 group-hover:gap-2.5">
                        Register <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes evtShimmer {
          from { transform: translateX(-100%); }
          to   { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}
