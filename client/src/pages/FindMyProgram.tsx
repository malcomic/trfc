import { ArrowRight } from 'lucide-react'
import { FIND_COPY } from '../content/quiz'
import { pageRoot } from '../utils/themeClasses'
import { usePageVideos } from '../hooks/usePageVideos'
import FindPromoBar from '../components/findProgram/FindPromoBar'
import FindHero from '../components/findProgram/FindHero'
import OfferSection from '../components/findProgram/OfferSection'
import {
  FindTestimonials,
  MyStory,
  PatternCards,
  RealResults,
  WhatYouGet,
} from '../components/findProgram/FindSections'
import CoachSection from '../components/programs/CoachSection'
import FaqList from '../components/programs/FaqList'
import Disclaimer from '../components/programs/Disclaimer'
import CtaButton from '../components/programs/CtaButton'
import SectionHeading from '../components/programs/SectionHeading'

export default function FindMyProgram() {
  const { videos, loading } = usePageVideos('find')
  const finalCta = FIND_COPY.finalCta

  return (
    <div className={`${pageRoot} text-lg leading-[1.55]`}>
      <FindPromoBar />
      <FindHero video={videos.find_hero} loading={loading} />
      <OfferSection />
      <WhatYouGet />
      <PatternCards />
      <CoachSection line={FIND_COPY.coachLine} className="bg-ash light:bg-ash-light" />
      <MyStory />
      <RealResults video={videos.find_results} loading={loading} />
      <FindTestimonials />
      <section className="px-4 md:px-6 py-12 md:py-20 bg-ink light:bg-ink-light">
        <div className="max-w-[760px] mx-auto flex flex-col gap-5 items-center text-center">
          <SectionHeading className="text-[clamp(34px,5vw,52px)]">{finalCta.heading}</SectionHeading>
          <p className="m-0 text-xl text-fog light:text-fog-light max-w-xl">{finalCta.body}</p>
          <CtaButton to="/find-my-program/start" className="max-sm:w-full">
            {finalCta.button} <ArrowRight size={20} aria-hidden="true" />
          </CtaButton>
          <div className="text-base text-fog light:text-fog-light">{finalCta.trust}</div>
        </div>
      </section>
      <FaqList faqs={FIND_COPY.faqs} />
      <Disclaimer />
    </div>
  )
}
