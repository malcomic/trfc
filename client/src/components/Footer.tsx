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
  'font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent mb-3 flex items-center gap-2 before:w-4 before:h-0.5 before:bg-accent before:inline-block before:flex-shrink-0'

const linkClass =
  'block py-1 font-barlow-condensed font-bold text-base tracking-tight text-chalk/60 no-underline underline-offset-4 transition-all duration-200 hover:text-chalk hover:underline hover:translate-x-1'

const adminLinkClass =
  'block py-0.5 text-xs text-chalk/50 no-underline font-barlow-condensed font-bold tracking-widest uppercase transition-colors duration-200 hover:text-accent'

const bottomLinkClass =
  'text-xs tracking-widest uppercase text-fog no-underline underline-offset-4 font-barlow-condensed font-bold transition-all duration-200 hover:text-accent hover:underline'

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
        { to: '/coach-with-us', label: 'Work with us' },
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
    <footer className="bg-night text-chalk relative overflow-hidden font-barlow">
      {/* Top divider */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent opacity-60" />

      {/* Watermark */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 font-bebas text-clamp-3xl text-accent/[0.07] tracking-tighter whitespace-nowrap pointer-events-none select-none leading-none transform -translate-y-0.5">
        MOVE TOGETHER · GROW TOGETHER
      </div>

      <div className="max-w-6xl mx-auto px-[6%] pt-10 relative z-10">
        {/* Main grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 pb-8 lg:grid-cols-[1.5fr_repeat(4,minmax(0,1fr))_1.6fr] lg:gap-x-8">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            {/* Logo only self-inverts in dark mode; footer is always black, so invert it in light mode too */}
            <Logo size="md" className="mb-2 light:invert" />
            <p className="font-barlow-condensed font-medium text-xs tracking-widest uppercase text-fog mb-2">Nairobi · Est. July 2025</p>
            <p className="text-sm text-fog">Move Together. Grow Together.</p>
            <div className="flex gap-2.5 mt-4">
              {siteSocial.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="w-10 h-10 border border-mist flex items-center justify-center text-fog transition-all duration-200 hover:border-accent hover:text-chalk-light hover:bg-night-light clip-angled-sm">
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
                    <span className="w-7 h-7 bg-ash border border-mist flex items-center justify-center text-chalk flex-shrink-0" aria-hidden="true">
                      {c.icon}
                    </span>
                    <span className="sr-only">{c.label}: </span>
                    <span className="text-sm text-chalk/70 font-semibold break-words min-w-0 transition-colors duration-200 group-hover:text-chalk">
                      {c.value}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter strip */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 py-4 px-4 mb-6 bg-ash border border-white/10">
          <p className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-chalk sm:flex-1">
            Stay in the loop
          </p>
          <div className="flex w-full sm:max-w-sm">
            <input
              type="email"
              placeholder="your@email.com"
              aria-label="Email address"
              className="flex-1 min-w-0 bg-night border border-white/10 border-r-0 px-3 py-2 text-chalk placeholder:text-fog text-xs font-barlow outline-none transition-all duration-200 focus:border-white/35"
            />
            <button type="button" onClick={showNewsletterToast} className="bg-night-light border border-night-light text-chalk-light px-3.5 py-2 cursor-pointer font-barlow-condensed font-bold text-xs tracking-widest uppercase transition-all duration-200 hover:opacity-85 flex-shrink-0">
              Join
            </button>
          </div>
        </div>

        {/* Admin shortcuts (collapsed) */}
        {isAdmin && (
          <details className="group mb-6 border border-white/10">
            <summary className="flex items-center justify-between gap-2 px-4 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog hover:text-accent transition-colors">
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
                  <div className="font-barlow-condensed font-bold text-[0.65rem] tracking-widest uppercase text-fog mb-1.5">
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
        <div className="border-t border-white/10 flex items-center justify-between py-4 flex-wrap gap-3">
          <p className="text-xs text-fog tracking-tighter">
            © {new Date().getFullYear()} Thika Road Fitness Community. All Rights Reserved.
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link to="/privacy" className={bottomLinkClass}>Privacy</Link>
            <Link to="/terms" className={bottomLinkClass}>Terms</Link>
            <Link to="/contact" className={bottomLinkClass}>Contact</Link>
            <Link to="/coach-with-us" className={bottomLinkClass}>Work with us</Link>
          </div>
        </div>
      </div>
      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </footer>
  )
}
