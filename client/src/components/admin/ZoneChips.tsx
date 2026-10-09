import type { ZoneRef } from '../../types'

export default function ZoneChips({ zones }: { zones?: ZoneRef[] | null }) {
  if (!zones || zones.length === 0) {
    return <span className="text-xs text-gray-500 dark:text-gray-400">All zones</span>
  }
  return (
    <span className="flex flex-wrap gap-1">
      {zones.map((z) => (
        <span
          key={z.id}
          className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300"
          title={z.name}
        >
          {z.name}
        </span>
      ))}
    </span>
  )
}
