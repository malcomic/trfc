import { EXPLORE_COPY, stepNumber } from '../../content/explore'
import SectionHeading from '../programs/SectionHeading'

export default function HowItWorksSteps() {
  const copy = EXPLORE_COPY.how
  return (
    <section id="how" className="bg-ink light:bg-night-light px-4 md:px-6 py-12 md:py-[72px]">
      <div className="max-w-[1120px] mx-auto flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <div className="font-barlow font-semibold text-[15px] tracking-[3px] uppercase text-chalk light:text-chalk-light">
            {copy.eyebrow}
          </div>
          <SectionHeading>{copy.heading}</SectionHeading>
        </div>
        <ol className="m-0 p-0 list-none flex flex-wrap gap-4">
          {copy.steps.map((step, i) => (
            <li
              key={step.title}
              className="flex-[1_1_280px] min-w-0 rounded-xl p-6 bg-ash light:bg-ash-light border border-white/10 light:border-black/10"
            >
              <div className="font-barlow-condensed font-bold text-5xl leading-none text-fog light:text-[#8A8A8A]">
                {stepNumber(i)}
              </div>
              <div className="w-12 h-[3px] bg-cta mt-2.5 mb-3" aria-hidden="true" />
              <div className="font-barlow-condensed font-bold text-[26px] text-chalk light:text-chalk-light">{step.title}</div>
              <p className="m-0 text-fog light:text-[#444444]">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
