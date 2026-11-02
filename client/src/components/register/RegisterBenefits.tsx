import type { ReactNode } from 'react'
import SignupCta from './SignupCta'

function Lead({ children }: { children: ReactNode }) {
  return <strong className="text-chalk light:text-chalk-light">{children}</strong>
}

const BENEFITS: ReactNode[] = [
  <>
    <Lead>Run your first 5K in 8 weeks, free.</Lead> As a thank you for joining our community, we send you this program free. You can start it right away, as soon as you make your account. Never run before? It is for you. You train 5 days and rest 2 days each week, and on Saturday you join the community run. Already run a lot? Share it with a family member or a friend. We want as many people as we can running.
  </>,
  <>
    <Lead>The whole year&apos;s calendar.</Lead> Every run, hike and Fit Fest is there, and you book right from it.
  </>,
  <>
    <Lead>Pay a bit at a time.</Lead> Put down 30% and your seat is yours. Pay the rest later. For hikes, the full amount is due 3 days before.
  </>,
  <>
    <Lead>Your tickets in one place.</Lead> Every ticket you buy is in your dashboard. No hunting through emails.
  </>,
  <>
    <Lead>A progress page.</Lead> Log your run each week and earn badges.
  </>,
  <>
    <Lead>A zone captain</Lead> you pick when you sign up. Ask them anything.
  </>,
  'A text from us before each event, so you remember to come.',
  'You hear about new events and programs first.',
]

export default function RegisterBenefits() {
  return (
    <section id="benefits" className="px-6 md:px-10 py-20 max-sm:px-4 max-sm:py-12">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-barlow-condensed font-bold text-[40px] max-sm:text-[32px] leading-[1.05] text-chalk light:text-chalk-light mt-0 mb-3.5">
          What you get for signing up
        </h2>
        <ul className="list-none p-0 m-0 border-b border-white/10 light:border-black/10">
          {BENEFITS.map((benefit, index) => (
            <li key={index} className="flex gap-4 py-[18px] border-t border-white/10 light:border-black/10 text-fog light:text-fog-light leading-relaxed">
              <span className="flex-none w-2.5 h-2.5 mt-2.5 rounded-full bg-chalk light:bg-chalk-light" aria-hidden="true" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
        <p className="mt-7 mb-0 text-fog light:text-fog-light">
          We stand on five things: routine, order, discipline, unity and inclusivity. Come as you are.
        </p>
        <div className="mt-8">
          <SignupCta className="max-sm:w-full" />
        </div>
      </div>
    </section>
  )
}
