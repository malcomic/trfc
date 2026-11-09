import { useEffect } from 'react'
import { COACH_HIRING_COPY } from '../content/coachHiring'
import { pageRoot } from '../utils/themeClasses'
import ApplicationForm from '../components/coachHiring/ApplicationForm'
import { DoAndLearn, HiringHero, HiringStickyBar, HowWeChoose, StandardsGrid } from '../components/coachHiring/HiringSections'

export default function CoachHiring() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = COACH_HIRING_COPY.documentTitle
    return () => {
      document.title = previousTitle
    }
  }, [])

  return (
    <div className={`${pageRoot} text-lg leading-[1.55]`}>
      <HiringStickyBar />
      <HiringHero />
      <DoAndLearn />
      <StandardsGrid />
      <HowWeChoose />
      <ApplicationForm />
    </div>
  )
}
