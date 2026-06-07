import { Event } from '../types'
import { MapPin, Clock, Users, ChevronRight } from 'lucide-react'
import { getSafeImageUrl } from '../utils/imageUrl'

const EVENT_IMAGE_FALLBACK =
  'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=600&q=80'

function formatDate(dateStr?: string) {
  if (!dateStr) return { day: null, mon: null }
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return { day: null, mon: null }
  return {
    day: d.getDate().toString().padStart(2, '0'),
    mon: d.toLocaleString('en-KE', { month: 'short' }).toUpperCase(),
  }
}

export default function EventCard({ event }: { event: Event }) {
  const ev = event as any
  const { day, mon } = formatDate(ev.date || ev.start_date || ev.event_date)
  const isFree = !ev.price || Number(ev.price) === 0
  const slots = ev.capacity ? Math.max(0, ev.capacity - (ev.registered_count || 0)) : null
  const slotsPercent = ev.capacity ? Math.min(100, ((ev.registered_count || 0) / ev.capacity) * 100) : 0
  const slotsUrgent = slots !== null && slots <= 10
  const imageSrc = getSafeImageUrl(ev.image_url, EVENT_IMAGE_FALLBACK)

  return (
    <div className="bg-ash dark:bg-ash relative overflow-hidden flex flex-col h-full font-barlow">
      {/* Image */}
      <div className="relative overflow-hidden h-56 bg-smoke dark:bg-smoke flex-shrink-0">
        {imageSrc ? (
          <>
            <img
              src={imageSrc}
              alt={ev.title}
              className="w-full h-full object-cover brightness-75 saturate-[0.85] transition-all duration-500 ease-out group-hover:scale-[1.06] group-hover:brightness-90 group-hover:saturate-100"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent pointer-events-none" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-smoke dark:bg-smoke font-bebas text-5xl text-fire/10 letter-spacing-wider select-none">TRFC</div>
        )}

        {/* Date badge */}
        {day && (
          <div className="absolute top-3 left-3 bg-night/85 backdrop-blur-sm border border-white/10 p-2 text-center min-w-12 clip-angled-sm z-10">
            <span className="font-bebas text-2xl text-fire leading-none block">{day}</span>
            <span className="font-barlow-condensed font-bold text-xs letter-spacing-wider text-fog leading-none block mt-0.5">{mon}</span>
          </div>
        )}

        {/* Tag or Free badge */}
        {isFree ? (
          <span className="absolute top-3 right-3 font-bebas text-sm letter-spacing-wider px-2.5 py-1 bg-success text-white z-10">FREE</span>
        ) : ev.category ? (
          <span className="absolute top-3 right-3 font-barlow-condensed font-black text-xs letter-spacing-wider text-transform-uppercase px-2 py-1 bg-fire text-white z-10">{ev.category}</span>
        ) : null}
      </div>

      {/* Body */}
      <div className="px-4.5 pt-4.5 pb-5 flex flex-col flex-1 gap-0 border-t border-white/5">
        <h3 className="font-barlow-condensed font-bold text-lg letter-spacing-wide text-chalk leading-tight mb-2.5">{ev.title}</h3>

        <div className="flex flex-col gap-1.5 mb-3.5">
          {ev.location && (
            <div className="flex items-center gap-1.75 text-sm text-fog font-barlow leading-none">
              <MapPin size={11} className="text-fire flex-shrink-0" />
              <span>{ev.location}</span>
            </div>
          )}
          {(ev.time || ev.start_time) && (
            <div className="flex items-center gap-1.75 text-sm text-fog font-barlow leading-none">
              <Clock size={11} className="text-fire flex-shrink-0" />
              <span>{ev.time || ev.start_time}</span>
            </div>
          )}
          {ev.capacity && (
            <div className="flex items-center gap-1.75 text-sm text-fog font-barlow leading-none">
              <Users size={11} className="text-fire flex-shrink-0" />
              <span>{ev.registered_count || 0} / {ev.capacity} registered</span>
            </div>
          )}
        </div>

        {/* Description */}
        {ev.description && (
          <p className="text-sm text-chalk/45 leading-relaxed mb-4 line-clamp-2">{ev.description}</p>
        )}

        {/* Slots bar */}
        {slots !== null && (
          <div className="flex items-center gap-1.5 font-barlow-condensed font-bold text-xs letter-spacing-wider text-transform-uppercase mb-3">
            <div className="flex-1 h-0.75 bg-mist overflow-hidden max-w-20">
              <div className="h-full bg-fire transition-all duration-400 ease" style={{ width: `${slotsPercent}%` }} />
            </div>
            <span className={`${slotsUrgent ? 'text-fire' : 'text-fog'}`}>
              {slots === 0 ? 'Full' : `${slots} slot${slots !== 1 ? 's' : ''} left`}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3.5 border-t border-white/5 mt-auto">
          <div>
            <div className="font-bebas text-2xl text-fire letter-spacing-wider leading-none">
              {isFree ? 'FREE' : `KES ${Number(ev.price).toLocaleString()}`}
            </div>
            <div className="font-barlow-condensed text-xs letter-spacing-wider text-transform-uppercase text-fog mt-0.5">Entry Fee</div>
          </div>
          <div className="flex items-center gap-1.25 font-barlow-condensed font-bold text-xs letter-spacing-wider text-transform-uppercase text-fire border border-fire/25 px-3 py-1.75 clip-angled-sm transition-all duration-200 bg-fire/5 hover:bg-fire hover:text-white cursor-pointer">
            Register <ChevronRight size={12} />
          </div>
        </div>
      </div>
    </div>
  )
}
