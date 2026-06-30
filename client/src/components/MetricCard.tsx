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
    if (trend === 'up') return 'text-success-green'
    if (trend === 'down') return 'text-danger-red'
    return 'text-fog'
  }

  const getTrendBgColor = () => {
    if (trend === 'up') return 'bg-success-green/10'
    if (trend === 'down') return 'bg-danger-red/10'
    return 'bg-smoke'
  }

  return (
    <div
      onClick={onClick}
      className={`bg-night-light dark:bg-ash rounded-lg shadow dark:shadow-xl p-6 border border-ash-light dark:border-mist ${
        onClick ? 'cursor-pointer hover:shadow-lg dark:hover:shadow-2xl transition-all duration-300 hover:scale-[1.01]' : ''
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <p className="text-chalk-light/70 dark:text-fog text-sm font-medium">{title}</p>
          {subtitle && <p className="text-chalk-light/50 dark:text-fog/70 text-xs mt-1">{subtitle}</p>}
        </div>
        {icon && <div className="text-fire dark:text-fire ml-2">{icon}</div>}
      </div>

      {/* Value */}
      {loading ? (
        <div className="animate-pulse">
          <div className="h-10 bg-ash-light dark:bg-mist rounded w-32 mb-2"></div>
        </div>
      ) : (
        <div className="mb-4">
          <p className="text-4xl font-bold text-chalk-light dark:text-chalk mb-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
            {unit && <span className="text-2xl font-normal text-fog ml-1">{unit}</span>}
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
            className={`h-full ${trend === 'up' ? 'bg-success-green' : 'bg-danger-red'}`}
            style={{ width: `${Math.min(Math.abs(trendPercent), 100)}%` }}
          ></div>
        </div>
      )}
    </div>
  )
}
