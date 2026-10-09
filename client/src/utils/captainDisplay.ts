import type { CommissionStatus } from '../api/captains'

export const formatKes = (value: number) =>
  `KES ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

export const formatDate = (value: string | null | undefined) => (value ? new Date(value).toLocaleDateString() : '—')

export const formatRate = (rate: number) => `${Math.round(rate * 1000) / 10}%`

export const COMMISSION_STATUS_STYLES: Record<CommissionStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  approved: 'bg-blue-500/20 text-blue-400',
  paid: 'bg-green-500/20 text-green-400',
  reversed: 'bg-red-500/20 text-red-400',
}
