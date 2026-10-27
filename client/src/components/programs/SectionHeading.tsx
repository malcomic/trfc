import type { ReactNode } from 'react'

export default function SectionHeading({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={`m-0 font-barlow-condensed font-bold text-[30px] md:text-[40px] leading-[1.05] text-chalk light:text-chalk-light ${className}`}
    >
      {children}
    </h2>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="font-barlow font-semibold text-lg text-cta light:bg-cta light:text-cta-ink light:px-3 light:py-1 light:rounded-md light:self-center">
      {children}
    </div>
  )
}

export function CtaBadge({ children }: { children: ReactNode }) {
  return (
    <span className="self-start inline-block rounded-md bg-cta text-cta-ink px-3 py-1 font-barlow font-semibold text-sm tracking-wider uppercase">
      {children}
    </span>
  )
}
