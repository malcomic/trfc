import { useSearchParams } from 'react-router-dom'
import type { SiteImageSlot } from '../api/siteImages'
import { useSiteImages } from '../hooks/useSiteImages'
import { CORE_PROGRAM_IDS } from '../content/programs'
import { EXPLORE_COPY, exploreFilters, filterPrograms, type ExploreFilter } from '../content/explore'
import { usePrograms } from '../context/ProgramsContext'
import { pageRoot } from '../utils/themeClasses'
import ExploreHero from '../components/explore/ExploreHero'
import QuizStrip from '../components/explore/QuizStrip'
import ProgramFilter from '../components/explore/ProgramFilter'
import ProgramCard from '../components/explore/ProgramCard'
import HowItWorksSteps from '../components/explore/HowItWorksSteps'
import ValuesStrip from '../components/explore/ValuesStrip'
import Disclaimer from '../components/programs/Disclaimer'

const PHOTO_SLOTS = CORE_PROGRAM_IDS.map((id) => `program_${id}` as SiteImageSlot)

export default function Programs() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { images } = useSiteImages(PHOTO_SLOTS)
  const { programs: allPrograms, loading } = usePrograms()

  const filters = exploreFilters(allPrograms)
  const rawFilter = searchParams.get('filter')
  const filter: ExploreFilter = filters.some((f) => f.id === rawFilter) ? rawFilter! : 'all'
  const programs = filterPrograms(allPrograms, filter)

  const changeFilter = (next: ExploreFilter) => {
    const params = new URLSearchParams(searchParams)
    if (next === 'all') params.delete('filter')
    else params.set('filter', next)
    setSearchParams(params, { replace: true })
  }

  return (
    <div className={`${pageRoot} text-lg leading-[1.55]`}>
      <ExploreHero />
      <QuizStrip />

      <section
        id="programs"
        aria-label={EXPLORE_COPY.programs.label}
        className="scroll-mt-20 bg-ash light:bg-ash-light px-4 md:px-6 py-12 md:pt-16 md:pb-20"
      >
        <div className="max-w-[1120px] mx-auto flex flex-col gap-7">
          <ProgramFilter filters={filters} value={filter} onChange={changeFilter} />
          {programs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {programs.map((program) => {
                const photo = images[`program_${program.id}` as SiteImageSlot]
                return (
                  <ProgramCard
                    key={program.id}
                    program={program}
                    photoUrl={program.card.image ?? photo?.image_url}
                    photoAlt={program.card.image ? undefined : (photo?.alt_text ?? undefined)}
                  />
                )
              })}
            </div>
          ) : loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6" aria-busy="true">
              {[0, 1].map((i) => (
                <div key={i} className="aspect-[4/5] rounded-2xl bg-ink light:bg-white animate-pulse" />
              ))}
            </div>
          ) : (
            <p className="m-0 text-fog light:text-fog-light">{EXPLORE_COPY.programs.empty}</p>
          )}
        </div>
      </section>

      <HowItWorksSteps />
      <ValuesStrip />
      <Disclaimer />
    </div>
  )
}
