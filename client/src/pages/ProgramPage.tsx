import { useEffect, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { getProgramBySlug } from '../api/programCatalog'
import { useAuth } from '../context/AuthContext'
import { usePrograms } from '../context/ProgramsContext'
import { programFromCatalog, type Program } from '../content/programs'
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
      <CoachSection line={program.coachLine} story={program.story} />
      <FaqList faqs={program.faqs} className="bg-ash light:bg-ash-light" />
      <JoinBox program={program} onJoin={join} comingSoon={comingSoon} joining={joining} joinError={joinError} />
      <Disclaimer />
    </div>
  )
}

function PageLoading() {
  return (
    <div className={`${pageRoot} min-h-[60vh] flex items-center justify-center`}>
      <div className="w-10 h-10 rounded-full border-4 border-mist border-t-cta animate-spin" role="status" aria-label="Loading" />
    </div>
  )
}

function PreviewBanner({ programId }: { programId: string }) {
  return (
    <div className="sticky top-0 z-50 bg-cta text-cta-ink px-4 py-2.5 text-center text-base font-semibold">
      Draft preview. Members do not see these changes until you publish.{' '}
      <Link to={`/admin/programs/${programId}`} className="underline">
        Back to the editor
      </Link>
    </div>
  )
}

/** Admin-only view of the unpublished draft. */
function DraftPreview({ slug }: { slug: string }) {
  const [program, setProgram] = useState<Program | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    getProgramBySlug(slug, true)
      .then((entry) => !cancelled && setProgram(programFromCatalog(entry)))
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [slug])

  if (failed) return <Navigate to="/find-my-program" replace />
  if (!program) return <PageLoading />
  return (
    <>
      <PreviewBanner programId={program.id} />
      <ProgramView key={program.id} program={program} />
    </>
  )
}

export default function ProgramPage() {
  const { slug = '' } = useParams()
  const [searchParams] = useSearchParams()
  const { user, isLoading: authLoading } = useAuth()
  const { bySlug, loading } = usePrograms()

  if (searchParams.get('preview') === 'draft') {
    if (authLoading) return <PageLoading />
    if (user?.role === 'admin') return <DraftPreview slug={slug} />
  }

  const program = bySlug(slug)
  if (!program) {
    if (loading) return <PageLoading />
    return <Navigate to="/find-my-program" replace />
  }
  return <ProgramView key={program.id} program={program} />
}
