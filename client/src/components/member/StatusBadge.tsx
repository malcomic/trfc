export const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-green-500/20 text-green-400',
  pending: 'bg-yellow-500/20 text-yellow-400',
  reserved: 'bg-blue-500/20 text-blue-300',
  failed: 'bg-red-500/20 text-red-400',
  cancelled: 'bg-white/5 text-fog line-through',
  going: 'bg-green-500/20 text-green-400',
  attended: 'bg-accent/20 text-accent light:bg-accent-light/20 light:text-accent-light',
  missed: 'bg-red-500/10 text-red-300',
  no_show: 'bg-red-500/10 text-red-300',
  cancelled_early: 'bg-white/5 text-fog',
  excused: 'bg-white/5 text-fog',
}

export default function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 text-xs font-bold uppercase ${STATUS_STYLES[status] ?? 'bg-white/5 text-fog'}`}>
      {label ?? status}
    </span>
  )
}
