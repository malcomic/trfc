import { Mail, Phone, MapPin, ArrowUpRight, Heart, MessageCircle, Users, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useRef } from 'react'

const footerStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;600&family=Barlow+Condensed:wght@500;700;900&display=swap');

  .trfc-footer {
    --fire: #FF4500;
    --ember: #FF7A1A;
    --night: #0A0A0A;
    --ink: #111111;
    --ash: #1C1C1C;
    --smoke: #2A2A2A;
    --chalk: #F5F2EE;
    --fog: #6B6B6B;
    --mist: #3D3D3D;
    background: var(--night);
    position: relative;
    overflow: hidden;
    font-family: 'Barlow', sans-serif;
  }

  /* Giant ghost word behind everything */
  .trfc-footer__watermark {
    position: absolute;
    bottom: -20px;
    left: 50%;
    transform: translateX(-50%);
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(120px, 18vw, 280px);
    color: rgba(255, 69, 0, 0.04);
    letter-spacing: -4px;
    white-space: nowrap;
    pointer-events: none;
    user-select: none;
    line-height: 1;
  }

  /* Top fire-line divider */
  .trfc-footer__topbar {
    height: 3px;
    background: linear-gradient(90deg, transparent 0%, var(--fire) 30%, var(--ember) 60%, transparent 100%);
  }

  /* Brand column */
  .trfc-footer__brand-name {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 72px;
    color: var(--chalk);
    line-height: 1;
    letter-spacing: 2px;
  }
  .trfc-footer__brand-name span {
    color: var(--fire);
  }
  .trfc-footer__brand-tagline {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 500;
    font-size: 12px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--fog);
    margin-top: 4px;
    margin-bottom: 20px;
  }
  .trfc-footer__brand-desc {
    font-size: 14px;
    line-height: 1.75;
    color: var(--fog);
    max-width: 240px;
  }

  /* Social icons */
  .trfc-footer__socials {
    display: flex;
    gap: 10px;
    margin-top: 28px;
  }
  .trfc-footer__social-btn {
    width: 38px;
    height: 38px;
    border: 1px solid var(--mist);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fog);
    transition: border-color 0.2s, color 0.2s, background 0.2s;
    cursor: pointer;
    text-decoration: none;
    clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
  }
  .trfc-footer__social-btn:hover {
    border-color: var(--fire);
    color: var(--fire);
    background: rgba(255,69,0,0.08);
  }

  /* Column headings */
  .trfc-footer__col-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--fire);
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .trfc-footer__col-label::before {
    content: '';
    display: inline-block;
    width: 16px;
    height: 2px;
    background: var(--fire);
    flex-shrink: 0;
  }

  /* Nav links */
  .trfc-footer__nav-link {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 17px;
    letter-spacing: 0.5px;
    color: rgba(245,242,238,0.55);
    text-decoration: none;
    transition: color 0.2s, padding-left 0.2s;
  }
  .trfc-footer__nav-link:last-child { border-bottom: none; }
  .trfc-footer__nav-link:hover {
    color: var(--chalk);
    padding-left: 6px;
  }
  .trfc-footer__nav-link:hover .trfc-footer__link-arrow {
    color: var(--fire);
    opacity: 1;
  }
  .trfc-footer__link-arrow {
    opacity: 0;
    color: var(--fire);
    transition: opacity 0.2s;
    flex-shrink: 0;
  }

  /* Contact rows */
  .trfc-footer__contact-row {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }
  .trfc-footer__contact-row:last-child { border-bottom: none; }
  .trfc-footer__contact-icon {
    width: 34px;
    height: 34px;
    background: rgba(255,69,0,0.1);
    border: 1px solid rgba(255,69,0,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fire);
    flex-shrink: 0;
    margin-top: 1px;
  }
  .trfc-footer__contact-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--fog);
    margin-bottom: 2px;
  }
  .trfc-footer__contact-value {
    font-size: 14px;
    color: rgba(245,242,238,0.7);
    font-weight: 600;
  }

  /* Admin panel */
  .trfc-footer__admin-link {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 0;
    font-size: 13px;
    color: rgba(245,242,238,0.4);
    text-decoration: none;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    letter-spacing: 0.5px;
    border-bottom: 1px solid rgba(255,255,255,0.03);
    transition: color 0.2s, gap 0.2s;
  }
  .trfc-footer__admin-link:last-child { border-bottom: none; }
  .trfc-footer__admin-link::before {
    content: '';
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--mist);
    flex-shrink: 0;
    transition: background 0.2s;
  }
  .trfc-footer__admin-link:hover { color: var(--fire); gap: 12px; }
  .trfc-footer__admin-link:hover::before { background: var(--fire); }

  /* Bottom bar */
  .trfc-footer__bottom {
    border-top: 1px solid rgba(255,255,255,0.05);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 0;
    flex-wrap: wrap;
    gap: 12px;
  }
  .trfc-footer__bottom-copy {
    font-size: 12px;
    color: var(--fog);
    letter-spacing: 0.5px;
  }
  .trfc-footer__bottom-copy strong {
    color: var(--fire);
    font-family: 'Bebas Neue', sans-serif;
    font-size: 14px;
    letter-spacing: 2px;
  }
  .trfc-footer__bottom-links {
    display: flex;
    gap: 20px;
  }
  .trfc-footer__bottom-link {
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--fog);
    text-decoration: none;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    transition: color 0.2s;
  }
  .trfc-footer__bottom-link:hover { color: var(--fire); }

  /* Vertical rule between columns */
  .trfc-footer__vr {
    width: 1px;
    background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.07) 30%, rgba(255,255,255,0.07) 70%, transparent);
    align-self: stretch;
    display: none;
  }
  @media (min-width: 1024px) { .trfc-footer__vr { display: block; } }

  @media (max-width: 768px) {
    .trfc-footer__brand-name { font-size: 56px; }
    .trfc-footer__grid { grid-template-columns: 1fr 1fr !important; }
  }
  @media (max-width: 480px) {
    .trfc-footer__grid { grid-template-columns: 1fr !important; }
  }
