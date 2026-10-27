import { ArrowRight } from 'lucide-react'
import CtaButton from '../programs/CtaButton'

export const HOME_HERO_COPY = {
  headline: 'Find your program. Start this week.',
  subline:
    "Walk in fresh, or come back after years off. We've got a group for wherever you're starting.",
  smallLine:
    "Most plans lose people in the first month. Ours doesn't, because you're never training alone.",
  button: 'Find my program',
}

export default function HomeHero() {
  return (
    <div>
      <div className="[text-shadow:0_2px_12px_rgba(0,0,0,0.55)] light:[text-shadow:0_1px_10px_rgba(255,255,255,0.8)]">
        <div className="font-barlow-condensed font-bold text-xs tracking-widest text-accent light:text-accent-light mb-7 flex items-center gap-2.5">
          <span className="block w-6 h-0.5 bg-accent light:bg-accent-light" />
          Thika Road Fitness Community
        </div>

        <h1 className="text-[clamp(44px,7vw,112px)] mb-8" aria-label={HOME_HERO_COPY.headline}>
          <span className="hero-word text-white light:text-black">FIND YOUR PROGRAM.</span>
          <span className="hero-word text-accent light:text-accent-light">START THIS WEEK.</span>
        </h1>

        <p className="hero-sub max-w-[560px] text-lg leading-relaxed text-white/90 light:text-black/90 mb-3">
          {HOME_HERO_COPY.subline}
        </p>
        <p className="hero-sub max-w-[560px] text-sm leading-relaxed text-white/75 light:text-black/75 mb-10">
          {HOME_HERO_COPY.smallLine}
        </p>
      </div>

      <div className="hero-ctas">
        <CtaButton to="/find-my-program" className="max-sm:w-full">
          {HOME_HERO_COPY.button} <ArrowRight size={20} aria-hidden="true" />
        </CtaButton>
      </div>
    </div>
  )
}
