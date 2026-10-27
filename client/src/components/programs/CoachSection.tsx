import { COACH_INTRO, COACH_PHOTO } from '../../content/programs'
import SectionHeading from './SectionHeading'

interface CoachSectionProps {
  line: string
  story?: string
  className?: string
}

export default function CoachSection({ line, story, className = '' }: CoachSectionProps) {
  return (
    <section className={`px-4 md:px-6 py-12 md:py-20 ${className}`}>
      <div className="max-w-[1120px] mx-auto grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-7 md:gap-12 items-center">
        <img
          src={COACH_PHOTO}
          alt="Coach Maurice"
          loading="lazy"
          width={818}
          height={1024}
          className="w-full max-w-[420px] md:max-w-none mx-auto aspect-[4/5] object-cover object-top rounded-xl"
        />
        <div className="flex flex-col gap-4">
          <SectionHeading>Coach Maurice</SectionHeading>
          <p className="m-0 text-chalk/85 light:text-chalk-light/85">{COACH_INTRO}</p>
          <p className="m-0 text-chalk/85 light:text-chalk-light/85">{line}</p>
          {story && (
            <div className="rounded-xl border-2 border-dashed border-mist light:border-mist-light p-4 text-fog light:text-fog-light">
              {story}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