`

export default function Footer() {
  const { user } = useAuth()
  const isAdmin = user && user.role === 'admin'
  const styleRef = useRef<HTMLStyleElement | null>(null)

  useEffect(() => {
    if (document.getElementById('trfc-footer-styles')) return
    const el = document.createElement('style')
    el.id = 'trfc-footer-styles'
    el.textContent = footerStyles
    document.head.appendChild(el)
    styleRef.current = el
    return () => {
      const existing = document.getElementById('trfc-footer-styles')
      if (existing) document.head.removeChild(existing)
    }
  }, [])

  const quickLinks = [
    { to: '/events', label: 'Events' },
    { to: '/programs', label: 'Programs' },
    { to: '/gallery', label: 'Gallery' },
    { to: '/shop', label: 'Shop Merch' },
    { to: '/register', label: 'Join the Community' },
    { to: '/admin/login', label: 'Admin Login' },
  ]

  const adminLinks = [
    { to: '/admin', label: 'Dashboard' },
    { to: '/admin/events', label: 'Manage Events' },
    { to: '/admin/products', label: 'Manage Products' },
    { to: '/admin/gallery', label: 'Manage Gallery' },
    { to: '/admin/orders', label: 'View Orders' },
    { to: '/admin/users', label: 'Manage Users' },
  ]

  const contacts = [
    { icon: <Mail size={15} />, label: 'Email', value: 'info@trfc.ke', href: 'mailto:info@trfc.ke' },
    { icon: <Phone size={15} />, label: 'Phone', value: '+254 712 345 678', href: 'tel:+254712345678' },
    { icon: <MapPin size={15} />, label: 'Location', value: 'Thika Road, Nairobi', href: '#' },
  ]

  const socials = [
    { icon: <Heart size={16} />, href: '#', label: 'Instagram' },
    { icon: <MessageCircle size={16} />, href: '#', label: 'Twitter' },
    { icon: <Users size={16} />, href: '#', label: 'Facebook' },
    { icon: <Play size={16} />, href: '#', label: 'YouTube' },
  ]

  return (
    <footer className="trfc-footer">
      <div className="trfc-footer__topbar" />

      {/* Watermark */}
      <div className="trfc-footer__watermark" aria-hidden="true">
        THIKA ROAD FC
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '64px 6% 0', position: 'relative', zIndex: 1 }}>

        {/* Main grid */}
        <div
          className="trfc-footer__grid"
          style={{
            display: 'grid',
            gridTemplateColumns: isAdmin ? '1.4fr 1px 1fr 1px 1fr 1px 1fr' : '1.4fr 1px 1fr 1px 1.2fr',
            gap: '0 40px',
            paddingBottom: '56px',
          }}
        >

          {/* ── Brand ── */}
          <div>
            <div className="trfc-footer__brand-name">
              TH<span>I</span>KA<br />ROAD<br />FC
            </div>
            <p className="trfc-footer__brand-tagline">Nairobi · Est. 2019</p>
            <p className="trfc-footer__brand-desc">
              Building Nairobi's strongest running community — one kilometre, one race, one sunrise at a time.
            </p>
            <div className="trfc-footer__socials">
              {socials.map((s) => (
                <a key={s.label} href={s.href} aria-label={s.label} className="trfc-footer__social-btn">
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          <div className="trfc-footer__vr" />

          {/* ── Quick Links ── */}
          <div>
            <div className="trfc-footer__col-label">Navigation</div>
            <nav>
              {quickLinks.map((l) => (
                <Link to={l.to} key={l.to} className="trfc-footer__nav-link">
                  {l.label}
                  <ArrowUpRight size={14} className="trfc-footer__link-arrow" />
                </Link>
              ))}
            </nav>
          </div>

          <div className="trfc-footer__vr" />

          {/* ── Contact ── */}
          <div>
            <div className="trfc-footer__col-label">Get In Touch</div>
            {contacts.map((c) => (
              <a key={c.label} href={c.href} style={{ textDecoration: 'none' }}>
                <div className="trfc-footer__contact-row">
                  <div className="trfc-footer__contact-icon">{c.icon}</div>
                  <div>
                    <div className="trfc-footer__contact-label">{c.label}</div>
                    <div className="trfc-footer__contact-value">{c.value}</div>
                  </div>
                </div>
              </a>
            ))}

            {/* Newsletter mini CTA */}
            <div style={{ marginTop: '28px', padding: '18px', background: 'rgba(255,69,0,0.06)', border: '1px solid rgba(255,69,0,0.15)' }}>
              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--chalk)', marginBottom: '12px' }}>
                Stay in the loop
              </p>
              <div style={{ display: 'flex', gap: '0' }}>
                <input
                  type="email"
                  placeholder="your@email.com"
                  style={{
                    flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRight: 'none', padding: '9px 12px', color: 'var(--chalk)',
                    fontSize: '13px', fontFamily: 'Barlow, sans-serif', outline: 'none',
                    minWidth: 0,
                  }}
                />
                <button style={{
                  background: 'var(--fire)', border: 'none', color: 'white',
                  padding: '9px 14px', cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif',
                  fontWeight: 700, fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase',
                  transition: 'background 0.2s', flexShrink: 0,
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#FF7A1A')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--fire)')}
                >
                  Join
                </button>
              </div>
            </div>
          </div>

          {/* ── Admin Panel (conditional) ── */}
          {isAdmin && (
            <>
              <div className="trfc-footer__vr" />
              <div>
                <div className="trfc-footer__col-label" style={{ color: '#C9A84C' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                      <polygon points="5,0 10,10 0,10" />
                    </svg>
                    Admin Panel
                  </span>
                </div>
                {adminLinks.map((l) => (
                  <Link to={l.to} key={l.to} className="trfc-footer__admin-link">
                    {l.label}
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Bottom bar */}
        <div className="trfc-footer__bottom">
          <p className="trfc-footer__bottom-copy">
            © {new Date().getFullYear()} <strong>TRFC</strong> · Thika Road Fitness Community · Nairobi, Kenya
          </p>
          <div className="trfc-footer__bottom-links">
            <a href="#" className="trfc-footer__bottom-link">Privacy</a>
            <a href="#" className="trfc-footer__bottom-link">Terms</a>
            <a href="#" className="trfc-footer__bottom-link">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  )
}