import { Check } from 'lucide-react'
import { stepNumber } from '../../content/explore'
import { APPLY_ANCHOR, COACH_HIRING_COPY, STANDARDS_ANCHOR, scrollToAnchor } from '../../content/coachHiring'
import { useSiteImages } from '../../hooks/useSiteImages'
import type { SiteImageSlot } from '../../api/siteImages'
import { cardSurface } from '../../utils/themeClasses'
import CtaButton from '../programs/CtaButton'
import SectionHeading, { CtaBadge } from '../programs/SectionHeading'

const HERO_SLOTS: SiteImageSlot[] = ['coach_hiring']

function SectionEyebrow({ children, className = 'text-cta' }: { children: string; className?: string }) {
  return <div className={`font-barlow font-semibold text-[15px] tracking-[3px] uppercase ${className}`}>{children}</div>
}

export function HiringStickyBar() {
  const copy = COACH_HIRING_COPY.bar
  return (
    <div className="sticky top-[66px] z-40 bg-ink/95 light:bg-ink-light/95 backdrop-blur border-b border-white/10 light:border-black/10 px-4 md:px-6 py-2.5">
      <div className="max-w-[1120px] mx-auto flex items-center justify-between gap-3">
        <div className="min-w-0 truncate font-barlow-condensed font-bold text-lg tracking-wide uppercase text-chalk light:text-chalk-light">
          {copy.title}
        </div>
        <CtaButton onClick={() => scrollToAnchor(APPLY_ANCHOR)} size="sm" className="flex-shrink-0">
          {copy.cta}
        </CtaButton>
      </div>
    </div>
  )
}

export function HiringHero() {
  const copy = COACH_HIRING_COPY.hero
  const { images } = useSiteImages(HERO_SLOTS)
  const photo = images.coach_hiring
  return (
    <section className="bg-ink light:bg-ink-light px-4 md:px-6 pt-8 md:pt-14 pb-12 md:pb-20">
      <div
        className={`max-w-[1120px] mx-auto grid grid-cols-1 gap-7 lg:gap-12 items-center ${
          photo ? 'lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]' : ''
        }`}
      >
        <div className="flex flex-col gap-5 max-w-[760px]">
          <CtaBadge>{copy.badge}</CtaBadge>
          <h1 className="m-0 font-barlow-condensed font-bold text-[36px] md:text-[54px] leading-[1.04] text-chalk light:text-chalk-light">
            {copy.heading}
          </h1>
          <p className="m-0 text-[19px] md:text-[21px] text-chalk/85 light:text-chalk-light/80">{copy.body}</p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
            <CtaButton onClick={() => scrollToAnchor(APPLY_ANCHOR)}>{copy.cta}</CtaButton>
            <span className="text-[15px] text-fog light:text-fog-light">{copy.note}</span>
          </div>
        </div>
        {photo && (
          <img
            src={photo.image_url}
            alt={photo.alt_text ?? ''}
            className="w-full aspect-[4/3] object-cover rounded-2xl"
          />
        )}
      </div>
    </section>
  )
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className={`${cardSurface} rounded-2xl p-6 md:p-7 flex flex-col gap-4`}>
      <div className="font-barlow-condensed font-bold text-2xl text-chalk light:text-chalk-light">{title}</div>
      <ul className="m-0 p-0 list-none flex flex-col gap-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span className="mt-1 w-6 h-6 rounded-full bg-cta text-cta-ink flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <Check size={14} strokeWidth={3} />
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function DoAndLearn() {
  const copy = COACH_HIRING_COPY.doAndLearn
  return (
    <section className="bg-night light:bg-night-light px-4 md:px-6 py-12 md:py-[72px]">
      <div className="max-w-[1120px] mx-auto flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <SectionEyebrow>{copy.eyebrow}</SectionEyebrow>
          <SectionHeading>{copy.heading}</SectionHeading>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ListCard title={copy.do.title} items={copy.do.items} />
          <ListCard title={copy.learn.title} items={copy.learn.items} />
        </div>
      </div>
    </section>
  )
}

export function StandardsGrid() {
  const copy = COACH_HIRING_COPY.standards
  return (
    <section
      id={STANDARDS_ANCHOR}
      className="scroll-mt-32 bg-black text-white border-t border-white/10 light:border-transparent px-4 md:px-6 py-12 md:py-[72px]"
    >
      <div className="max-w-[1120px] mx-auto flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <SectionEyebrow>{copy.eyebrow}</SectionEyebrow>
          <h2 className="m-0 font-barlow-condensed font-bold text-[30px] md:text-[40px] leading-[1.05] text-white">{copy.heading}</h2>
        </div>
        <ol className="m-0 p-0 list-none flex flex-wrap gap-4">
          {copy.items.map((item, i) => (
            <li key={item.title} className="flex-[1_1_200px] min-w-0 rounded-xl p-[22px] bg-[#1E1E1E]">
              <div className="font-barlow-condensed font-bold text-[40px] leading-none text-[#8A8A8A]">{stepNumber(i)}</div>
              <div className="w-10 h-[3px] bg-cta mt-2 mb-2.5" aria-hidden="true" />
              <div className="font-barlow-condensed font-bold text-[26px]">{item.title}</div>
              <p className="m-0 mt-1 text-[#E6E6E6] text-base">{item.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export function HowWeChoose() {
  const copy = COACH_HIRING_COPY.howWeChoose
  return (
    <section className="bg-ink light:bg-night-light px-4 md:px-6 py-12 md:py-[72px]">
      <div className="max-w-[1120px] mx-auto flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <SectionEyebrow className="text-chalk light:text-chalk-light">{copy.eyebrow}</SectionEyebrow>
          <SectionHeading>{copy.heading}</SectionHeading>
        </div>
        <ol className="m-0 p-0 list-none flex flex-wrap gap-4">
          {copy.steps.map((step, i) => (
            <li
              key={step.title}
              className="flex-[1_1_280px] min-w-0 rounded-xl p-6 bg-ash light:bg-ash-light border border-white/10 light:border-black/10"
            >
              <div className="font-barlow-condensed font-bold text-5xl leading-none text-fog light:text-[#8A8A8A]">{stepNumber(i)}</div>
              <div className="w-12 h-[3px] bg-cta mt-2.5 mb-3" aria-hidden="true" />
              <div className="font-barlow-condensed font-bold text-[26px] text-chalk light:text-chalk-light">{step.title}</div>
              <p className="m-0 text-fog light:text-[#444444]">{step.body}</p>
            </li>
          ))}
        </ol>
        <p className="m-0 font-semibold text-chalk light:text-chalk-light">{copy.footer}</p>
      </div>
    </section>
  )
}
