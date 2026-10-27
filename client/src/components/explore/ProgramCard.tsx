import { EXPLORE_COPY } from '../../content/explore'
import { formatKsh, programPath, type Program } from '../../content/programs'
import CtaButton from '../programs/CtaButton'

export default function ProgramCard({ program, photoUrl }: { program: Program; photoUrl?: string }) {
  const copy = EXPLORE_COPY.programs
  const isFree = program.price === 0

  return (
    <article className="flex flex-col min-w-0 rounded-2xl overflow-hidden border border-white/10 light:border-black/10 bg-ink light:bg-white">
      <div className="relative min-h-[200px] bg-[#2A2A2A] flex items-center justify-center text-center p-5 text-base text-[#E6E6E6]">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={program.name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div>[Photo: {program.card.photoLabel}]</div>
        )}
        <span className="absolute top-3.5 left-3.5 bg-white text-[#111111] font-barlow font-semibold text-sm px-3 py-1 rounded-md">
          {program.card.tag}
        </span>
      </div>

      <div className="flex flex-col gap-3 flex-1 p-6">
        <h3 className="m-0 font-barlow-condensed font-bold text-[26px] md:text-[28px] leading-[1.1] text-chalk light:text-chalk-light">
          {program.title}
        </h3>
        <p className="m-0 text-[17px] text-fog light:text-[#444444]">{program.card.blurb}</p>
        <div className="text-base text-fog light:text-[#444444]">
          <strong className="text-chalk light:text-chalk-light">{program.lengthWeeks} weeks</strong> · {copy.startsPrefix}{' '}
          {program.starts}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-auto pt-2">
          <div>
            <div className="font-barlow-condensed font-bold text-[34px] leading-none text-chalk light:text-chalk-light">
              {formatKsh(program.price)}
            </div>
            <div className="text-[15px] text-fog light:text-[#444444]">
              {isFree ? copy.freeForAll : `${copy.memberPrefix} ${formatKsh(program.memberPrice)}`}
            </div>
          </div>
          <CtaButton to={programPath(program.id)} className="!min-h-[52px] !px-7 max-sm:w-full">
            {program.card.button}
          </CtaButton>
        </div>
      </div>
    </article>
  )
}
