import { Link } from 'react-router-dom'
import { Footprints, Calendar, Mountain, PartyPopper, Target, Users, HeartHandshake, ArrowRight } from 'lucide-react'
import { pageRoot, cardSurface } from '../utils/themeClasses'

const PROGRAMS = [
  {
    icon: Footprints,
    title: 'Weekly Community Runs & Walks',
    desc: 'Regular sessions for all paces — run, jog, or walk together with accountability and encouragement.',
    cta: { to: '/events', label: 'See Upcoming Runs' },
  },
  {
    icon: Calendar,
    title: 'Monthly Community Runs',
    desc: 'Bigger monthly gatherings that bring the full TRFC community together on the road.',
    cta: { to: '/events', label: 'View Monthly Runs' },
  },
  {
    icon: Mountain,
    title: 'Hiking Adventures',
    desc: 'Explore trails and outdoor routes as a community — fitness, fresh air, and shared adventure.',
    cta: { to: '/events', label: 'Find a Hike' },
  },
  {
    icon: PartyPopper,
    title: 'Fit Festivals',
    desc: 'High-energy community events celebrating movement, wellness, and togetherness.',
    cta: { to: '/events', label: 'Upcoming Festivals' },
  },
  {
    icon: Target,
    title: 'Wellness Challenges',
    desc: 'Structured challenges that keep members motivated, consistent, and growing together.',
    cta: { to: '/register', label: 'Join a Challenge' },
  },
  {
    icon: Users,
    title: 'Team Building Activities',
    desc: 'Group activations designed for corporate teams, friends, and community groups.',
    cta: { to: '/partnerships', label: 'Partner With Us' },
  },
  {
    icon: HeartHandshake,
    title: 'Accountability Programs',
    desc: 'Support systems and check-ins that help members stay on track with their health goals.',
    cta: { to: '/register', label: 'Get Started' },
  },
]

export default function Programs() {
  return (
    <div className={pageRoot}>
      <section className="bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-14 pb-11 relative overflow-hidden">
        <div className="absolute right-[-1%] bottom-[-16px] font-bebas text-clamp-2xl text-accent/5 light:text-accent-light/5 leading-none pointer-events-none select-none">PROGRAMS</div>
        <div className="max-w-5xl mx-auto relative z-1">
          <div className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light flex items-center gap-2 mb-3 before:w-5 before:h-0.5 before:bg-accent light:before:bg-accent-light">Train With Us</div>
          <h1 className="font-bebas text-5xl leading-tight text-chalk light:text-chalk-light">TRFC<br /><span className="text-accent light:text-accent-light">PROGRAMS</span></h1>
          <p className="text-fog light:text-fog-light mt-4 max-w-xl">
            From weekly runs and hikes to fit festivals and accountability programmes — TRFC offers experiences for every fitness level.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-[6%] py-10 pb-20 grid grid-cols-1 md:grid-cols-2 gap-4">
        {PROGRAMS.map(({ icon: Icon, title, desc, cta }) => (
          <div key={title} className={`${cardSurface} p-8 flex flex-col hover:border-accent/25 light:hover:border-accent-light/25 transition`}>
            <div className="w-12 h-12 bg-accent/10 light:bg-accent-light/10 border border-accent/20 light:border-accent-light/20 flex items-center justify-center text-accent light:text-accent-light mb-5">
              <Icon size={22} />
            </div>
            <h2 className="font-barlow-condensed font-bold text-2xl tracking-tighter mb-3">{title}</h2>
            <p className="text-fog light:text-fog-light text-sm leading-relaxed flex-1 mb-6">{desc}</p>
            <Link to={cta.to} className="inline-flex items-center gap-2 text-accent light:text-accent-light font-barlow-condensed font-bold text-sm tracking-widest uppercase no-underline hover:gap-3 transition-all">
              {cta.label} <ArrowRight size={14} />
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
