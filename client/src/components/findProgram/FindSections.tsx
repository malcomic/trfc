import { CheckCircle2 } from 'lucide-react'
import { FIND_COPY } from '../../content/quiz'
import { cardSurface } from '../../utils/themeClasses'
import type { PageVideo } from '../../api/pageVideos'
import type { SiteImageSlot } from '../../api/siteImages'
import { useSiteImages } from '../../hooks/useSiteImages'
import SectionHeading from '../programs/SectionHeading'
import VideoBlock from '../media/VideoBlock'

const COVER_SLOTS: SiteImageSlot[] = ['find_results_cover']

export function WhatYouGet() {
  const copy = FIND_COPY.whatYouGet
  return (
    <section className="px-4 md:px-6 py-12 md:py-20 bg-ash light:bg-ash-light">
      <div className="max-w-[760px] mx-auto flex flex-col gap-2">
        <div className="font-semibold text-lg text-chalk light:text-chalk-light">{copy.eyebrow}</div>
        <SectionHeading className="mb-4">{copy.heading}</SectionHeading>
        {copy.items.map((item, index) => (
          <div
            key={item}
            className={`flex items-start gap-4 py-4 border-t border-white/10 light:border-black/10 text-chalk light:text-chalk-light ${
              index === copy.items.length - 1 ? 'border-b' : ''
            }`}
          >
            <CheckCircle2 size={26} className="flex-shrink-0 mt-0.5 text-chalk light:text-chalk-light" aria-hidden="true" />
            <div>{item}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function PatternCards() {
  const copy = FIND_COPY.patterns
  return (
    <section className="px-4 md:px-6 py-12 md:py-20">
      <div className="max-w-[1120px] mx-auto flex flex-col gap-8">
        <SectionHeading className="text-center">{copy.heading}</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {copy.items.map((item, index) => (
            <div key={item.title} className={`${cardSurface} rounded-xl p-7 flex flex-col gap-2.5`}>
              <div className="font-barlow-condensed font-bold text-[56px] leading-none text-chalk light:text-chalk-light">
                {index + 1}
              </div>
              <h3 className="m-0 font-barlow-condensed font-bold text-[28px] text-chalk light:text-chalk-light">{item.title}</h3>
              <p className="m-0 text-fog light:text-fog-light">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function MyStory() {
  const copy = FIND_COPY.story
  return (
    <section className="px-4 md:px-6 py-12 md:py-20">
      <div className="max-w-[760px] mx-auto flex flex-col gap-5">
        <SectionHeading>{copy.heading}</SectionHeading>
        {copy.paragraphs.map((paragraph) => (
          <p key={paragraph} className="m-0 text-xl text-chalk/85 light:text-chalk-light/85">
            {paragraph}
          </p>
        ))}
        <p className="m-0 font-semibold text-xl text-chalk light:text-chalk-light">{copy.signoff}</p>
      </div>
    </section>
  )
}

export function RealResults({ video, loading }: { video?: PageVideo; loading?: boolean }) {
  const copy = FIND_COPY.results
  const { images, loading: coverLoading } = useSiteImages(COVER_SLOTS)
  const cover = images.find_results_cover
  return (
    <section className="px-4 md:px-6 py-12 md:py-20 bg-night light:bg-night-light">
      <div className="max-w-[860px] mx-auto flex flex-col items-center gap-4">
        <VideoBlock
          video={video}
          loading={loading || coverLoading}
          placeholder={copy.video}
          hearLabel={FIND_COPY.hero.hear}
          poster={cover?.image_url || copy.cover}
          posterAlt={cover?.alt_text || copy.coverAlt}
          playLabel={copy.play}
        />
        <div className="text-xl font-semibold text-chalk light:text-chalk-light text-center">{copy.caption}</div>
      </div>
    </section>
  )
}

const CLIENT_STORY_SLOTS: SiteImageSlot[] = ['find_client_1', 'find_client_2', 'find_client_3']

export function FindTestimonials() {
  const copy = FIND_COPY.testimonials
  const { images, loading } = useSiteImages(CLIENT_STORY_SLOTS)
  const cards = CLIENT_STORY_SLOTS.map((slot) => images[slot]).filter(
    (item): item is NonNullable<typeof item> =>
      Boolean(item?.image_url && item.category && item.quote && item.client_name && item.result)
  )

  if (!loading && cards.length === 0) return null

  return (
    <section className="px-4 md:px-6 py-12 md:py-20 bg-ash light:bg-ash-light">
      <div className="max-w-[1120px] mx-auto flex flex-col gap-8">
        <SectionHeading className="text-center">{copy.heading}</SectionHeading>
        {loading ? (
          <div className="text-center text-fog light:text-fog-light">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cards.map((item) => (
              <div key={item.slot} className={`${cardSurface} rounded-xl p-6 flex flex-col gap-4`}>
                <img
                  src={item.image_url}
                  alt={item.alt_text || `${item.client_name}, ${item.result}`}
                  className="w-full min-h-[220px] object-cover rounded-[10px]"
                  loading="lazy"
                />
                <div className="self-start text-sm font-semibold bg-cta/25 light:bg-[#FFF1C2] text-chalk light:text-cta-ink px-3 py-1 rounded-full">
                  {item.category}
                </div>
                <p className="m-0 text-[19px] text-chalk light:text-chalk-light">{item.quote}</p>
                <div className="font-semibold text-chalk light:text-chalk-light">
                  {item.client_name}, {item.result}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
