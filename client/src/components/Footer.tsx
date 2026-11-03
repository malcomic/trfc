import { Mail, Phone, MapPin, ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'
import { ToastStack, ToastMessage } from './Toast'
import { siteContact, siteSocial } from '../config/site'
import { Logo } from './Logo'
import { SocialIcon } from './SocialIcon'
import { adminNavEntries, isNavGroup } from './admin/adminNav'

type FooterLink = { to: string; label: string }

const headingClass =
  'font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light mb-3 flex items-center gap-2 before:w-4 before:h-0.5 before:bg-accent light:before:bg-accent-light before:inline-block before:flex-shrink-0'

const linkClass =
  'block py-1 font-barlow-condensed font-bold text-base tracking-tight text-chalk/60 light:text-chalk-light/60 no-underline transition-all duration-200 hover:text-chalk light:hover:text-chalk-light hover:translate-x-1'

const adminLinkClass =
  'block py-0.5 text-xs text-chalk/50 light:text-chalk-light/50 no-underline font-barlow-condensed font-bold tracking-widest uppercase transition-colors duration-200 hover:text-accent light:hover:text-accent-light'

const adminGroups = (() => {
  const general = adminNavEntries.flatMap((e) =>
    isNavGroup(e) ? [] : [{ to: e.path, label: e.label }]
  )
  const grouped = adminNavEntries.filter(isNavGroup).map((g) => ({
    label: g.label,
    links: g.children.map((c) => ({ to: c.path, label: c.label })),
  }))
  return [{ label: 'General', links: general }, ...grouped]
})()

export default function Footer() {
  const { user } = useAuth()
  const isAdmin = user && user.role === 'admin'
  const isScanner = user && user.role === 'scanner'
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showNewsletterToast = () => {
    const id = Date.now()
    setToasts((t) => [...t, { id, type: 'info', title: 'Coming soon', message: 'Newsletter signup is not available yet.' }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000)
  }

  const staffLink: FooterLink =
    isAdmin || isScanner
      ? { to: '/admin/scan', label: 'Open Scanner' }
      : { to: '/admin/login', label: 'Staff Login' }

  const linkGroups: { title: string; links: FooterLink[] }[] = [
    {
      title: 'Explore',
      links: [
        { to: '/about', label: 'About' },
        { to: '/programs', label: 'Programs' },
        { to: '/gallery', label: 'Gallery' },
        { to: '/testimonials', label: 'Testimonials' },
      ],
    },
    {
      title: 'Events',
      links: [
        { to: '/events', label: 'Events' },
        { to: '/find-tickets', label: 'Find My Tickets' },
        { to: '/medals', label: 'Medals' },
      ],
    },
    {
      title: 'Shop & Partners',
      links: [
        { to: '/shop', label: 'Shop Merch' },
        { to: '/equipment', label: 'Equipment' },
        { to: '/partnerships', label: 'Partnerships' },
      ],
    },
    {
      title: 'Community',
      links: [
        { to: '/register', label: 'Join the Community' },
        { to: '/contact', label: 'Contact' },
        staffLink,
      ],
    },
  ]

  const contacts = [
    { icon: <Mail size={15} />, label: 'Email', value: siteContact.email, href: `mailto:${siteContact.email}` },
    { icon: <Phone size={15} />, label: 'Phone', value: siteContact.phone, href: `tel:${siteContact.phoneTel}` },
    { icon: <MapPin size={15} />, label: 'Location', value: siteContact.location, href: siteContact.mapsUrl },
  ]

  return (
    <footer className="bg-night light:bg-ink-light text-chalk light:text-chalk-light relative overflow-hidden font-barlow">
      {/* Top fire-line divider */}
      <div className="h-0.75 bg-gradient-to-r from-transparent via-accent light:via-accent-light to-transparent opacity-75" />

      {/* Watermark */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 font-bebas text-clamp-3xl text-accent/5 light:text-accent-light/5 tracking-tighter whitespace-nowrap pointer-events-none select-none leading-none transform -translate-y-0.5">
        MOVE TOGETHER · GROW TOGETHER
      </div>

      <div className="max-w-6xl mx-auto px-[6%] pt-10 relative z-10">
        {/* Main grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 pb-8 lg:grid-cols-[1.5fr_repeat(4,minmax(0,1fr))_1.6fr] lg:gap-x-8">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <Logo size="md" className="mb-2" />
            <p className="font-barlow-condensed font-medium text-xs tracking-widest uppercase text-fog light:text-fog-light mb-2">Nairobi · Est. July 2025</p>
            <p className="text-sm text-fog light:text-fog-light">Move Together. Grow Together.</p>
            <div className="flex gap-2.5 mt-4">
              {siteSocial.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="w-10 h-10 border border-mist light:border-mist-light flex items-center justify-center text-fog light:text-fog-light transition-all duration-200 hover:border-accent light:hover:border-accent-light hover:text-accent light:hover:text-accent-light hover:bg-accent/10 light:hover:bg-accent-light/10 clip-angled-sm">
                  <SocialIcon name={s.label} size={17} />
                </a>
              ))}
            </div>
          </div>

          {/* Link groups */}
          {linkGroups.map((group) => (
            <nav key={group.title} aria-label={group.title} className="col-span-1">
              <div className={headingClass}>{group.title}</div>
              {group.links.map((l) => (
                <Link key={l.to} to={l.to} className={linkClass}>
                  {l.label}
                </Link>
              ))}
            </nav>
          ))}

          {/* Contact */}
          <div className="col-span-2 lg:col-span-1">
            <div className={headingClass}>Get In Touch</div>
            <ul className="space-y-2">
              {contacts.map((c) => (
                <li key={c.label}>
                  <a href={c.href} className="no-underline flex items-center gap-2.5 group">
                    <span className="w-7 h-7 bg-accent/10 light:bg-accent-light/10 border border-accent/20 light:border-accent-light/20 flex items-center justify-center text-accent light:text-accent-light flex-shrink-0" aria-hidden="true">
                      {c.icon}
                    </span>
                    <span className="sr-only">{c.label}: </span>
                    <span className="text-sm text-chalk/70 light:text-chalk-light/70 font-semibold break-words min-w-0 transition-colors duration-200 group-hover:text-chalk light:group-hover:text-chalk-light">
                      {c.value}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter strip */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 py-4 px-4 mb-6 bg-accent/10 light:bg-accent-light/10 border border-accent/15 light:border-accent-light/15">
          <p className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-chalk light:text-chalk-light sm:flex-1">
            Stay in the loop
          </p>
          <div className="flex w-full sm:max-w-sm">
            <input
              type="email"
              placeholder="your@email.com"
              aria-label="Email address"
              className="flex-1 min-w-0 bg-black/40 light:bg-smoke-light border border-white/10 light:border-black/10 border-r-0 px-3 py-2 text-chalk light:text-chalk-light text-xs font-barlow outline-none transition-all duration-200 focus:border-accent/35 light:focus:border-accent-light/35"
            />
            <button type="button" onClick={showNewsletterToast} className="bg-cta border border-cta text-cta-ink px-3.5 py-2 cursor-pointer font-barlow-condensed font-bold text-xs tracking-widest uppercase transition-all duration-200 hover:bg-cta/90 flex-shrink-0">
              Join
            </button>
          </div>
        </div>

        {/* Admin shortcuts (collapsed) */}
        {isAdmin && (
          <details className="group mb-6 border border-white/5 light:border-black/8">
            <summary className="flex items-center justify-between gap-2 px-4 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog light:text-fog-light hover:text-accent light:hover:text-accent-light transition-colors">
              <span className="flex items-center gap-2">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
                  <polygon points="5,0 10,10 0,10" />
                </svg>
                Admin shortcuts
              </span>
              <ChevronDown size={16} aria-hidden="true" className="transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-x-6 gap-y-4 px-4 pb-4">
              {adminGroups.map((g) => (
                <div key={g.label}>
                  <div className="font-barlow-condensed font-bold text-[0.65rem] tracking-widest uppercase text-fog light:text-fog-light mb-1.5">
                    {g.label}
                  </div>
                  {g.links.map((l) => (
                    <Link key={l.to} to={l.to} className={adminLinkClass}>
                      {l.label}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Bottom bar */}
        <div className="border-t border-white/5 light:border-black/8 flex items-center justify-between py-4 flex-wrap gap-3">
          <p className="text-xs text-fog light:text-fog-light tracking-tighter">
            © {new Date().getFullYear()} Thika Road Fitness Community. All Rights Reserved.
          </p>
          <div className="flex gap-5">
            <Link to="/privacy" className="text-xs tracking-widest uppercase text-fog light:text-fog-light no-underline font-barlow-condensed font-bold transition-all duration-200 hover:text-accent light:hover:text-accent-light">Privacy</Link>
            <Link to="/terms" className="text-xs tracking-widest uppercase text-fog light:text-fog-light no-underline font-barlow-condensed font-bold transition-all duration-200 hover:text-accent light:hover:text-accent-light">Terms</Link>
            <Link to="/contact" className="text-xs tracking-widest uppercase text-fog light:text-fog-light no-underline font-barlow-condensed font-bold transition-all duration-200 hover:text-accent light:hover:text-accent-light">Contact</Link>
          </div>
        </div>
      </div>
      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </footer>
  )
}
