import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Star } from 'lucide-react'
import { getEvents } from '../api/events'
import { getGallery } from '../api/gallery'
import { getTestimonials, Testimonial } from '../api/testimonials'
import { pageRoot, cardSurface } from '../utils/themeClasses'
import landingHero from '../assets/landing-hero.png'

interface GalleryItem {
  id: string
  media_url: string
  caption?: string
  uploaded_at: string
}

export default function Home() {
  const [events, setEvents] = useState<any[]>([])
  const [gallery, setGallery] = useState<GalleryItem[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')
      const [eventsData, galleryData, testimonialsData] = await Promise.all([
        getEvents(),
        getGallery(),
        getTestimonials(),
      ])
      setEvents(eventsData.slice(0, 3))
      setGallery(Array.isArray(galleryData) ? galleryData.slice(0, 6) : [])
      setTestimonials(Array.isArray(testimonialsData) ? testimonialsData.slice(0, 3) : [])
    } catch (err) {
      setError('Failed to load homepage content. Please try again.')
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={pageRoot}>

      {/* ── HERO ───────────────────────────────────────────────────── */}
      <style>{`
        .hero-word {
          display: block;
          font-family: 'Bebas Neue', sans-serif;
          line-height: 0.92;
          opacity: 0;
        }
        .hero-word:nth-child(1) { animation: slideRight 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s forwards; }
        .hero-word:nth-child(2) { animation: slideRight 0.8s cubic-bezier(0.16,1,0.3,1) 0.25s forwards; }
        .hero-word:nth-child(3) { animation: slideRight 0.8s cubic-bezier(0.16,1,0.3,1) 0.4s forwards; }

        .hero-sub { opacity: 0; animation: fadeUp 0.8s ease 0.7s forwards; }
        .hero-ctas { opacity: 0; animation: fadeUp 0.8s ease 0.9s forwards; }
        .hero-badge { opacity: 0; animation: scaleIn 0.6s ease 1.1s forwards; }

        .stat-card { opacity: 0; animation: fadeUp 0.6s ease var(--delay, 0s) forwards; }

        .nav-link-underline {
          position: relative;
        }

        @keyframes scrollHint {
          0% { opacity: 0.4; }
          50% { opacity: 0.7; }
          100% { opacity: 0.4; }
        }
        .scroll-hint-line {
          animation: fadeUp 1.5s ease infinite;
        }
      `}</style>

      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Landing hero image — full bleed on mobile, right panel on desktop */}
        <div className="absolute inset-0 lg:inset-y-0 lg:left-[38%] lg:right-0">
          <img
            src={landingHero}
            alt="TRFC community members training together"
            className="w-full h-full min-h-[320px] object-cover object-center"
            fetchPriority="high"
          />
        </div>

        {/* Readability overlay — dark tint only; never white in light mode */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/25 lg:from-black/92 lg:via-black/75 lg:to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none lg:hidden" />

        {/* Vertical accent line */}
        <div className="absolute left-[6%] top-[15%] bottom-[15%] w-0.5 bg-gradient-to-b from-transparent via-fire to-transparent opacity-60 z-10" />

        {/* Main hero content */}
        <div className="max-w-[1200px] mx-auto px-[6%] py-[80px] relative z-10 w-full">

          <div className="font-barlow-condensed font-bold text-xs tracking-widest text-fire mb-7 flex items-center gap-2.5">
            <span className="block w-6 h-0.5 bg-fire" />
            Thika Road · Nairobi · Est. 2026
          </div>

          {/* Giant headline */}
          <h1 className="text-[clamp(72px,12vw,180px)] mb-8">
            <span className="hero-word text-white">RUN</span>
            <span className="hero-word text-fire" style={{ WebkitTextStroke: '2px', WebkitTextFillColor: 'transparent', color: '#FF4500' }}>TOGETHER</span>
            <span className="hero-word text-white">THRIVE</span>
          </h1>

          <p className="hero-sub max-w-[520px] text-lg leading-relaxed text-white/75 mb-10">
            Nairobi's most energetic running and fitness community.
            Train hard, race smart, celebrate every kilometre.
          </p>

          <div className="hero-ctas flex flex-wrap gap-4 mb-15">
            <Link to="/register" className="font-barlow-condensed font-black text-base tracking-wider text-white px-9 py-3.5 bg-fire clip-angled-lg transition-all duration-200 hover:bg-ember hover:scale-104 inline-block">
              Join the Community
            </Link>
            <Link to="/events" className="font-barlow-condensed font-bold text-base tracking-wider text-white px-8 py-3 border-1.5 border-white/40 transition-all duration-200 hover:border-fire hover:text-fire inline-block">
              View Events
            </Link>
            <Link to="/shop" className="font-barlow-condensed font-bold text-base tracking-wider text-white px-8 py-3 border-1.5 border-white/40 transition-all duration-200 hover:border-fire hover:text-fire inline-block">
              Shop Merch
            </Link>
          </div>

          {/* Hero badges */}
          <div className="hero-badge flex flex-wrap gap-6">
            {[
              { val: '500+', desc: 'Active Members' },
              { val: '50+', desc: 'Events Run' },
              { val: '5 Yrs', desc: 'Community Built' },
            ].map((b) => (
              <div key={b.val} className="flex items-center gap-2.5">
                <span className="font-bebas text-5xl text-fire leading-none">{b.val}</span>
                <span className="text-xs text-white/60 uppercase tracking-wider leading-relaxed">{b.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40 z-10">
          <span className="font-barlow-condensed text-xs tracking-widest uppercase">Scroll</span>
          <div className="w-px h-12 bg-gradient-to-b from-white/60 to-transparent scroll-hint-line" />
        </div>
      </section>

      {/* ── TICKER ─────────────────────────────────────────────────── */}
      <div className="bg-fire overflow-hidden py-3">
        <style>{`
          .ticker-inner {
            display: flex;
            white-space: nowrap;
            animation: ticker 22s linear infinite;
          }
        `}</style>
        <div className="ticker-inner">
          {Array(4).fill(null).map((_, i) => (
            <span key={i} className="flex items-center">
              <span className="font-bebas text-lg tracking-widest text-white px-12">RUN STRONGER</span>
              <span className="text-white/50 px-12">✦</span>
              <span className="font-bebas text-lg tracking-widest text-white px-12">TRAIN TOGETHER</span>
              <span className="text-white/50 px-12">✦</span>
              <span className="font-bebas text-lg tracking-widest text-white px-12">THIKA ROAD FC</span>
              <span className="text-white/50 px-12">✦</span>
              <span className="font-bebas text-lg tracking-widest text-white px-12">NAIROBI COMMUNITY</span>
              <span className="text-white/50 px-12">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── WHAT WE OFFER ─────────────────────────────────────────── */}
      <section className="bg-ash light:bg-ash-light py-24 px-[6%]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">

          <div>
            <div className="font-barlow-condensed font-bold text-xs tracking-widest text-fire mb-7 flex items-center gap-2.5">
              <span className="block w-6 h-0.5 bg-fire" />
              What We Offer
            </div>
            <h2 className="font-bebas text-[clamp(44px,6vw,80px)] leading-[0.95] text-chalk light:text-chalk-light mb-7">
              MORE THAN<br />
              <span className="text-fire">A GYM.</span><br />
              A MOVEMENT.
            </h2>
            <p className="text-white/60 light:text-black/60 text-base leading-relaxed max-w-sm">
              From sunrise track sessions to charity races and weekend long runs —
              TRFC is where Nairobi shows up, laces up, and levels up.
            </p>
          </div>

          <div>
            {[
              { n: '01', label: 'Group Runs & Track Sessions', to: '/programs' },
              { n: '02', label: 'Fitness Challenges & Bootcamps', to: '/programs' },
              { n: '03', label: 'Race Events & Competitions', to: '/events' },
              { n: '04', label: 'Nutrition & Coaching Plans', to: '/programs' },
              { n: '05', label: 'Community Merch & Gear', to: '/shop' },
            ].map((f) => (
              <Link to={f.to} key={f.n} className="flex items-center gap-3 py-4.5 border-b border-white/7 light:border-black/7 no-underline transition-all duration-200 hover:gap-4.5 group" style={{ color: 'inherit' }}>
                <span className="font-bebas text-xs text-fog light:text-fog-light w-7">{f.n}</span>
                <span className="font-barlow-condensed font-bold text-2xl tracking-tighter text-chalk light:text-chalk-light flex-1">{f.label}</span>
                <span className="text-smoke light:text-mist transition-colors duration-200 group-hover:text-fire">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────────── */}
      <section className="py-20 px-[6%] bg-ink light:bg-ink-light border-t border-white/5 light:border-black/5">
        <div className="max-w-[1200px] mx-auto grid grid-cols-4 gap-px">
          {[
            { val: '500+', label: 'Members', sub: 'and growing' },
            { val: '50+',  label: 'Events', sub: 'races & meetups' },
            { val: '10+',  label: 'Programs', sub: 'for all levels' },
            { val: '5+',   label: 'Years', sub: 'of community' },
          ].map((s, i) => (
            <div
              key={s.label}
              className={`stat-card py-10 px-7 text-center ${i % 2 === 0 ? 'bg-ash light:bg-ash-light' : 'bg-smoke light:bg-smoke-light'} ${i === 0 ? 'border-l-3 border-fire' : ''}`}
              style={{ '--delay': `${i * 0.12}s` } as any}
            >
              <p className="font-bebas text-[clamp(48px,5vw,72px)] text-fire leading-none mb-1.5">{s.val}</p>
              <p className="font-barlow-condensed font-bold text-lg tracking-wider uppercase text-chalk light:text-chalk-light mb-1">{s.label}</p>
              <p className="text-xs text-fog light:text-fog-light uppercase tracking-widest">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── EVENTS ────────────────────────────────────────────────── */}
      <section className="py-24 px-[6%] bg-ink light:bg-ink-light">
        <div className="max-w-[1200px] mx-auto">
          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 border-l-4 border-l-red-500 px-4 py-3.5 mb-8 text-sm text-red-600 dark:text-red-400">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.25" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex justify-between items-end gap-4 mb-12 flex-wrap">
            <div>
              <div className="font-barlow-condensed font-bold text-xs tracking-widest text-fire mb-3 flex items-center gap-2.5">
                <span className="block w-6 h-0.5 bg-fire" />
                On The Calendar
              </div>
              <h2 className="font-bebas text-[clamp(40px,5vw,64px)] text-chalk light:text-chalk-light leading-tight">
                UPCOMING EVENTS
              </h2>
            </div>
            <Link to="/events" className="font-barlow-condensed font-bold text-xs tracking-wider text-chalk light:text-chalk-light px-6 py-2.5 border border-white/40 light:border-black/40 transition-all duration-200 hover:border-fire light:hover:border-fire hover:text-fire light:hover:text-fire no-underline">
              All Events →
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-16 text-fog light:text-fog-light font-barlow-condensed tracking-widest uppercase">
              Loading events...
            </div>
          ) : events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {events.map((event: any, idx: number) => (
                <Link to={`/events/${event.id}`} key={event.id} className="bg-ash light:bg-ash-light border border-white/6 light:border-black/6 overflow-hidden relative transition-all duration-300 no-underline hover:-translate-y-1.5 hover:border-fire group" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <div className="overflow-hidden">
                    <img
                      src={event.image_url || 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=600&q=80'}
                      alt={event.title}
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=600&q=80' }}
                      className="w-full h-55 object-cover brightness-[0.88] transition-all duration-300 group-hover:brightness-100 group-hover:scale-103"
                    />
                  </div>
                  <div className="absolute top-3.5 left-3.5 bg-fire text-white font-barlow-condensed font-bold text-xs tracking-wider uppercase px-2.5 py-1">
                    Event
                  </div>
                  <div className="p-5 pt-6">
                    <div className="font-barlow-condensed font-bold text-xl tracking-tight text-chalk light:text-chalk-light mb-2">{event.title}</div>
                    <div className="text-xs text-fog light:text-fog-light mb-3 flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {event.location}
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="font-bebas text-2xl text-fire tracking-wider">KES {event.price?.toLocaleString?.() ?? event.price}</div>
                      <span className="font-barlow-condensed text-xs tracking-widest text-fire font-bold">
                        Register →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-fog light:text-fog-light font-barlow-condensed tracking-widest uppercase">
              No upcoming events yet — check back soon!
            </div>
          )}
        </div>
      </section>

      {/* ── CTA BAND ──────────────────────────────────────────────── */}
      <section className="py-20 px-[6%] bg-gradient-to-r from-fire via-ember to-[#FF3800] relative overflow-hidden">
        <div className="absolute -right-[5%] top-1/2 -translate-y-1/2 font-bebas text-[260px] text-black/10 leading-none pointer-events-none select-none">RUN</div>
        <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-8 flex-wrap relative">
          <div>
            <h2 className="font-bebas text-[clamp(36px,5vw,64px)] text-white leading-tight mb-3">
              READY TO RUN<br />WITH US?
            </h2>
            <p className="text-white/80 text-base max-w-sm">
              Sign up today and join 500+ athletes who chose community over the treadmill.
            </p>
          </div>
          <Link to="/register" className="bg-white text-fire px-12 py-4.5 font-barlow-condensed font-black text-lg tracking-widest uppercase no-underline clip-angled-lg inline-block transition-all duration-200 hover:scale-106 animate-pulse-ring"
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            Join Now — It's Free
          </Link>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────── */}
      {testimonials.length > 0 && (
        <section className="py-24 px-[6%] bg-ink light:bg-ink-light">
          <div className="max-w-[1200px] mx-auto">
            <div className="flex justify-between items-end gap-4 mb-12 flex-wrap">
              <div>
                <div className="font-barlow-condensed font-bold text-xs tracking-widest text-fire mb-3 flex items-center gap-2.5">
                  <span className="block w-6 h-0.5 bg-fire" />
                  Community Voices
                </div>
                <h2 className="font-bebas text-[clamp(40px,5vw,64px)] text-chalk light:text-chalk-light leading-tight">
                  WHAT MEMBERS SAY
                </h2>
              </div>
              <Link to="/testimonials" className="font-barlow-condensed font-bold text-xs tracking-wider text-chalk light:text-chalk-light px-6 py-2.5 border border-white/40 light:border-black/40 transition-all duration-200 hover:border-fire light:hover:border-fire hover:text-fire light:hover:text-fire no-underline">
                All Testimonials →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {testimonials.map((t) => (
                <div key={t.id} className={`${cardSurface} p-6 flex flex-col`}>
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={14} className={i < t.rating ? 'text-fire fill-fire' : 'text-fog light:text-fog-light'} />
                    ))}
                  </div>
                  <p className="text-chalk/90 light:text-chalk-light/90 leading-relaxed flex-1 mb-4">&ldquo;{t.message}&rdquo;</p>
                  <p className="font-barlow-condensed font-bold text-fire text-sm">{t.member_name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── GALLERY ───────────────────────────────────────────────── */}
      {gallery.length > 0 && (
        <section className="py-24 px-[6%] bg-night light:bg-night-light">
          <div className="max-w-[1200px] mx-auto">
            <div className="flex justify-between items-end gap-4 mb-10 flex-wrap">
              <div>
                <div className="font-barlow-condensed font-bold text-xs tracking-widest text-fire mb-3 flex items-center gap-2.5">
                  <span className="block w-6 h-0.5 bg-fire" />
                  On The Ground
                </div>
                <h2 className="font-bebas text-[clamp(40px,5vw,64px)] text-chalk light:text-chalk-light leading-tight">
                  COMMUNITY GALLERY
                </h2>
              </div>
              <Link to="/gallery" className="font-barlow-condensed font-bold text-xs tracking-wider text-chalk light:text-chalk-light px-6 py-2.5 border border-white/40 light:border-black/40 transition-all duration-200 hover:border-fire light:hover:border-fire hover:text-fire light:hover:text-fire no-underline">
                All Photos →
              </Link>
            </div>

            {/* Masonry-ish grid */}
            <div className="grid grid-cols-3 grid-rows-2 gap-1.5">
              {gallery.slice(0, 6).map((item, i) => (
                <Link
                  to="/gallery"
                  key={item.id}
                  className="relative overflow-hidden bg-ash light:bg-ash-light block no-underline group"
                  style={{
                    gridColumn: i === 0 ? 'span 2' : 'span 1',
                    gridRow: i === 0 ? 'span 2' : 'span 1',
                  }}
                >
                  <img
                    src={item.media_url}
                    alt={item.caption || 'TRFC Community'}
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-155839853${i}-ab89674${i}3?w=600&q=70` }}
                    className="w-full h-full object-cover brightness-75 saturate-90 transition-all duration-500 group-hover:brightness-100 group-hover:saturate-110 group-hover:scale-108"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    {item.caption && <p className="text-xs text-chalk light:text-chalk-light italic">{item.caption}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

    </div>
  )
}
