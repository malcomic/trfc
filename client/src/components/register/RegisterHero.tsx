import { useEffect, useState } from 'react'
import { getHeroSlides } from '../../api/gallery'
import { getSafeImageUrl } from '../../utils/imageUrl'
import SignupCta from './SignupCta'

export default function RegisterHero() {
  const [photo, setPhoto] = useState<{ url: string; caption?: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    getHeroSlides()
      .then((slides) => {
        const image = (Array.isArray(slides) ? slides : []).find(
          (slide) => slide.media_url && slide.media_type !== 'video'
        )
        if (!cancelled && image) {
          const url = getSafeImageUrl(image.media_url, '')
          if (url) setPhoto({ url, caption: image.caption })
        }
      })
      .catch(() => {
        /* the styled placeholder stays */
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="relative overflow-hidden border-b border-white/5 light:border-black/8">
      <div className="absolute inset-0 register-grid pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/15 light:bg-accent-light/15 rounded-full blur-3xl pointer-events-none" style={{ transform: 'translate(120px, -140px)' }} />

      <div className="relative max-w-6xl mx-auto px-6 md:px-10 pt-16 pb-20 md:pt-24 md:pb-28 flex flex-wrap items-center gap-12">
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
            <SignupCta />
            <span className="font-barlow-condensed font-bold text-sm tracking-widest uppercase text-fog light:text-fog-light">It is free.</span>
          </div>
        </div>

        <div className="flex-[1_1_360px] min-w-0">
          {photo ? (
            <img
              src={photo.url}
              alt={photo.caption || 'TRFC community run on Thika Road'}
              className="w-full h-[380px] object-cover clip-angled border border-white/10 light:border-black/10"
              loading="eager"
            />
          ) : (
            <div className="w-full h-[380px] clip-angled bg-ash light:bg-ash-light border-2 border-dashed border-accent/30 light:border-accent-light/30 flex items-center justify-center text-center p-6 text-fog light:text-fog-light">
              Saturday community run on Thika Road
            </div>
          )}
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
