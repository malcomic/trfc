import type { LucideIcon } from 'lucide-react'
import { cardSurface } from '../../utils/themeClasses'

export default function StatTile({ label, value, icon: Icon }: { label: string; value: string | number; icon: LucideIcon }) {
  return (
    <div className={`${cardSurface} p-5`}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog light:text-fog-light">
          {label}
        </span>
        <Icon size={16} className="text-accent light:text-accent-light" />
      </div>
      <p className="font-bebas text-3xl text-chalk light:text-chalk-light">{value}</p>
    </div>
  )
}
