import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getProgramPhotos, type ProgramPhotos } from '../api/gallery'
import { EXPLORE_COPY, filterPrograms, isExploreFilter, type ExploreFilter } from '../content/explore'
import { pageRoot } from '../utils/themeClasses'
import ExploreHero from '../components/explore/ExploreHero'
import QuizStrip from '../components/explore/QuizStrip'
import ProgramFilter from '../components/explore/ProgramFilter'
import ProgramCard from '../components/explore/ProgramCard'
import HowItWorksSteps from '../components/explore/HowItWorksSteps'
import ValuesStrip from '../components/explore/ValuesStrip'
import Disclaimer from '../components/programs/Disclaimer'

export default function Programs() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [photos, setPhotos] = useState<ProgramPhotos>({})

  const rawFilter = searchParams.get('filter')
  const filter: ExploreFilter = isExploreFilter(rawFilter) ? rawFilter : 'all'
  const programs = filterPrograms(filter)

  useEffect(() => {
    let active = true
    getProgramPhotos()
      .then((data) => {
        if (active) setPhotos(data)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

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
          <ProgramFilter value={filter} onChange={changeFilter} />
          {programs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {programs.map((program) => (
                <ProgramCard key={program.id} program={program} photoUrl={photos[program.id]} />
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
