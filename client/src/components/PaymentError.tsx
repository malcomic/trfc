import { AlertCircle, Phone, RotateCcw } from 'lucide-react'

interface PaymentErrorProps {
  error: string
  onRetry?: () => void
  onContactSupport?: () => void
  phone?: string
}

export default function PaymentError({
  error,
  onRetry,
  onContactSupport,
  phone,
}: PaymentErrorProps) {
  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-[#1C1C1C] rounded-lg shadow-lg max-w-md w-full">
        {/* Header */}
        <div className="bg-red-600 text-white p-6 rounded-t-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-8 h-8" />
            <h2 className="text-2xl font-bold">Payment Failed</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Error Message */}
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded p-4">
            <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
          </div>

          {/* Possible Reasons */}
          <div className="bg-gray-50 dark:bg-[#2A2A2A] p-4 rounded">
            <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 mb-2">Possible reasons:</p>
            <ul className="text-xs text-gray-700 dark:text-gray-400 space-y-1">
              <li>• Insufficient M-Pesa balance</li>
              <li>• Incorrect M-Pesa PIN entered</li>
              <li>• Payment request expired</li>
              <li>• Network connectivity issue</li>
              <li>• Account blocked or suspended</li>
            </ul>
          </div>

          {/* Phone Number Info */}
          {phone && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded p-4">
              <p className="text-xs text-blue-800 dark:text-blue-400 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Payment was requested on: <span className="font-mono font-semibold">{phone}</span>
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-gray-100 dark:bg-[#2A2A2A] border-t dark:border-gray-700 px-6 py-4 space-y-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full bg-primary dark:bg-primary-dark text-white dark:text-black px-4 py-2 rounded-lg hover:bg-opacity-90 font-semibold flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
          )}

          {onContactSupport && (
            <button
              onClick={onContactSupport}
              className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-[#2A2A2A] font-semibold"
            >
              Contact Support
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
