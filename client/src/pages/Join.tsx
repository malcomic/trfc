import { useRef } from 'react'
import { pageRoot } from '../utils/themeClasses'
import { usePageVideos } from '../hooks/usePageVideos'
import JoinHero from '../components/join/JoinHero'
import JoinPerks from '../components/join/JoinPerks'
import JoinAuthPay, { JOIN_AUTH_ANCHOR } from '../components/join/JoinAuthPay'

export default function Join() {
  const authRef = useRef<HTMLDivElement>(null)
  const { videos, loading } = usePageVideos('join')

  const scrollToAuth = () => {
    const el = document.getElementById(JOIN_AUTH_ANCHOR) ?? authRef.current
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className={`${pageRoot} text-lg leading-[1.55]`}>
      <JoinHero onJoin={scrollToAuth} video={videos.join_hero} loading={loading} />
      <JoinPerks />
      <div ref={authRef}>
        <JoinAuthPay />
      </div>
      <div className="border-t border-white/5 light:border-black/8 py-9 text-center">
        <div className="font-bebas text-3xl tracking-[0.2em] text-accent light:text-accent-light">RUN • JOG • WALK</div>
        <div className="text-sm text-fog light:text-fog-light mt-1.5">Thika Road Fitness Community</div>
      </div>
    </div>
  )
}
