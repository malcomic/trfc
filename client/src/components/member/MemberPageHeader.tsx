import type { ReactNode } from 'react'

interface MemberPageHeaderProps {
  title: string
  highlight?: string
  subtitle?: ReactNode
  actions?: ReactNode
}

export default function MemberPageHeader({ title, highlight, subtitle, actions }: MemberPageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <div className="min-w-0">
        <h1 className="font-bebas text-4xl sm:text-5xl text-chalk light:text-chalk-light leading-none">
          {title} {highlight && <span className="text-accent light:text-accent-light">{highlight}</span>}
        </h1>
        {subtitle && <div className="text-sm text-fog light:text-fog-light mt-2">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  )
}
