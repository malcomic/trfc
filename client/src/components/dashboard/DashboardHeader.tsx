import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

interface DashboardHeaderProps {
  title: string
  highlight: string
  children?: ReactNode
}

export default function DashboardHeader({ title, highlight, children }: DashboardHeaderProps) {
  return (
    <section className="bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-14 pb-11">
      <div className="max-w-5xl mx-auto">
        <Link
          to="/account"
          className="inline-flex items-center gap-2 text-accent light:text-accent-light text-sm mb-4 no-underline hover:underline"
        >
          <ArrowLeft size={14} /> Account
        </Link>
        <h1 className="font-bebas text-5xl text-chalk light:text-chalk-light">
          {title} <span className="text-accent light:text-accent-light">{highlight}</span>
        </h1>
        {children}
      </div>
    </section>
  )
}
