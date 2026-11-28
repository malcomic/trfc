import { ArrowRight } from 'lucide-react'
import { FIND_COPY } from '../../content/quiz'
import { resolveOfferSchedule } from '../../content/finder/offerSchedule'
import { cardSurface } from '../../utils/themeClasses'
import CtaButton from '../programs/CtaButton'
import SectionHeading from '../programs/SectionHeading'

export default function OfferSection() {
  const copy = FIND_COPY.offer
  const schedule = resolveOfferSchedule(copy.schedule)

  return (
    <section id="offer" className="scroll-mt-24 px-4 md:px-6 py-12 md:py-20 bg-ash light:bg-ash-light">
      <div className="max-w-[1120px] mx-auto flex flex-col items-center gap-6">
        <div className="bg-ink light:bg-ink-light text-cta light:text-cta font-semibold text-[17px] px-4 py-1.5 rounded-md">
          {copy.badge}
        </div>
        <SectionHeading className="text-center text-[clamp(34px,5vw,52px)]">{copy.heading}</SectionHeading>
        <p className="m-0 text-xl max-w-[720px] text-center text-fog light:text-fog-light">{copy.body}</p>

        <div className="w-full max-w-[760px] box-border bg-ink light:bg-ink-light text-chalk light:text-chalk-light rounded-xl px-6 py-5 text-center">
          <div className="font-semibold text-xl text-cta">{schedule.statusTitle}</div>
          {schedule.statusSubline && <div className="mt-1 text-lg text-chalk/90 light:text-chalk-light/85">{schedule.statusSubline}</div>}
        </div>

        <div className="w-full max-w-[760px]">
          <div className="text-base text-fog light:text-fog-light mb-2 text-center">{copy.weeksLabel}</div>
          <div className="flex flex-wrap gap-2.5">
            {copy.schedule.weekWindows.map((window, index) => {
              const active = index === schedule.activeWeekIndex && !schedule.ended
              return (
                <div
                  key={window.label}
                  className={`flex-1 basis-[120px] min-w-0 rounded-[10px] px-2 py-3 text-center ${
                    active
                      ? 'bg-cta text-cta-ink'
                      : 'bg-night light:bg-white text-fog light:text-fog-light border border-white/10 light:border-black/10'
                  }`}
                >
                  <div className="font-barlow-condensed font-bold text-4xl leading-none">{window.count}</div>
                  <div className="text-[15px] mt-1">{window.label}</div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
          {schedule.bonuses.map((bonus) => (
            <div
              key={bonus.number}
              className={`${cardSurface} rounded-xl p-6 flex flex-col gap-2.5 ${bonus.open ? '' : 'opacity-55'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="w-9 h-9 rounded-full bg-chalk text-night light:bg-chalk-light light:text-night-light flex items-center justify-center font-barlow-condensed font-bold text-xl">
                  {bonus.number}
                </div>
                <span
                  className={`text-sm font-semibold px-3 py-1 rounded-full whitespace-nowrap ${
                    bonus.pillKind === 'open'
                      ? 'bg-cta/25 light:bg-[#FFF1C2] text-chalk light:text-cta-ink'
                      : 'bg-ink light:bg-ink-light text-cta'
                  }`}
                >
                  {bonus.pillLabel}
                </span>
              </div>
              <h3 className="m-0 font-barlow-condensed font-bold text-[26px] leading-[1.1] text-chalk light:text-chalk-light">
                {bonus.title}
              </h3>
              <p className="m-0 text-[17px] text-fog light:text-fog-light">{bonus.body}</p>
              <div className="text-[15px] text-fog light:text-fog-light">{bonus.arrives}</div>
            </div>
          ))}
        </div>

        <CtaButton to="/find-my-program/start" className="max-sm:w-full">
          {copy.button} <ArrowRight size={20} aria-hidden="true" />
        </CtaButton>
        <div className="text-[15px] text-fog light:text-fog-light text-center max-w-[720px]">{copy.footnote}</div>
      </div>
    </section>
  )
}
