import { Play } from 'lucide-react'
import { usePageVideos } from '../../hooks/usePageVideos'
import VideoBlock from '../media/VideoBlock'
import SignupCta from './SignupCta'

const PLACEHOLDER = 'Video coming soon'

export default function RegisterHero() {
  const { videos, loading } = usePageVideos('register')
  const video = videos.register_hero

  return (
    <section className="relative overflow-hidden border-b border-white/5 light:border-black/8">
      <div className="absolute inset-0 register-grid pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/15 light:bg-accent-light/15 rounded-full blur-3xl pointer-events-none" style={{ transform: 'translate(120px, -140px)' }} />

      <div className="relative max-w-6xl mx-auto px-6 md:px-10 pt-16 pb-20 md:pt-24 md:pb-28 max-sm:px-4 max-sm:pt-6 max-sm:pb-12 flex flex-wrap items-center gap-12 max-sm:gap-7">
        <div className="flex-[1_1_460px] min-w-0 flex flex-col gap-6">
          <div className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light flex items-center gap-2 before:w-5 before:h-0.5 before:bg-accent light:before:bg-accent-light before:inline-block">
            Free Account
          </div>
          <h1 className="font-bebas text-5xl md:text-7xl leading-[0.95] tracking-tight text-chalk light:text-chalk-light m-0">
            Welcome to Thika Road Fitness Community.
          </h1>
          <p className="text-lg md:text-xl text-fog light:text-fog-light leading-relaxed max-w-xl m-0">
            In July 2025, 7 people came to our first bootcamp. Today about 1,000 of us run, jog and walk together. Make a free account and you are one of us.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <SignupCta className="max-sm:w-full" />
            <span className="text-[17px] text-fog light:text-fog-light">It is free. It takes 2 minutes.</span>
          </div>
        </div>

        <div className="flex-[1_1_360px] min-w-0 flex flex-col gap-3">
          {loading || video ? (
            <VideoBlock
              video={video}
              loading={loading}
              placeholder={PLACEHOLDER}
              hearLabel="Tap to hear"
              className="!max-w-none border border-white/10 light:border-black/10"
            />
          ) : (
            <div className="relative w-full aspect-video rounded-2xl bg-black border-2 border-dashed border-[#8A8A8A] flex items-center justify-center overflow-hidden">
              <span className="w-[84px] h-[84px] rounded-full bg-cta flex items-center justify-center" aria-hidden="true">
                <Play size={34} className="ml-1 text-cta-ink" fill="currentColor" />
              </span>
              <span className="absolute inset-x-0 bottom-3.5 text-center text-[15px] text-[#E6E6E6]">{PLACEHOLDER}</span>
            </div>
          )}
          <div className="text-[17px] text-fog light:text-fog-light">Watch this first. It takes a few minutes.</div>
        </div>
      </div>

      <style>{`
        .register-grid {
          background-image:
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
        }
        html:not(.dark) .register-grid {
          background-image:
            linear-gradient(rgba(0,0,0,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.035) 1px, transparent 1px);
        }
      `}</style>
    </section>
  )
}
