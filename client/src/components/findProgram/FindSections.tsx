import { CheckCircle2 } from 'lucide-react'
import { FIND_COPY } from '../../content/quiz'
import { cardSurface } from '../../utils/themeClasses'
import type { PageVideo } from '../../api/pageVideos'
import SectionHeading from '../programs/SectionHeading'
import VideoBlock from './VideoBlock'

export function WhatYouGet() {
  const copy = FIND_COPY.whatYouGet
  return (
    <section className="px-4 md:px-6 py-12 md:py-20">
      <div className="max-w-[760px] mx-auto flex flex-col gap-4">
        <div className="font-semibold text-lg text-chalk light:text-chalk-light">{copy.eyebrow}</div>
        <SectionHeading className="mb-2">{copy.heading}</SectionHeading>
        {copy.items.map((item) => (
          <div key={item} className="flex items-start gap-3 text-chalk light:text-chalk-light">
            <CheckCircle2 size={24} className="flex-shrink-0 mt-0.5 text-chalk light:text-chalk-light" aria-hidden="true" />
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
    <section className="px-4 md:px-6 py-12 md:py-20 bg-ash light:bg-ash-light">
      <div className="max-w-[1120px] mx-auto flex flex-col gap-8">
        <SectionHeading>{copy.heading}</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {copy.items.map((item, index) => (
            <div key={item.title} className={`${cardSurface} rounded-xl p-6 flex flex-col gap-3`}>
              <div className="w-10 h-10 rounded-full bg-chalk text-night light:bg-chalk-light light:text-night-light flex items-center justify-center font-barlow-condensed font-bold text-xl">
                {index + 1}
              </div>
              <h3 className="m-0 font-barlow-condensed font-bold text-2xl text-chalk light:text-chalk-light">{item.title}</h3>
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
    <section className="px-4 md:px-6 py-12 md:py-20 bg-ash light:bg-ash-light">
      <div className="max-w-[760px] mx-auto flex flex-col gap-4">
        <SectionHeading>{copy.heading}</SectionHeading>
        {copy.paragraphs.map((paragraph) => (
          <p key={paragraph} className="m-0 text-chalk/85 light:text-chalk-light/85">
            {paragraph}
          </p>
        ))}
        <p className="m-0 font-semibold text-chalk light:text-chalk-light">{copy.signoff}</p>
      </div>
    </section>
  )
}

export function RealResults({ video, loading }: { video?: PageVideo; loading?: boolean }) {
  const copy = FIND_COPY.results
  return (
    <section className="px-4 md:px-6 py-12 md:py-20">
      <div className="max-w-[860px] mx-auto flex flex-col gap-3">
        <VideoBlock
          video={video}
          loading={loading}
          placeholder={copy.video}
          hearLabel={FIND_COPY.hero.hear}
          poster={video?.poster_url || copy.cover}
          posterAlt={copy.coverAlt}
          playLabel={copy.play}
        />
        <div className="text-fog light:text-fog-light">{copy.caption}</div>
      </div>
    </section>
  )
}
