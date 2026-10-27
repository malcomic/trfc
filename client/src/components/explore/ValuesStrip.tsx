import { EXPLORE_COPY, stepNumber } from '../../content/explore'

export default function ValuesStrip() {
  const copy = EXPLORE_COPY.values
  return (
    <section className="bg-black text-white border-t border-white/10 light:border-transparent px-4 md:px-6 py-12 md:py-[72px]">
      <div className="max-w-[1120px] mx-auto flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <div className="font-barlow font-semibold text-[15px] tracking-[3px] uppercase text-cta">{copy.eyebrow}</div>
          <h2 className="m-0 font-barlow-condensed font-bold text-[30px] md:text-[40px] leading-[1.05] text-white">
            {copy.heading}
          </h2>
        </div>
        <ol className="m-0 p-0 list-none flex flex-wrap gap-4">
          {copy.items.map((value, i) => (
            <li key={value} className="flex-[1_1_190px] min-w-0 rounded-xl p-[22px] bg-[#1E1E1E]">
              <div className="font-barlow-condensed font-bold text-[40px] leading-none text-[#8A8A8A]">{stepNumber(i)}</div>
              <div className="w-10 h-[3px] bg-cta mt-2 mb-2.5" aria-hidden="true" />
              <div className="font-barlow-condensed font-bold text-[26px]">{value}</div>
            </li>
          ))}
        </ol>
        <p className="m-0 text-[#E6E6E6]">{copy.footer}</p>
      </div>
    </section>
  )
}
