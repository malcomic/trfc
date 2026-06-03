import { ReactNode } from 'react'

interface AdminMobileCardProps {
  children: ReactNode
  footer?: ReactNode
}

export function AdminMobileCardRow({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
      <span className="text-gray-900 dark:text-gray-100 text-right break-words">{value}</span>
    </div>
  )
}

export default function AdminMobileCard({ children, footer }: AdminMobileCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <div className="space-y-2">{children}</div>
      {footer && (
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-2">
          {footer}
        </div>
      )}
    </div>
  )
}
