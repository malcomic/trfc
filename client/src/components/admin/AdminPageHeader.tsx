import { ReactNode } from 'react'

interface AdminPageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export default function AdminPageHeader({ title, subtitle, actions }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap gap-2 [&_button]:min-h-[44px] [&_a]:min-h-[44px]">
          {actions}
        </div>
      )}
    </div>
  )
}
