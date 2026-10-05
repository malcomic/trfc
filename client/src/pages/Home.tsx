import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Footprints, Flame, Timer, Mountain, Star, type LucideIcon } from 'lucide-react'
import { getEvents } from '../api/events'
import { getHeroSlides, type HeroSlide } from '../api/gallery'
import { getTestimonials, Testimonial } from '../api/testimonials'
import { pageRoot, cardSurface } from '../utils/themeClasses'
import { getSafeImageUrl } from '../utils/imageUrl'
import HeroCarousel from '../components/HeroCarousel'
import OnboardingFlow, { type StartRequest } from '../components/onboarding/OnboardingFlow'
import { PROGRAMS, PROGRAM_ORDER, type ProgramId } from '../content/programs'
import { HERO_COPY } from '../content/onboarding'

const EVENT_IMAGE_FALLBACK =
  'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=600&q=80'

const PROGRAM_ICONS: Record<ProgramId, LucideIcon> = {
  foundations: Footprints,
  fat_loss: Flame,
  endurance: Timer,
  hiking: Mountain,
}

export default function Home() {
  const [events, setEvents] = useState<any[]>([])
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [startRequest, setStartRequest] = useState<StartRequest | null>(null)
  const heroRef = useRef<HTMLElement>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')
      const [eventsData, heroData, testimonialsData] = await Promise.all([
        getEvents(),
        getHeroSlides(),
        getTestimonials(),
      ])
      setEvents(eventsData.slice(0, 3))
      setHeroSlides(Array.isArray(heroData) ? heroData : [])
      setTestimonials(Array.isArray(testimonialsData) ? testimonialsData.slice(0, 3) : [])
    } catch (err) {
      setError('Failed to load homepage content. Please try again.')
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  const startFlow = (program?: ProgramId) => {
    setStartRequest({ program, nonce: Date.now() })
    heroRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className={pageRoot}>

      {/* ── HERO + ONBOARDING FLOW ─────────────────────────────────── */}
      <style>{`
        .hero-word {
          display: block;
          font-family: var(--font-display);
          line-height: 0.92;
          opacity: 0;
        }
        .hero-word:nth-child(1) { animation: slideRight 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s forwards; }
        .hero-word:nth-child(2) { animation: slideRight 0.8s cubic-bezier(0.16,1,0.3,1) 0.25s forwards; }

        .hero-sub { opacity: 0; animation: fadeUp 0.8s ease 0.6s forwards; }
        .hero-ctas { opacity: 0; animation: fadeUp 0.8s ease 0.8s forwards; }
      `}</style>

      <section ref={heroRef} className="relative min-h-screen w-full flex items-center overflow-hidden scroll-mt-16">
      <div className="absolute inset-0 w-full h-full bg-ink light:bg-ink-light">
          {heroSlides.length > 0 && <HeroCarousel slides={heroSlides} />}
        </div>

        <div className="absolute inset-0 bg-night/80 light:bg-white/85 pointer-events-none" />

        <div className="absolute left-[6%] top-[15%] bottom-[15%] w-0.5 bg-gradient-to-b from-transparent via-accent light:via-accent-light to-transparent opacity-60 z-10" />

        <div className="max-w-[1200px] mx-auto px-[6%] py-[80px] relative z-10 w-full">
          <OnboardingFlow startRequest={startRequest} />
        </div>
      </section>

      {/* ── TRUST STRIP ───────────────────────────────────────────── */}
      <section className="bg-ash light:bg-ash-light border-y border-white/5 light:border-black/5 px-[6%] py-8">
        <div className="max-w-[1200px] mx-auto flex flex-wrap items-center justify-center md:justify-between gap-6 md:gap-10">
          {[
            { val: '20,000+', label: 'Community Members' },
            { val: '7,000+', label: 'On WhatsApp' },
            { val: '16+', label: 'Successful Events' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="font-bebas text-4xl md:text-5xl text-accent light:text-accent-light leading-none">{s.val}</span>
              <span className="font-barlow-condensed font-bold text-xs md:text-sm tracking-widest uppercase text-chalk/70 light:text-chalk-light/70">{s.label}</span>
            </div>
          ))}
          <p className="w-full md:w-auto text-center font-barlow-condensed font-bold text-sm tracking-widest uppercase text-fog light:text-fog-light">
            You&apos;re never training alone.
          </p>
        </div>
      </section>

      {/* ── PROGRAMS ──────────────────────────────────────────────── */}
      <section className="py-24 px-[6%] bg-ink light:bg-ink-light">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-12">
            <div className="font-barlow-condensed font-bold text-xs tracking-widest text-accent light:text-accent-light mb-3 flex items-center gap-2.5">
              <span className="block w-6 h-0.5 bg-accent light:bg-accent-light" />
              Train With Us
            </div>
            <h2 className="font-bebas text-[clamp(40px,5vw,64px)] text-chalk light:text-chalk-light leading-tight">
              OUR PROGRAMS
            </h2>
            <p className="text-fog light:text-fog-light text-base max-w-xl mt-3">
              Four groups, one community. Pick the one that fits where you are right now.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PROGRAM_ORDER.map((id) => {
              const program = PROGRAMS[id]
              const Icon = PROGRAM_ICONS[id]
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => startFlow(id)}
                  className={`${cardSurface} text-left p-6 flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:border-accent light:hover:border-accent-light group`}
                >
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-11 h-11 bg-accent/10 light:bg-accent-light/10 border border-accent/20 light:border-accent-light/20 flex items-center justify-center text-accent light:text-accent-light">
                      <Icon size={20} />
                    </div>
                    <span
                      className={`font-barlow-condensed font-bold text-[11px] tracking-widest uppercase px-2 py-0.5 ${
                        program.requiresPaid
                          ? 'border border-white/20 light:border-black/20 text-chalk/80 light:text-chalk-light/80'
                          : 'bg-accent light:bg-accent-light text-black light:text-white'
                      }`}
                    >
                      {program.requiresPaid ? 'TRFC+' : 'Free'}
                    </span>
                  </div>
                  <h3 className="font-barlow-condensed font-bold text-2xl tracking-tighter text-chalk light:text-chalk-light mb-2">
                    {program.name}
                  </h3>
                  <p className="text-fog light:text-fog-light text-sm leading-relaxed flex-1 mb-5">{program.tagline}</p>
                  <span className="font-barlow-condensed text-xs tracking-widest uppercase font-bold text-accent light:text-accent-light">
                    See the program →
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────── */}
      {testimonials.length > 0 && (
        <section className="py-24 px-[6%] bg-night light:bg-night-light">
          <div className="max-w-[1200px] mx-auto">
            <div className="flex justify-between items-end gap-4 mb-12 flex-wrap">
              <div>
                <div className="font-barlow-condensed font-bold text-xs tracking-widest text-accent light:text-accent-light mb-3 flex items-center gap-2.5">
                  <span className="block w-6 h-0.5 bg-accent light:bg-accent-light" />
                  Community Voices
                </div>
                <h2 className="font-bebas text-[clamp(40px,5vw,64px)] text-chalk light:text-chalk-light leading-tight">
                  WHAT MEMBERS SAY
                </h2>
              </div>
              <Link to="/testimonials" className="font-barlow-condensed font-bold text-xs tracking-wider text-chalk light:text-chalk-light px-6 py-2.5 border border-white/40 light:border-black/40 transition-all duration-200 hover:border-accent light:hover:border-accent-light hover:text-accent light:hover:text-accent-light no-underline">
                All Testimonials →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {testimonials.map((t) => (
                <div key={t.id} className={`${cardSurface} p-6 flex flex-col`}>
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={14} className={i < t.rating ? 'text-accent light:text-accent-light fill-accent light:fill-accent-light' : 'text-fog light:text-fog-light'} />
                    ))}
                  </div>
                  <p className="text-chalk/90 light:text-chalk-light/90 leading-relaxed flex-1 mb-4">&ldquo;{t.message}&rdquo;</p>
                  <p className="font-barlow-condensed font-bold text-accent light:text-accent-light text-sm">{t.member_name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── EVENTS (COMPACT) ──────────────────────────────────────── */}
      <section className="py-20 px-[6%] bg-ink light:bg-ink-light">
        <div className="max-w-[1200px] mx-auto">
          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 border-l-4 border-l-red-500 px-4 py-3.5 mb-8 text-sm text-red-600 dark:text-red-400">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.25" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex justify-between items-end gap-4 mb-8 flex-wrap">
            <div>
              <div className="font-barlow-condensed font-bold text-xs tracking-widest text-accent light:text-accent-light mb-3 flex items-center gap-2.5">
                <span className="block w-6 h-0.5 bg-accent light:bg-accent-light" />
                On The Calendar
              </div>
              <h2 className="font-bebas text-[clamp(32px,4vw,48px)] text-chalk light:text-chalk-light leading-tight">
                UPCOMING EVENTS
              </h2>
            </div>
            <Link to="/events" className="font-barlow-condensed font-bold text-xs tracking-wider text-chalk light:text-chalk-light px-6 py-2.5 border border-white/40 light:border-black/40 transition-all duration-200 hover:border-accent light:hover:border-accent-light hover:text-accent light:hover:text-accent-light no-underline">
              All Events →
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-10 text-fog light:text-fog-light font-barlow-condensed tracking-widest uppercase">
              Loading events...
            </div>
          ) : events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {events.map((event: any) => (
                <Link to={`/events/${event.id}`} key={event.id} className="bg-ash light:bg-ash-light border border-white/6 light:border-black/6 overflow-hidden flex no-underline transition-all duration-300 hover:border-accent light:hover:border-accent-light group">
                  <div className="w-28 flex-shrink-0 bg-smoke light:bg-smoke-light">
                    <img
                      src={getSafeImageUrl(event.image_url, EVENT_IMAGE_FALLBACK)}
                      alt={event.title}
                      onError={(e) => { (e.target as HTMLImageElement).src = EVENT_IMAGE_FALLBACK }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="font-barlow-condensed font-bold text-lg tracking-tight text-chalk light:text-chalk-light leading-tight mb-1 truncate">{event.title}</div>
                      <div className="text-xs text-fog light:text-fog-light truncate">{event.location}</div>
                    </div>
                    <div className="font-bebas text-xl text-accent light:text-accent-light tracking-wider mt-2">
                      {event.all_types_sold_out
                        ? 'Sold out'
                        : event.min_price == null
                          ? '—'
                          : Number(event.min_price) === 0
                            ? 'FREE'
                            : `From KES ${Number(event.min_price).toLocaleString()}`}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-fog light:text-fog-light font-barlow-condensed tracking-widest uppercase">
              No upcoming events yet — check back soon!
            </div>
          )}
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────── */}
      <section className="py-20 px-[6%] bg-night light:bg-night-light border-t border-white/10 light:border-black/10 relative overflow-hidden">
        <div className="absolute -right-[5%] top-1/2 -translate-y-1/2 font-bebas text-[260px] text-chalk/5 light:text-chalk-light/5 leading-none pointer-events-none select-none">RUN</div>
        <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-8 flex-wrap relative">
          <div>
            <h2 className="font-bebas text-[clamp(36px,5vw,64px)] text-chalk light:text-chalk-light leading-tight mb-3">
              FIND YOUR PROGRAM.<br />START THIS WEEK.
            </h2>
            <p className="text-fog light:text-fog-light text-base max-w-sm">{HERO_COPY.smallLine}</p>
          </div>
          <button
            type="button"
            onClick={() => startFlow()}
            className="bg-accent light:bg-accent-light text-black light:text-white px-12 py-4 font-barlow-condensed font-black text-lg tracking-widest uppercase clip-angled-lg inline-block transition-all duration-200 hover:scale-106 hover:bg-accent/90 light:hover:bg-accent-light/90 animate-pulse-ring"
          >
            {HERO_COPY.button}
          </button>
        </div>
      </section>

    </div>
  )
}
