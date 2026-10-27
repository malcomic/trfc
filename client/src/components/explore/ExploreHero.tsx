import { EXPLORE_COPY } from '../../content/explore'
import { Eyebrow } from '../programs/SectionHeading'

export default function ExploreHero() {
  const copy = EXPLORE_COPY.hero
  return (
    <section className="bg-night light:bg-night-light px-4 md:px-6 pt-12 md:pt-16 pb-14 md:pb-[72px]">
      <div className="max-w-[1120px] mx-auto flex flex-col items-center gap-4 text-center">
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <h1 className="m-0 font-barlow-condensed font-bold text-[clamp(36px,5vw,60px)] leading-[1.04] text-chalk light:text-chalk-light">
          {copy.heading}
        </h1>
        <p className="m-0 max-w-[640px] text-[19px] md:text-xl text-chalk/85 light:text-chalk-light/80">{copy.lead}</p>
      </div>
    </section>
  )
}
