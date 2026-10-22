import type { ReactNode } from 'react'
import SignupCta from './SignupCta'

const BENEFITS: ReactNode[] = [
  <>
    <strong className="text-chalk light:text-chalk-light">Run your first 5K in 8 weeks, free.</strong> As a thank you for joining our community, we send you this program free. You can start it right away, as soon as you make your account. Never run before? It is for you. You train 5 days and rest 2 days each week, and on Saturday you join the community run. Already run a lot? Share it with a family member or a friend. We want as many people as we can running.
  </>,
  'Every ticket you buy, for Fit Fest, hikes or any event, is saved in your dashboard. Open it there. No need to find an email or download anything.',
  "A progress page where you write down each week's run and collect badges as you go.",
  'A zone captain you pick when you sign up. Ask them anything.',
  'A text from us before each event, so you remember to come.',
  'You hear about new events and programs first.',
]

export default function RegisterBenefits() {
  return (
    <section id="benefits" className="px-6 md:px-10 py-20">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-bebas text-4xl md:text-5xl tracking-tight text-accent light:text-accent-light mb-6">
          What you get when you sign up
        </h2>
        <ul className="list-none p-0 m-0 border-b border-white/10 light:border-black/10">
          {BENEFITS.map((benefit, index) => (
            <li key={index} className="flex gap-4 py-5 border-t border-white/10 light:border-black/10 text-fog light:text-fog-light leading-relaxed">
              <span className="flex-none w-2.5 h-2.5 mt-2.5 bg-accent light:bg-accent-light clip-angled-sm" aria-hidden="true" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
        <p className="mt-7 mb-0 text-fog light:text-fog-light">
          Everything we do rests on five things: routine, order, discipline, unity and inclusivity. Come as you are.
        </p>
        <div className="mt-8">
          <SignupCta />
        </div>
      </div>
    </section>
  )
}
