import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PROGRAMS, programPath, type Program } from '../../content/programs'
import { cardSurface } from '../../utils/themeClasses'
import CtaButton from './CtaButton'
import PlaceholderBox from './PlaceholderBox'
import SectionHeading from './SectionHeading'
import { JOIN_ANCHOR } from './useProgramJoin'

function Bullet({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-4 py-4 border-t border-white/10 light:border-black/10 text-chalk light:text-chalk-light">
      <span className="flex-none w-2.5 h-2.5 mt-2.5 rounded-full bg-chalk light:bg-chalk-light" aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}

export function WhoAndWhat({ program }: { program: Program }) {
  return (
    <section className="px-4 md:px-6 py-12 md:py-20">
      <div className="max-w-[1120px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14">
        <div className="flex flex-col">
          <SectionHeading className="mb-4">This is for you if</SectionHeading>
          {program.forYou.map((item) => (
            <Bullet key={item}>{item}</Bullet>
          ))}
          {program.forYouNote && (
            <p className="m-0 mt-4 font-semibold text-chalk light:text-chalk-light">{program.forYouNote}</p>
          )}
        </div>
        <div className="flex flex-col">
          <SectionHeading className="mb-4">What you get</SectionHeading>
          {program.whatYouGet.map((item) => (
            <Bullet key={item.lead}>
              <strong>{item.lead}</strong>
              {item.rest}
            </Bullet>
          ))}
        </div>
      </div>
    </section>
  )
}

export function HowItWorks({ program }: { program: Program }) {
  return (
    <section className="px-4 md:px-6 py-12 md:py-20 bg-ash light:bg-ash-light">
      <div className="max-w-[1120px] mx-auto flex flex-col gap-8">
        <SectionHeading>How your {program.lengthWeeks} weeks work</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {program.howItWorks.map((tile) => (
            <div key={`${tile.label}-${tile.title}`} className={`${cardSurface} rounded-xl p-6 flex flex-col gap-2`}>
              <div className="font-barlow-condensed font-bold text-3xl text-chalk light:text-chalk-light">{tile.label}</div>
              <div className="font-semibold text-chalk light:text-chalk-light">{tile.title}</div>
              <div className="text-base text-fog light:text-fog-light">{tile.body}</div>
            </div>
          ))}
        </div>
        <PlaceholderBox label={program.outlinePlaceholder} className="min-h-[140px]" />
        {program.shareNote && <p className="m-0 text-fog light:text-fog-light">{program.shareNote}</p>}
      </div>
    </section>
  )
}

export function JoinBox({
  program,
  onJoin,
  comingSoon,
  joining = false,
  joinError = '',
}: {
  program: Program
  onJoin: () => void
  comingSoon: boolean
  joining?: boolean
  joinError?: string
}) {
  return (
    <section id={JOIN_ANCHOR} className="scroll-mt-32 px-4 md:px-6 py-14 md:py-20 bg-ink light:bg-ink-light">
      <div className="max-w-[760px] mx-auto flex flex-col items-center gap-5 text-center">
        <h2 className="m-0 font-barlow-condensed font-bold text-[32px] md:text-[44px] leading-[1.05] text-chalk light:text-chalk-light">
          {program.join.heading}
        </h2>
        <p className="m-0 text-chalk/85 light:text-chalk-light/80">{program.join.body}</p>
        {comingSoon ? (
          <div role="status" className={`${cardSurface} w-full rounded-xl p-5 md:p-6 text-left flex flex-col gap-2`}>
            <div className="font-barlow-condensed font-bold text-2xl text-chalk light:text-chalk-light">Coming soon</div>
            <p className="m-0 text-fog light:text-fog-light">
              Joining {program.name} online opens soon. Start the free Couch to 5K while you wait.
            </p>
            <Link
              to={programPath(PROGRAMS.foundations.id)}
              className="self-start inline-flex items-center min-h-[44px] font-semibold text-chalk light:text-chalk-light underline"
            >
              See Couch to 5K
            </Link>
          </div>
        ) : (
          <>
            <CtaButton onClick={onJoin} disabled={joining} className="max-sm:w-full">
              {joining ? 'Adding you to the program…' : program.cta}
            </CtaButton>
            {joinError && (
              <p role="alert" className="m-0 text-red-500 light:text-red-600">
                {joinError}
              </p>
            )}
          </>
        )}
        <div className="text-[15px] text-fog light:text-fog-light">{program.join.footnote}</div>
      </div>
    </section>
  )
}
