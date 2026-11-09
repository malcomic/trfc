import { HIRING_STATUS_LABELS, type HiringStatus } from '../../../api/admin/hiring'
import { HOUR_OPTIONS } from '../../../content/coachHiring'

const STATUS_STYLES: Record<HiringStatus, string> = {
  new: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300',
  reviewing: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  call_booked: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
  accepted: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  not_now: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
}

export function HiringStatusBadge({ status }: { status: HiringStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_STYLES[status]}`}>
      {HIRING_STATUS_LABELS[status]}
    </span>
  )
}

export function hoursLabel(hours: string[]): string {
  const labels = HOUR_OPTIONS.filter((h) => hours.includes(h.id)).map((h) => h.label)
  return labels.length ? labels.join(', ') : '-'
}

export function adminName(admin: { name: string | null; email: string }): string {
  return admin.name ? `${admin.name} (${admin.email})` : admin.email
}
