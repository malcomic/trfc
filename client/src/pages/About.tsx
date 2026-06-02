import { Link } from 'react-router-dom'
import { Users, Target, Heart, Trophy, ArrowRight } from 'lucide-react'
import { pageRoot, cardSurface } from '../utils/themeClasses'

const VALUES = [
  {
    icon: Users,
    title: 'Community First',
    desc: 'Every run is a shared experience. We show up for each other — at sunrise, at races, and on rest days.',
  },
  {
    icon: Target,
    title: 'Accountability',
    desc: 'Structured training and honest feedback keep you moving forward, whether you are chasing a PB or your first 5K.',
  },
  {
    icon: Heart,
    title: 'Inclusivity',
    desc: 'All paces welcome. Nobody gets left behind on Thika Road — beginners and veterans train side by side.',
  },
  {
    icon: Trophy,
    title: 'Performance',
    desc: 'We celebrate progress at every level — from couch to 5K, half marathon prep, and beyond.',
  },
]

export default function About() {
  return (
    <div className={pageRoot}>
      <section className="bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-14 pb-11 relative overflow-hidden">
        <div className="absolute right-[-1%] bottom-[-16px] font-bebas text-clamp-2xl text-fire/5 leading-none pointer-events-none select-none">ABOUT</div>
        <div className="max-w-5xl mx-auto relative z-1">
          <div className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire flex items-center gap-2 mb-3 before:w-5 before:h-0.5 before:bg-fire">Our Story</div>
          <h1 className="font-bebas text-5xl leading-tight text-chalk light:text-chalk-light">THIKA ROAD<br /><span className="text-fire">FITNESS COMMUNITY</span></h1>
          <p className="text-fog light:text-fog-light mt-4 max-w-2xl leading-relaxed">
            Born along Nairobi&apos;s Thika Road corridor in 2019, TRFC started as a handful of runners meeting before dawn.
            Today we are 500+ members strong — a movement built on sweat, consistency, and the belief that fitness is better together.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-[6%] py-10 pb-20 space-y-16">
        <section>
          <h2 className="font-bebas text-4xl text-chalk light:text-chalk-light mb-4">OUR MISSION</h2>
          <p className="text-fog light:text-fog-light leading-relaxed max-w-3xl">
            To build Nairobi&apos;s strongest running community by making fitness accessible, social, and sustainable.
            We create spaces — on the road, at events, and online — where every member feels seen, supported, and challenged to grow.
          </p>
        </section>

        <section>
          <h2 className="font-bebas text-4xl text-chalk light:text-chalk-light mb-6">WHAT WE STAND FOR</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {VALUES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className={`${cardSurface} p-8`}>
                <div className="w-12 h-12 bg-fire/10 border border-fire/20 flex items-center justify-center text-fire mb-5">
                  <Icon size={22} />
                </div>
                <h3 className="font-barlow-condensed font-bold text-xl letter-spacing-tighter mb-2">{title}</h3>
                <p className="text-fog light:text-fog-light text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-bebas text-4xl text-chalk light:text-chalk-light mb-6">MEET THE COACH</h2>
          <div className={`${cardSurface} p-8 md:p-10 flex flex-col md:flex-row gap-8 items-start`}>
            <div className="w-32 h-32 md:w-40 md:h-40 flex-shrink-0 bg-ash light:bg-ash-light border border-fire/20 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80"
                alt="Coach James Mwangi"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <p className="font-barlow-condensed font-bold text-xs letter-spacing-widest text-transform-uppercase text-fire mb-2">Head Coach</p>
              <h3 className="font-barlow-condensed font-bold text-3xl letter-spacing-tighter text-chalk light:text-chalk-light mb-3">James Mwangi</h3>
              <p className="text-fog light:text-fog-light text-sm leading-relaxed mb-4">
                Certified running coach with 8+ years coaching recreational and competitive athletes across Nairobi.
                James founded TRFC to give Thika Road residents a home for structured training, race prep, and community accountability.
              </p>
              <ul className="text-sm text-fog light:text-fog-light space-y-1.5 mb-6">
                <li>• Athletics Kenya Level 2 Coach</li>
                <li>• Former Nairobi Half Marathon finisher (sub-1:30)</li>
                <li>• Specialises in beginner programmes and marathon build-ups</li>
              </ul>
              <Link to="/programs" className="inline-flex items-center gap-2 text-fire font-barlow-condensed font-bold text-sm letter-spacing-widest text-transform-uppercase no-underline hover:gap-3 transition-all">
                Explore Programs <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-gradient-to-r from-fire/10 to-transparent border border-fire/15 p-8 clip-angled">
          <h2 className="font-bebas text-3xl text-chalk light:text-chalk-light mb-3">READY TO JOIN?</h2>
          <p className="text-fog light:text-fog-light text-sm mb-6 max-w-lg">
            Membership is free. Show up for a group run, enter an event, or sign up online — your community is waiting.
          </p>
          <Link to="/register" className="inline-flex bg-fire text-white px-8 py-3 clip-angled font-barlow-condensed font-black text-sm letter-spacing-widest text-transform-uppercase no-underline hover:bg-ember">
            Join TRFC
          </Link>
        </section>
      </div>
    </div>
  )
}
