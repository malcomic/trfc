import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getEvents } from '../api/events'
import { getGallery } from '../api/gallery'
import { Button } from '../components/ui'
import { Card } from '../components/ui'

interface GalleryItem {
  id: string
  media_url: string
  caption?: string
  uploaded_at: string
}

export default function Home() {
  const [events, setEvents] = useState<any[]>([])
  const [gallery, setGallery] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [eventsData, galleryData] = await Promise.all([getEvents(), getGallery()])
      setEvents(eventsData.slice(0, 3))
      setGallery(Array.isArray(galleryData) ? galleryData.slice(0, 6) : [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-ink dark:bg-ink light:bg-ink-light min-h-screen">

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

      <section
        className="noise-bg relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-night via-[#1a0800] to-night"
      >
        {/* Big background "TRFC" watermark */}
        <div className="absolute -right-[2%] top-1/2 -translate-y-1/2 font-bebas text-[clamp(200px,28vw,480px)] text-fire/5 leading-none select-none pointer-events-none -tracking-[4px]">
          TRFC
        </div>

        {/* Vertical accent line */}
        <div className="absolute left-[6%] top-[15%] bottom-[15%] w-0.5 bg-gradient-to-b from-transparent via-fire to-transparent opacity-60" />

        {/* Main hero content */}
        <div className="max-w-[1200px] mx-auto px-[6%] py-[80px] relative z-10">

          <div className="font-barlow-condensed font-bold text-xs tracking-widest text-fire mb-7 flex items-center gap-2.5">
            <span className="block w-6 h-0.5 bg-fire" />
            Thika Road · Nairobi · Est. 2019
          </div>

          {/* Giant headline */}
          <h1 className="text-[clamp(72px,12vw,180px)] mb-8">
            <span className="hero-word text-chalk dark:text-chalk light:text-chalk-light">RUN</span>
            <span className="hero-word text-fire dark:text-fire light:text-fire" style={{ WebkitTextStroke: '2px', WebkitTextFillColor: 'transparent', color: '#FF4500' }}>TOGETHER</span>
            <span className="hero-word text-chalk dark:text-chalk light:text-chalk-light">THRIVE</span>
          </h1>

          <p className="hero-sub max-w-[520px] text-lg leading-relaxed text-white/65 dark:text-white/65 light:text-black/65 mb-10">
            Nairobi's most energetic running and fitness community.
            Train hard, race smart, celebrate every kilometre.
          </p>

          <div className="hero-ctas flex flex-wrap gap-4 mb-15">
            <Link to="/register">
              <Button variant="primary" size="lg" className="h-13 px-8">
                Join the Community
              </Button>
            </Link>
            <Link to="/events">
              <Button variant="secondary" size="lg" className="h-13 px-8">
                View Events
              </Button>
            </Link>
            <Link to="/shop">
              <Button variant="secondary" size="lg" className="h-13 px-8">
                Shop Merch
              </Button>
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
                <span className="text-xs text-fog light:text-fog-light uppercase tracking-wider leading-relaxed">{b.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
          <span className="font-barlow-condensed text-xs tracking-widest uppercase">Scroll</span>
          <div className="w-px h-12 bg-gradient-to-b from-chalk dark:from-chalk light:from-chalk-light to-transparent scroll-hint-line" />
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
      <section className="bg-ash dark:bg-ash light:bg-ash-light py-24 px-[6%]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">

          <div>
            <div className="font-barlow-condensed font-bold text-xs tracking-widest text-fire mb-7 flex items-center gap-2.5">
              <span className="block w-6 h-0.5 bg-fire" />
              What We Offer
            </div>
            <h2 className="font-bebas text-[clamp(44px,6vw,80px)] leading-[0.95] text-chalk dark:text-chalk light:text-chalk-light mb-7">
              MORE THAN<br />
              <span className="text-fire">A GYM.</span><br />
              A MOVEMENT.
            </h2>
            <p className="text-white/60 dark:text-white/60 light:text-black/60 text-base leading-relaxed max-w-sm">
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
              <Link to={f.to} key={f.n} className="flex items-center gap-3 py-4.5 border-b border-white/7 dark:border-white/7 light:border-black/7 no-underline transition-all duration-200 hover:gap-4.5 group" style={{ color: 'inherit' }}>
                <span className="font-bebas text-xs text-fog light:text-fog-light w-7">{f.n}</span>
                <span className="font-barlow-condensed font-bold text-2xl tracking-tighter text-chalk dark:text-chalk light:text-chalk-light flex-1">{f.label}</span>
                <span className="text-smoke dark:text-smoke light:text-mist transition-colors duration-200 group-hover:text-fire">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────────── */}
      <section className="py-20 px-[6%] bg-ink dark:bg-ink light:bg-ink-light border-t border-white/5 dark:border-white/5 light:border-black/5">
        <div className="max-w-[1200px] mx-auto grid grid-cols-4 gap-px">
          {[
            { val: '500+', label: 'Members', sub: 'and growing' },
            { val: '50+',  label: 'Events', sub: 'races & meetups' },
            { val: '10+',  label: 'Programs', sub: 'for all levels' },
            { val: '5+',   label: 'Years', sub: 'of community' },
          ].map((s, i) => (
            <div
              key={s.label}
              className={`stat-card py-10 px-7 text-center ${i % 2 === 0 ? 'bg-ash dark:bg-ash light:bg-ash-light' : 'bg-smoke dark:bg-smoke light:bg-smoke-light'} ${i === 0 ? 'border-l-3 border-fire' : ''}`}
              style={{ '--delay': `${i * 0.12}s` } as any}
            >
              <p className="font-bebas text-[clamp(48px,5vw,72px)] text-fire leading-none mb-1.5">{s.val}</p>
              <p className="font-barlow-condensed font-bold text-lg tracking-wider uppercase text-chalk dark:text-chalk light:text-chalk-light mb-1">{s.label}</p>
              <p className="text-xs text-fog light:text-fog-light uppercase tracking-widest">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── EVENTS ────────────────────────────────────────────────── */}
      <section className="py-24 px-[6%] bg-ink dark:bg-ink light:bg-ink-light">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex justify-between items-end gap-4 mb-12 flex-wrap">
            <div>
              <div className="font-barlow-condensed font-bold text-xs tracking-widest text-fire mb-3 flex items-center gap-2.5">
                <span className="block w-6 h-0.5 bg-fire" />
                On The Calendar
              </div>
              <h2 className="font-bebas text-[clamp(40px,5vw,64px)] text-chalk dark:text-chalk light:text-chalk-light leading-tight">
                UPCOMING EVENTS
              </h2>
            </div>
            <Link to="/events">
              <Button variant="secondary" size="sm">
                All Events →
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-16 text-fog light:text-fog-light font-barlow-condensed tracking-widest uppercase">
              Loading events...
            </div>
          ) : events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event: any) => (
                <Link to={`/events/${event.id}`} key={event.id} className="no-underline">
                  <Card variant="interactive">
                    <div className="overflow-hidden relative">
                      <img
                        src={event.image_url || 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=600&q=80'}
                        alt={event.title}
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=600&q=80' }}
                        className="w-full h-55 object-cover brightness-[0.88] transition-all duration-300 hover:brightness-100 hover:scale-103"
                      />
                      <div className="absolute top-3.5 left-3.5 bg-fire text-chalk font-barlow-condensed font-bold text-xs tracking-wider uppercase px-2.5 py-1">
                        Event
                      </div>
                    </div>
                    <div className="p-5 pt-6">
                      <h3 className="font-barlow-condensed font-bold text-xl tracking-tight text-chalk mb-2 hover:text-fire transition-colors">{event.title}</h3>
                      <div className="text-xs text-fog mb-3 flex items-center gap-1.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {event.location}
                      </div>
                      <div className="flex justify-between items-center border-t border-mist pt-4">
                        <div className="font-bebas text-2xl text-fire tracking-wider">KES {event.price?.toLocaleString?.() ?? event.price}</div>
                        <span className="font-barlow-condensed text-xs tracking-widest text-fire font-bold hover:text-ember transition-colors">
                          Register →
                        </span>
                      </div>
                    </div>
                  </Card>
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
            <h2 className="font-bebas text-[clamp(36px,5vw,64px)] text-chalk leading-tight mb-3">
              READY TO RUN<br />WITH US?
            </h2>
            <p className="text-chalk/80 text-base max-w-sm">
              Sign up today and join 500+ athletes who chose community over the treadmill.
            </p>
          </div>
          <Link to="/register">
            <Button variant="secondary" size="lg" className="h-13 px-8 bg-chalk text-fire hover:bg-chalk/90">
              Join Now — It's Free
            </Button>
          </Link>
        </div>
      </section>

      {/* ── GALLERY ───────────────────────────────────────────────── */}
      {gallery.length > 0 && (
        <section className="py-24 px-[6%] bg-night dark:bg-night light:bg-night">
          <div className="max-w-[1200px] mx-auto">
            <div className="flex justify-between items-end gap-4 mb-10 flex-wrap">
              <div>
                <div className="font-barlow-condensed font-bold text-xs tracking-widest text-fire mb-3 flex items-center gap-2.5">
                  <span className="block w-6 h-0.5 bg-fire" />
                  On The Ground
                </div>
                <h2 className="font-bebas text-[clamp(40px,5vw,64px)] text-chalk dark:text-chalk light:text-chalk-light leading-tight">
                  COMMUNITY GALLERY
                </h2>
              </div>
              <Link to="/gallery">
                <Button variant="secondary" size="sm">
                  All Photos →
                </Button>
              </Link>
            </div>

            {/* Masonry-ish grid */}
            <div className="grid grid-cols-3 grid-rows-2 gap-1.5">
              {gallery.slice(0, 6).map((item, i) => (
                <Link
                  to="/gallery"
                  key={item.id}
                  className="relative overflow-hidden bg-ash dark:bg-ash light:bg-ash-light block no-underline group"
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
                    {item.caption && <p className="text-xs text-chalk italic">{item.caption}</p>}
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
