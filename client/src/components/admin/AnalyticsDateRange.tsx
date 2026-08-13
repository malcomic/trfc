export type DateRangeValue =
  | { mode: 'preset'; days: '7' | '30' | '90' }
  | { mode: 'custom'; startDate: string; endDate: string }

interface AnalyticsDateRangeProps {
  value: DateRangeValue
  onChange: (value: DateRangeValue) => void
}

export function toAnalyticsParams(value: DateRangeValue): { days?: string; startDate?: string; endDate?: string } {
  if (value.mode === 'custom') {
    return { startDate: value.startDate, endDate: value.endDate }
  }
  return { days: value.days }
}

export function describeDateRange(value: DateRangeValue): string {
  if (value.mode === 'custom') {
    return `${value.startDate} to ${value.endDate}`
  }
  return `Last ${value.days} days`
}

export default function AnalyticsDateRange({ value, onChange }: AnalyticsDateRangeProps) {
  const preset = value.mode === 'preset' ? value.days : null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-4 space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-3 text-gray-900 dark:text-gray-100">Date Range</label>
        <div className="flex flex-wrap gap-3">
          {(['7', '30', '90'] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => onChange({ mode: 'preset', days: range })}
              className={`px-4 py-2 rounded transition ${
                preset === range
                  ? 'bg-primary dark:bg-primary-dark text-white dark:text-black'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Last {range} days
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Start date</label>
          <input
            type="date"
            value={value.mode === 'custom' ? value.startDate : ''}
            onChange={(e) => {
              const startDate = e.target.value
              const endDate = value.mode === 'custom' ? value.endDate : startDate
              if (!startDate) return
              onChange({ mode: 'custom', startDate, endDate: endDate || startDate })
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">End date</label>
          <input
            type="date"
            value={value.mode === 'custom' ? value.endDate : ''}
            onChange={(e) => {
              const endDate = e.target.value
              const startDate = value.mode === 'custom' ? value.startDate : endDate
              if (!endDate) return
              onChange({ mode: 'custom', startDate: startDate || endDate, endDate })
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>
    </div>
  )
}
