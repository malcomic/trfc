import { Link } from 'react-router-dom'
import { Users, Trophy, Apple, Sunrise, ArrowRight } from 'lucide-react'

const PROGRAMS = [
  {
    icon: Sunrise,
    title: 'Group Runs',
    desc: 'Weekly community runs along Thika Road and beyond. All paces welcome — nobody gets left behind.',
    cta: { to: '/events', label: 'See Upcoming Runs' },
  },
  {
    icon: Trophy,
    title: 'Race Challenges',
    desc: 'Monthly distance and pace challenges with leaderboard recognition and TRFC merch prizes.',
    cta: { to: '/events', label: 'Join a Challenge' },
  },
  {
    icon: Apple,
    title: 'Nutrition Workshops',
    desc: 'Fuel your training with expert-led sessions on race-day nutrition and recovery eating.',
    cta: { to: '/register', label: 'Become a Member' },
  },
  {
    icon: Users,
    title: 'Beginner Bootcamp',
    desc: 'Structured 8-week programme for new runners — couch to 5K with coached sessions.',
    cta: { to: '/register', label: 'Sign Up' },
  },
]

export default function Programs() {
  return (
    <div className="min-h-screen bg-night text-chalk font-barlow">
      <section className="bg-ink border-b border-white/5 px-[6%] pt-14 pb-11 relative overflow-hidden">
        <div className="absolute right-[-1%] bottom-[-16px] font-bebas text-clamp-2xl text-fire/5 leading-none pointer-events-none select-none">PROGRAMS</div>
        <div className="max-w-5xl mx-auto relative z-1">
          <div className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire flex items-center gap-2 mb-3 before:w-5 before:h-0.5 before:bg-fire">Train With Us</div>
          <h1 className="font-bebas text-5xl leading-tight">TRFC<br /><span className="text-fire">PROGRAMS</span></h1>
          <p className="text-fog mt-4 max-w-xl">Structured training, community accountability, and programmes built for every level — from first 5K to marathon prep.</p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-[6%] py-10 pb-20 grid grid-cols-1 md:grid-cols-2 gap-4">
        {PROGRAMS.map(({ icon: Icon, title, desc, cta }) => (
          <div key={title} className="bg-ash border border-white/5 p-8 flex flex-col hover:border-fire/25 transition">
            <div className="w-12 h-12 bg-fire/10 border border-fire/20 flex items-center justify-center text-fire mb-5">
              <Icon size={22} />
            </div>
            <h2 className="font-barlow-condensed font-bold text-2xl letter-spacing-tighter mb-3">{title}</h2>
            <p className="text-fog text-sm leading-relaxed flex-1 mb-6">{desc}</p>
            <Link to={cta.to} className="inline-flex items-center gap-2 text-fire font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase no-underline hover:gap-3 transition-all">
              {cta.label} <ArrowRight size={14} />
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
