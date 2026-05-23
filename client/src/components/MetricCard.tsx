import { TrendingUp, TrendingDown } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  trend?: 'up' | 'down' | 'neutral'
  trendPercent?: number
  icon?: React.ReactNode
  unit?: string
  subtitle?: string
  onClick?: () => void
  loading?: boolean
}

export default function MetricCard({
  title,
  value,
  trend = 'neutral',
  trendPercent = 0,
  icon,
  unit = '',
  subtitle,
  onClick,
  loading = false,
}: MetricCardProps) {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600 dark:text-green-400'
    if (trend === 'down') return 'text-red-600 dark:text-red-400'
    return 'text-gray-500 dark:text-gray-400'
  }

  const getTrendBgColor = () => {
    if (trend === 'up') return 'bg-green-50 dark:bg-green-900/20'
    if (trend === 'down') return 'bg-red-50 dark:bg-red-900/20'
    return 'bg-gray-50 dark:bg-gray-800'
  }

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-xl p-6 ${
        onClick ? 'cursor-pointer hover:shadow-lg dark:hover:shadow-2xl transition' : ''
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{title}</p>
          {subtitle && <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">{subtitle}</p>}
        </div>
        {icon && <div className="text-[#E8401C] dark:text-[#FF4500] ml-2">{icon}</div>}
      </div>

      {/* Value */}
      {loading ? (
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
        </div>
      ) : (
        <div className="mb-4">
          <p className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
            {unit && <span className="text-2xl font-normal text-gray-500 dark:text-gray-400 ml-1">{unit}</span>}
          </p>
        </div>
      )}

      {/* Trend */}
      {trend !== 'neutral' && !loading && (
        <div className={`flex items-center gap-1 ${getTrendColor()} text-sm font-medium`}>
          {trend === 'up' ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span>{Math.abs(trendPercent)}% {trend === 'up' ? 'increase' : 'decrease'}</span>
        </div>
      )}

      {/* Change indicator bar */}
      {trend !== 'neutral' && !loading && (
        <div className={`mt-3 h-1 w-full ${getTrendBgColor()} rounded-full overflow-hidden`}>
          <div
            className={`h-full ${trend === 'up' ? 'bg-green-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(Math.abs(trendPercent), 100)}%` }}
          ></div>
        </div>
      )}
    </div>
  )
}
