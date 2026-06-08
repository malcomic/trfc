import { Link } from 'react-router-dom'
import { CreditCard, Ticket, User, ArrowRight } from 'lucide-react'
import { pageRoot, cardSurface } from '../utils/themeClasses'

export default function Account() {
  const links = [
    { to: '/account/payments', label: 'Payment History', desc: 'View orders, tickets, and hire payments', icon: CreditCard },
    { to: '/account/tickets', label: 'My Tickets', desc: 'Your event tickets and registration status', icon: Ticket },
  ]

  return (
    <div className={pageRoot}>
      <section className="bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-14 pb-11">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <User className="text-accent light:text-accent-light" size={32} />
          <div>
            <h1 className="font-bebas text-5xl text-chalk light:text-chalk-light">MY <span className="text-accent light:text-accent-light">ACCOUNT</span></h1>
            <p className="text-fog light:text-fog-light text-sm">Manage your TRFC membership and purchases</p>
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-[6%] py-10 pb-20 grid gap-4">
        {links.map(({ to, label, desc, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={`${cardSurface} p-6 flex items-center gap-5 no-underline text-chalk light:text-chalk-light hover:border-accent/30 light:hover:border-accent-light/30 transition group`}
          >
            <div className="w-12 h-12 bg-accent/10 light:bg-accent-light/10 border border-accent/20 light:border-accent-light/20 flex items-center justify-center text-accent light:text-accent-light flex-shrink-0">
              <Icon size={22} />
            </div>
            <div className="flex-1">
              <h2 className="font-barlow-condensed font-bold text-xl tracking-tighter">{label}</h2>
              <p className="text-sm text-fog light:text-fog-light">{desc}</p>
            </div>
            <ArrowRight size={18} className="text-accent light:text-accent-light opacity-0 group-hover:opacity-100 transition" />
          </Link>
        ))}
      </div>
    </div>
  )
}
