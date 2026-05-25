import { Mail, Phone, MapPin, ArrowUpRight, Heart, MessageCircle, Users, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Footer() {
  const { user } = useAuth()
  const isAdmin = user && user.role === 'admin'

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
    <footer className="bg-night dark:bg-night relative overflow-hidden font-barlow">
      {/* Top fire-line divider */}
      <div className="h-0.75 bg-gradient-to-r from-transparent via-fire to-transparent opacity-75" />

      {/* Watermark */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 font-bebas text-clamp-3xl text-fire/5 letter-spacing-tighter white-space-nowrap pointer-events-none select-none leading-none transform -translate-y-0.5">
        THIKA ROAD FC
      </div>

      <div className="max-w-5xl mx-auto px-[6%] pt-16 relative z-10">

        {/* Main grid */}
        <div
          className={`grid gap-x-10 pb-14 ${
            isAdmin ? 'md:grid-cols-7' : 'md:grid-cols-5'
          } grid-cols-1 sm:grid-cols-2`}
        >

          {/* ── Brand ── */}
          <div className="col-span-1">
            <div className="font-bebas text-5xl text-chalk leading-none letter-spacing-widest mb-1">
              TH<span className="text-fire">I</span>KA<br />ROAD<br />FC
            </div>
            <p className="font-barlow-condensed font-medium text-xs letter-spacing-widest text-transform-uppercase text-fog mt-1 mb-5">Nairobi · Est. 2019</p>
            <p className="text-sm leading-loose text-fog max-w-56">
              Building Nairobi's strongest running community — one kilometre, one race, one sunrise at a time.
            </p>
            <div className="flex gap-2.5 mt-7">
              {socials.map((s) => (
                <a key={s.label} href={s.href} aria-label={s.label} className="w-10 h-10 border border-mist flex items-center justify-center text-fog transition-all duration-200 hover:border-fire hover:text-fire hover:bg-fire/10 clip-angled-sm">
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Vertical divider */}
          <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />

          {/* ── Quick Links ── */}
          <div className="col-span-1">
            <div className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire mb-5 flex items-center gap-2 before:w-4 before:h-0.5 before:bg-fire before:inline-block before:flex-shrink-0">
              Navigation
            </div>
            <nav className="flex flex-col">
              {quickLinks.map((l) => (
                <Link to={l.to} key={l.to} className="flex items-center justify-between py-2 border-b border-white/5 font-barlow-condensed font-bold text-lg letter-spacing-tighter text-chalk/55 text-decoration-none transition-all duration-200 hover:text-chalk hover:pl-1.5 last:border-b-0 group">
                  {l.label}
                  <ArrowUpRight size={14} className="text-fire opacity-0 group-hover:opacity-100 flex-shrink-0" />
                </Link>
              ))}
            </nav>
          </div>

          {/* Vertical divider */}
          <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />

          {/* ── Contact ── */}
          <div className="col-span-1">
            <div className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire mb-5 flex items-center gap-2 before:w-4 before:h-0.5 before:bg-fire before:inline-block before:flex-shrink-0">
              Get In Touch
            </div>
            {contacts.map((c) => (
              <a key={c.label} href={c.href} className="text-decoration-none block">
                <div className="flex items-start gap-3.5 py-2.5 border-b border-white/5 last:border-b-0">
                  <div className="w-8.5 h-8.5 bg-fire/10 border border-fire/20 flex items-center justify-center text-fire flex-shrink-0 mt-0.25">
                    {c.icon}
                  </div>
                  <div>
                    <div className="font-barlow-condensed text-xs letter-spacing-widest text-transform-uppercase text-fog mb-0.5">
                      {c.label}
                    </div>
                    <div className="text-sm text-chalk/70 font-semibold">
                      {c.value}
                    </div>
                  </div>
                </div>
              </a>
            ))}

            {/* Newsletter mini CTA */}
            <div className="mt-7 p-4.5 bg-fire/10 border border-fire/15">
              <p className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-chalk mb-3">
                Stay in the loop
              </p>
              <div className="flex gap-0">
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="flex-1 bg-black/40 border border-white/10 border-r-0 px-3 py-2 text-chalk text-xs font-barlow outline-none transition-all duration-200 focus:border-fire/35 min-w-0"
                />
                <button className="bg-fire border border-fire text-white px-3.5 py-2 cursor-pointer font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase transition-all duration-200 hover:bg-ember flex-shrink-0">
                  Join
                </button>
              </div>
            </div>
          </div>

          {/* ── Admin Panel (conditional) ── */}
          {isAdmin && (
            <>
              <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
              <div className="col-span-1">
                <div className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-gold mb-5 flex items-center gap-2">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                    <polygon points="5,0 10,10 0,10" />
                  </svg>
                  Admin Panel
                </div>
                {adminLinks.map((l) => (
                  <Link to={l.to} key={l.to} className="flex items-center gap-2 py-1.75 text-xs text-chalk/40 text-decoration-none font-barlow-condensed font-bold letter-spacing-widest text-transform-uppercase border-b border-white/5 transition-all duration-200 hover:text-fire hover:gap-3 last:border-b-0 before:w-1 before:h-1 before:rounded-full before:bg-mist before:flex-shrink-0 before:transition-all before:duration-200 hover:before:bg-fire">
                    {l.label}
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 flex items-center justify-between pt-5 pb-5 flex-wrap gap-3">
          <p className="text-xs text-fog letter-spacing-tighter">
            © {new Date().getFullYear()} <strong className="text-fire font-bebas text-sm letter-spacing-widest">TRFC</strong> · Thika Road Fitness Community · Nairobi, Kenya
          </p>
          <div className="flex gap-5">
            <a href="#" className="text-xs letter-spacing-widest text-transform-uppercase text-fog text-decoration-none font-barlow-condensed font-bold transition-all duration-200 hover:text-fire">Privacy</a>
            <a href="#" className="text-xs letter-spacing-widest text-transform-uppercase text-fog text-decoration-none font-barlow-condensed font-bold transition-all duration-200 hover:text-fire">Terms</a>
            <a href="#" className="text-xs letter-spacing-widest text-transform-uppercase text-fog text-decoration-none font-barlow-condensed font-bold transition-all duration-200 hover:text-fire">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
