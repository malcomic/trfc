import { Navigate, useParams } from 'react-router-dom'
import { programBySlug, type Program } from '../content/programs'
import { pageRoot } from '../utils/themeClasses'
import ProgramStickyBar from '../components/programs/ProgramStickyBar'
import ProgramHero from '../components/programs/ProgramHero'
import { HowItWorks, JoinBox, WhoAndWhat } from '../components/programs/ProgramSections'
import CoachSection from '../components/programs/CoachSection'
import FaqList from '../components/programs/FaqList'
import Disclaimer from '../components/programs/Disclaimer'
import { useProgramJoin } from '../components/programs/useProgramJoin'

function ProgramView({ program }: { program: Program }) {
  const { join, comingSoon, joining, joinError } = useProgramJoin(program)

  return (
    <div className={`${pageRoot} text-lg leading-[1.55]`}>
      <ProgramStickyBar program={program} onJoin={join} />
      <ProgramHero program={program} onJoin={join} />
      <WhoAndWhat program={program} />
      <HowItWorks program={program} />
      <CoachSection line={program.coachLine} story={program.storyPlaceholder} />
      <FaqList faqs={program.faqs} className="bg-ash light:bg-ash-light" />
      <JoinBox program={program} onJoin={join} comingSoon={comingSoon} joining={joining} joinError={joinError} />
      <Disclaimer />
    </div>
  )
}

export default function ProgramPage() {
  const { slug } = useParams()
  const program = programBySlug(slug)
  if (!program) return <Navigate to="/find-my-program" replace />
  return <ProgramView key={program.id} program={program} />
}
