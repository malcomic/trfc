import { MEMBER_DISCOUNT_NOTE, formatKsh, type Program } from '../../content/programs'
import { cardSurface } from '../../utils/themeClasses'
import CtaButton from './CtaButton'
import { CtaBadge } from './SectionHeading'

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-3.5 border-t border-white/10 light:border-black/10">
      <div className="text-fog light:text-fog-light">{label}</div>
      <strong className="text-chalk light:text-chalk-light text-right">{value}</strong>
    </div>
  )
}

export default function ProgramHero({ program, onJoin }: { program: Program; onJoin: () => void }) {
  const isFree = program.price === 0
  return (
    <section className="bg-ink light:bg-ink-light px-4 md:px-6 pt-8 md:pt-14 pb-12 md:pb-20">
      <div className="max-w-[1120px] mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-7 lg:gap-12 items-start">
        <div className="flex flex-col gap-5">
          <CtaBadge>{isFree ? `Free program · Starts ${program.starts}` : `Starts ${program.starts}`}</CtaBadge>
          <h1 className="m-0 font-barlow-condensed font-bold text-[36px] md:text-[54px] leading-[1.04] text-chalk light:text-chalk-light">
            {program.title}
          </h1>
          <p className="m-0 text-[19px] md:text-[21px] text-chalk/85 light:text-chalk-light/80">{program.tagline}</p>
          <div className="flex flex-wrap gap-2">
            {program.chips.map((chip) => (
              <span
                key={chip}
                className="inline-flex items-center min-h-[36px] px-4 rounded-full border border-white/20 light:border-black/15 text-[15px] font-semibold text-chalk light:text-chalk-light"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>

        <div className={`${cardSurface} rounded-2xl p-6 md:p-7 flex flex-col`}>
          <div className="font-barlow-condensed font-bold text-2xl text-chalk light:text-chalk-light mb-2">Program details</div>
          <DetailRow label="Length" value={`${program.lengthWeeks} weeks`} />
          <DetailRow label="Starts" value={program.starts} />
          <DetailRow label="Price" value={formatKsh(program.price)} />
          {isFree ? (
            <DetailRow label="Where it runs" value="In your free account" />
          ) : (
            <>
              <DetailRow label="Member price" value={formatKsh(program.memberPrice)} />
              <div className="text-[15px] text-fog light:text-fog-light pb-2">{program.memberNote ?? MEMBER_DISCOUNT_NOTE}</div>
            </>
          )}
          <CtaButton onClick={onJoin} className="w-full mt-4">
            {program.cta}
          </CtaButton>
          <div className="mt-3 text-[15px] text-fog light:text-fog-light">{program.heroNote}</div>
        </div>
      </div>
    </section>
  )
}
