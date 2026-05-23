import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getEvents } from '../api/events'
import { getGallery } from '../api/gallery'

interface GalleryItem {
  id: string
  media_url: string
  caption?: string
  uploaded_at: string
}

// Inject global styles for fonts and animations
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:ital,wght@0,400;0,600;0,700;1,400&family=Barlow+Condensed:wght@500;700;900&display=swap');

  :root {
    --fire: #FF4500;
    --ember: #FF7A1A;
    --night: #0A0A0A;
    --ink: #111111;
    --ash: #1C1C1C;
    --smoke: #2E2E2E;
    --chalk: #F5F2EE;
    --fog: #9E9E9E;
    --white: #FFFFFF;
    --gold: #C9A84C;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  
  body {
    background: var(--ink);
    color: var(--chalk);
    font-family: 'Barlow', sans-serif;
    overflow-x: hidden;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(40px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes slideRight {
    from { opacity: 0; transform: translateX(-60px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.92); }
    to   { opacity: 1; transform: scale(1); }
  }

  @keyframes ticker {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }

  @keyframes pulse-ring {
    0%   { box-shadow: 0 0 0 0 rgba(255,69,0,0.4); }
    70%  { box-shadow: 0 0 0 20px rgba(255,69,0,0); }
    100% { box-shadow: 0 0 0 0 rgba(255,69,0,0); }
  }

  @keyframes grain {
    0%, 100% { background-position: 0% 0%; }
    10%  { background-position: -5% -10%; }
    30%  { background-position: 3% 5%; }
    60%  { background-position: -8% 2%; }
    80%  { background-position: 5% -5%; }
  }

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

  .trfc-btn-primary {
    background: var(--fire);
    color: var(--white);
    border: none;
    padding: 14px 36px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 16px;
    letter-spacing: 2px;
    text-transform: uppercase;
    cursor: pointer;
    clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
    transition: background 0.2s, transform 0.15s;
    text-decoration: none;
    display: inline-block;
  }
  .trfc-btn-primary:hover { background: var(--ember); transform: scale(1.04); }

  .trfc-btn-outline {
    background: transparent;
    color: var(--chalk);
    border: 1.5px solid rgba(245,242,238,0.4);
    padding: 13px 32px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 16px;
    letter-spacing: 2px;
    text-transform: uppercase;
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s, background 0.2s;
    text-decoration: none;
    display: inline-block;
  }
  .trfc-btn-outline:hover { border-color: var(--fire); color: var(--fire); }

  .section-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--fire);
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .section-label::before {
    content: '';
    display: block;
    width: 24px;
    height: 2px;
    background: var(--fire);
  }

  .event-card {
    background: var(--ash);
    border: 1px solid rgba(255,255,255,0.06);
    overflow: hidden;
    position: relative;
    transition: transform 0.3s, border-color 0.3s;
    text-decoration: none;
    display: block;
  }
  .event-card:hover { transform: translateY(-6px); border-color: var(--fire); }
  .event-card .tag {
    position: absolute; top: 14px; left: 14px;
    background: var(--fire);
    color: white;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    padding: 4px 10px;
  }
  .event-card img { width: 100%; height: 220px; object-fit: cover; display: block; filter: brightness(0.88); transition: filter 0.3s, transform 0.4s; }
  .event-card:hover img { filter: brightness(1); transform: scale(1.03); }
  .event-card .body { padding: 20px 22px 24px; }
  .event-card .title { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 20px; letter-spacing: 0.5px; color: var(--chalk); margin-bottom: 8px; }
  .event-card .loc { font-size: 13px; color: var(--fog); margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
  .event-card .price { font-family: 'Bebas Neue', sans-serif; font-size: 26px; color: var(--fire); letter-spacing: 1px; }

  .gallery-card {
    position: relative;
    overflow: hidden;
    aspect-ratio: 1;
    background: var(--ash);
    display: block;
    text-decoration: none;
  }
  .gallery-card img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.5s cubic-bezier(0.16,1,0.3,1), filter 0.3s; filter: brightness(0.75) saturate(0.9); }
  .gallery-card:hover img { transform: scale(1.08); filter: brightness(1) saturate(1.1); }
  .gallery-card .overlay { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.85), transparent); padding: 16px; opacity: 0; transition: opacity 0.3s; }
  .gallery-card:hover .overlay { opacity: 1; }
  .gallery-card .cap { font-size: 13px; color: var(--chalk); font-style: italic; }

  .ticker-wrap { background: var(--fire); overflow: hidden; padding: 12px 0; }
  .ticker-inner { display: flex; white-space: nowrap; animation: ticker 22s linear infinite; }
  .ticker-item { font-family: 'Bebas Neue', sans-serif; font-size: 18px; letter-spacing: 3px; color: white; padding: 0 48px; }
  .ticker-sep { color: rgba(255,255,255,0.5); }

  .noise-bg {
    position: relative;
  }
  .noise-bg::after {
    content: '';
    position: absolute;
    inset: 0;
    opacity: 0.03;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    pointer-events: none;
    animation: grain 8s steps(10) infinite;
  }

  .diagonal-divider {
    height: 60px;
    background: var(--fire);
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 30%);
  }

  .feature-strip {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 18px 0;
    border-bottom: 1px solid rgba(255,255,255,0.07);
    text-decoration: none;
    transition: gap 0.2s;
  }
  .feature-strip:hover { gap: 18px; }
  .feature-strip:hover .arrow { color: var(--fire); }
  .feature-strip .num { font-family: 'Bebas Neue', sans-serif; font-size: 13px; color: var(--fog); width: 28px; }
  .feature-strip .name { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 22px; letter-spacing: 0.5px; color: var(--chalk); flex: 1; }
  .feature-strip .arrow { color: var(--smoke); font-size: 18px; transition: color 0.2s; }
