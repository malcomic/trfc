import { HERO_COPY } from '../../content/onboarding'

export default function HeroIntro({ onStart }: { onStart: () => void }) {
  return (
    <div>
      <div className="[text-shadow:0_2px_12px_rgba(0,0,0,0.55)] light:[text-shadow:0_1px_10px_rgba(255,255,255,0.8)]">
        <div className="font-barlow-condensed font-bold text-xs tracking-widest text-accent light:text-accent-light mb-7 flex items-center gap-2.5">
          <span className="block w-6 h-0.5 bg-accent light:bg-accent-light" />
          Thika Road Fitness Community
        </div>

        <h1 className="text-[clamp(44px,7vw,112px)] mb-8" aria-label={HERO_COPY.headline}>
          <span className="hero-word text-white light:text-black">FIND YOUR PROGRAM.</span>
          <span className="hero-word text-accent light:text-accent-light">START THIS WEEK.</span>
        </h1>

        <p className="hero-sub max-w-[560px] text-lg leading-relaxed text-white/90 light:text-black/90 mb-3">
          {HERO_COPY.subline}
        </p>
        <p className="hero-sub max-w-[560px] text-sm leading-relaxed text-white/75 light:text-black/75 mb-10">
          {HERO_COPY.smallLine}
        </p>
      </div>

      <div className="hero-ctas">
        <button
          type="button"
          onClick={onStart}
          className="font-barlow-condensed font-black text-lg tracking-wider uppercase text-black light:text-white px-10 py-4 bg-accent light:bg-accent-light clip-angled-lg transition-all duration-200 hover:bg-accent/90 light:hover:bg-accent-light/90 hover:scale-104 animate-pulse-ring"
        >
          {HERO_COPY.button}
        </button>
      </div>
    </div>
  )
}
