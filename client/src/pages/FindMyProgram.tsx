import { useRef } from 'react'
import { FIND_COPY } from '../content/quiz'
import { pageRoot } from '../utils/themeClasses'
import { usePageVideos } from '../hooks/usePageVideos'
import FindHero from '../components/findProgram/FindHero'
import { MyStory, PatternCards, RealResults, WhatYouGet } from '../components/findProgram/FindSections'
import ProgramQuiz from '../components/findProgram/ProgramQuiz'
import CoachSection from '../components/programs/CoachSection'
import FaqList from '../components/programs/FaqList'
import Disclaimer from '../components/programs/Disclaimer'

export default function FindMyProgram() {
  const quizRef = useRef<HTMLElement>(null)
  const { videos, loading } = usePageVideos('find')

  const scrollToQuiz = () => {
    quizRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className={`${pageRoot} text-lg leading-[1.55]`}>
      <FindHero onFind={scrollToQuiz} video={videos.find_hero} loading={loading} />
      <WhatYouGet />
      <PatternCards />
      <CoachSection line={FIND_COPY.coachLine} />
      <MyStory />
      <RealResults video={videos.find_results} loading={loading} />
      <ProgramQuiz ref={quizRef} />
      <FaqList faqs={FIND_COPY.faqs} />
      <Disclaimer />
    </div>
  )
}
