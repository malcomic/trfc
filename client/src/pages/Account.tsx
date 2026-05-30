import { Link } from 'react-router-dom'
import { CreditCard, Ticket, User, ArrowRight } from 'lucide-react'

export default function Account() {
  const links = [
    { to: '/account/payments', label: 'Payment History', desc: 'View orders, tickets, and hire payments', icon: CreditCard },
    { to: '/account/tickets', label: 'My Tickets', desc: 'Your event tickets and registration status', icon: Ticket },
  ]

  return (
    <div className="min-h-screen bg-night text-chalk font-barlow">
      <section className="bg-ink border-b border-white/5 px-[6%] pt-14 pb-11">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <User className="text-fire" size={32} />
          <div>
            <h1 className="font-bebas text-5xl">MY <span className="text-fire">ACCOUNT</span></h1>
            <p className="text-fog text-sm">Manage your TRFC membership and purchases</p>
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-[6%] py-10 pb-20 grid gap-4">
        {links.map(({ to, label, desc, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="bg-ash border border-white/5 p-6 flex items-center gap-5 no-underline text-chalk hover:border-fire/30 transition group"
          >
            <div className="w-12 h-12 bg-fire/10 border border-fire/20 flex items-center justify-center text-fire flex-shrink-0">
              <Icon size={22} />
            </div>
            <div className="flex-1">
              <h2 className="font-barlow-condensed font-bold text-xl letter-spacing-tighter">{label}</h2>
              <p className="text-sm text-fog">{desc}</p>
            </div>
            <ArrowRight size={18} className="text-fire opacity-0 group-hover:opacity-100 transition" />
          </Link>
        ))}
      </div>
    </div>
  )
}
