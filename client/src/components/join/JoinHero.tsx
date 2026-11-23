import { ArrowRight } from 'lucide-react'
import { JOIN_COPY } from '../../content/join'
import type { PageVideo } from '../../api/pageVideos'
import CtaButton from '../programs/CtaButton'
import { Eyebrow } from '../programs/SectionHeading'
import VideoBlock from '../media/VideoBlock'

interface JoinHeroProps {
  onJoin: () => void
  video?: PageVideo
  loading?: boolean
}

export default function JoinHero({ onJoin, video, loading }: JoinHeroProps) {
  const copy = JOIN_COPY.hero
  return (
    <section className="bg-ink light:bg-ink-light px-4 md:px-6 pt-10 md:pt-12 pb-14 md:pb-20">
      <div className="max-w-[920px] mx-auto flex flex-col items-center gap-6 text-center">
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <h1 className="m-0 font-barlow-condensed font-bold text-[clamp(36px,6vw,68px)] leading-[1.02] text-chalk light:text-chalk-light">
          {copy.headline}
        </h1>
        <p className="m-0 text-[19px] md:text-[21px] max-w-[640px] text-chalk/85 light:text-chalk-light/80">{copy.subline}</p>
        <VideoBlock video={video} loading={loading} placeholder={copy.video} hearLabel={copy.hear} />
        <CtaButton onClick={onJoin} className="max-sm:w-full">
          {copy.button} <ArrowRight size={20} aria-hidden="true" />
        </CtaButton>
        <div className="text-base text-fog light:text-fog-light">{copy.trust}</div>
      </div>
    </section>
  )
}