`

export default function Home() {
  const [events, setEvents] = useState<any[]>([])
  const [gallery, setGallery] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const styleRef = useRef<HTMLStyleElement | null>(null)

  useEffect(() => {
    // Inject global styles
    const el = document.createElement('style')
    el.textContent = globalStyles
    document.head.appendChild(el)
    styleRef.current = el

    fetchData()

    return () => {
      if (styleRef.current) document.head.removeChild(styleRef.current)
    }
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
    <div style={{ background: 'var(--ink)', minHeight: '100vh' }}>

      {/* ── HERO ───────────────────────────────────────────────────── */}
      <section
        className="noise-bg"
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #0A0A0A 0%, #1a0800 60%, #0A0A0A 100%)',
        }}
      >
        {/* Big background "TRFC" watermark */}
        <div style={{
          position: 'absolute', right: '-2%', top: '50%', transform: 'translateY(-50%)',
          fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(200px, 28vw, 480px)',
          color: 'rgba(255,69,0,0.05)', lineHeight: 1, userSelect: 'none', pointerEvents: 'none',
          letterSpacing: '-4px',
        }}>
          TRFC
        </div>

        {/* Vertical accent line */}
        <div style={{
          position: 'absolute', left: '6%', top: '15%', bottom: '15%',
          width: '2px',
          background: 'linear-gradient(to bottom, transparent, var(--fire) 30%, var(--fire) 70%, transparent)',
          opacity: 0.6,
        }} />

        {/* Main hero content */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '80px 6% 80px calc(6% + 24px)', position: 'relative', zIndex: 1 }}>

          <div className="section-label" style={{ marginBottom: '28px' }}>
            Thika Road · Nairobi · Est. 2019
          </div>

          {/* Giant headline */}
          <h1 style={{ fontSize: 'clamp(72px, 12vw, 180px)', marginBottom: '32px' }}>
            <span className="hero-word" style={{ color: 'var(--chalk)' }}>RUN</span>
            <span className="hero-word" style={{ color: 'var(--fire)', WebkitTextStroke: '2px var(--fire)', WebkitTextFillColor: 'transparent' }}>TOGETHER</span>
            <span className="hero-word" style={{ color: 'var(--chalk)' }}>THRIVE</span>
          </h1>

          <p className="hero-sub" style={{
            maxWidth: '520px', fontSize: '18px', lineHeight: 1.7,
            color: 'rgba(245,242,238,0.65)', marginBottom: '40px',
          }}>
            Nairobi's most energetic running and fitness community.
            Train hard, race smart, celebrate every kilometre.
          </p>

          <div className="hero-ctas" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '60px' }}>
            <Link to="/register" className="trfc-btn-primary" style={{ animationDelay: '1s' }}>
              Join the Community
            </Link>
            <Link to="/events" className="trfc-btn-outline">
              View Events
            </Link>
            <Link to="/shop" className="trfc-btn-outline">
              Shop Merch
            </Link>
          </div>

          {/* Hero badges */}
          <div className="hero-badge" style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
            {[
              { val: '500+', desc: 'Active Members' },
              { val: '50+', desc: 'Events Run' },
              { val: '5 Yrs', desc: 'Community Built' },
            ].map((b) => (
              <div key={b.val} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '36px', color: 'var(--fire)', lineHeight: 1 }}>{b.val}</span>
                <span style={{ fontSize: '13px', color: 'var(--fog)', textTransform: 'uppercase', letterSpacing: '1px', lineHeight: 1.3 }}>{b.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll hint */}
        <div style={{
          position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
          opacity: 0.4,
        }}>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase' }}>Scroll</span>
          <div style={{
            width: '1px', height: '48px',
            background: 'linear-gradient(to bottom, var(--chalk), transparent)',
            animation: 'fadeUp 1.5s ease infinite',
          }} />
        </div>
      </section>

      {/* ── TICKER ─────────────────────────────────────────────────── */}
      <div className="ticker-wrap">
        <div className="ticker-inner">
          {Array(4).fill(null).map((_, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <span className="ticker-item">RUN STRONGER</span>
              <span className="ticker-item ticker-sep">✦</span>
              <span className="ticker-item">TRAIN TOGETHER</span>
              <span className="ticker-item ticker-sep">✦</span>
              <span className="ticker-item">THIKA ROAD FC</span>
              <span className="ticker-item ticker-sep">✦</span>
              <span className="ticker-item">NAIROBI COMMUNITY</span>
              <span className="ticker-item ticker-sep">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── WHAT WE OFFER ─────────────────────────────────────────── */}
      <section style={{ background: 'var(--ash)', padding: '96px 6%' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>

          <div>
            <div className="section-label">What We Offer</div>
            <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(44px, 6vw, 80px)', lineHeight: 0.95, color: 'var(--chalk)', marginBottom: '28px' }}>
              MORE THAN<br />
              <span style={{ color: 'var(--fire)' }}>A GYM.</span><br />
              A MOVEMENT.
            </h2>
            <p style={{ color: 'rgba(245,242,238,0.6)', fontSize: '16px', lineHeight: 1.8, maxWidth: '400px' }}>
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
              <Link to={f.to} key={f.n} className="feature-strip" style={{ color: 'inherit' }}>
                <span className="num">{f.n}</span>
                <span className="name">{f.label}</span>
                <span className="arrow">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────────── */}
      <section style={{
        padding: '80px 6%',
        background: 'var(--ink)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '2px' }}>
          {[
            { val: '500+', label: 'Members', sub: 'and growing' },
            { val: '50+',  label: 'Events', sub: 'races & meetups' },
            { val: '10+',  label: 'Programs', sub: 'for all levels' },
            { val: '5+',   label: 'Years', sub: 'of community' },
          ].map((s, i) => (
            <div
              key={s.label}
              className="stat-card"
              style={{
                '--delay': `${i * 0.12}s`,
                padding: '40px 28px',
                background: i % 2 === 0 ? 'var(--ash)' : 'var(--smoke)',
                borderLeft: i === 0 ? '3px solid var(--fire)' : 'none',
                textAlign: 'center',
              } as any}
            >
              <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(48px, 5vw, 72px)', color: 'var(--fire)', lineHeight: 1, marginBottom: '6px' }}>{s.val}</p>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '18px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--chalk)', marginBottom: '4px' }}>{s.label}</p>
              <p style={{ fontSize: '12px', color: 'var(--fog)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── EVENTS ────────────────────────────────────────────────── */}
      <section style={{ padding: '96px 6%', background: 'var(--ink)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '48px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div className="section-label">On The Calendar</div>
              <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(40px, 5vw, 64px)', color: 'var(--chalk)', lineHeight: 1 }}>
                UPCOMING EVENTS
              </h2>
            </div>
            <Link to="/events" className="trfc-btn-outline" style={{ fontSize: '13px', padding: '10px 24px' }}>
              All Events →
            </Link>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '64px', color: 'var(--fog)', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '2px', textTransform: 'uppercase' }}>
              Loading events...
            </div>
          ) : events.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              {events.map((event: any, idx: number) => (
                <Link to={`/events/${event.id}`} key={event.id} className="event-card" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <div style={{ overflow: 'hidden' }}>
                    <img
                      src={event.image_url || 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=600&q=80'}
                      alt={event.title}
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=600&q=80' }}
                    />
                  </div>
                  <div className="tag">Event</div>
                  <div className="body">
                    <div className="title">{event.title}</div>
                    <div className="loc">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {event.location}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="price">KES {event.price?.toLocaleString?.() ?? event.price}</div>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--fire)', fontWeight: 700 }}>
                        Register →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '64px', color: 'var(--fog)', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '2px', textTransform: 'uppercase' }}>
              No upcoming events yet — check back soon!
            </div>
          )}
        </div>
      </section>

      {/* ── CTA BAND ──────────────────────────────────────────────── */}
      <section style={{
        padding: '80px 6%',
        background: 'linear-gradient(135deg, var(--fire) 0%, var(--ember) 50%, #FF3800 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', right: '-5%', top: '50%', transform: 'translateY(-50%)',
          fontFamily: 'Bebas Neue, sans-serif', fontSize: '260px', color: 'rgba(0,0,0,0.1)',
          lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
        }}>RUN</div>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '32px', position: 'relative' }}>
          <div>
            <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(36px, 5vw, 64px)', color: 'white', lineHeight: 1, marginBottom: '12px' }}>
              READY TO RUN<br />WITH US?
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px', maxWidth: '400px' }}>
              Sign up today and join 500+ athletes who chose community over the treadmill.
            </p>
          </div>
          <Link to="/register" style={{
            background: 'white', color: 'var(--fire)',
            padding: '18px 48px',
            fontFamily: 'Barlow Condensed, sans-serif',
            fontWeight: 900, fontSize: '18px', letterSpacing: '3px', textTransform: 'uppercase',
            textDecoration: 'none',
            clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))',
            display: 'inline-block',
            transition: 'transform 0.15s',
            animation: 'pulse-ring 2s ease infinite',
          }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            Join Now — It's Free
          </Link>
        </div>
      </section>

      {/* ── GALLERY ───────────────────────────────────────────────── */}
      {gallery.length > 0 && (
        <section style={{ padding: '96px 6%', background: 'var(--night)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div className="section-label">On The Ground</div>
                <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(40px, 5vw, 64px)', color: 'var(--chalk)', lineHeight: 1 }}>
                  COMMUNITY GALLERY
                </h2>
              </div>
              <Link to="/gallery" className="trfc-btn-outline" style={{ fontSize: '13px', padding: '10px 24px' }}>
                All Photos →
              </Link>
            </div>

            {/* Masonry-ish grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(2, 220px)', gap: '6px' }}>
              {gallery.slice(0, 6).map((item, i) => (
                <Link
                  to="/gallery"
                  key={item.id}
                  className="gallery-card"
                  style={{
                    gridColumn: i === 0 ? 'span 2' : 'span 1',
                    gridRow: i === 0 ? 'span 2' : 'span 1',
                    aspectRatio: 'unset',
                  }}
                >
                  <img
                    src={item.media_url}
                    alt={item.caption || 'TRFC Community'}
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-155839853${i}-ab89674${i}3?w=600&q=70` }}
                  />
                  <div className="overlay">
                    {item.caption && <p className="cap">{item.caption}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER CTA ────────────────────────────────────────────── */}
      {/* <section style={{
        padding: '60px 6%',
        background: 'var(--ash)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '32px',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '100%',
      }}>
        <div>
          <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '36px', color: 'var(--fire)', letterSpacing: '2px' }}>TRFC</span>
          <p style={{ color: 'var(--fog)', fontSize: '13px', marginTop: '4px' }}>Thika Road Fitness Community · Nairobi, Kenya</p>
        </div>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {[
            { to: '/events', label: 'Events' },
            { to: '/programs', label: 'Programs' },
            { to: '/gallery', label: 'Gallery' },
            { to: '/shop', label: 'Shop' },
            { to: '/register', label: 'Join Us' },
          ].map((l) => (
            <Link key={l.to} to={l.to} style={{
              fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700,
              fontSize: '14px', letterSpacing: '2px', textTransform: 'uppercase',
              color: 'var(--fog)', textDecoration: 'none', transition: 'color 0.2s',
            }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--fire)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fog)')}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <p style={{ color: 'var(--smoke)', fontSize: '12px' }}>© {new Date().getFullYear()} TRFC. All rights reserved.</p>
      </section> */}

    </div>
  )
}