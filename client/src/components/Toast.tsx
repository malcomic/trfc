import { Check, AlertCircle, X } from 'lucide-react'

export interface ToastMessage {
  id: number
  type: 'success' | 'error' | 'info'
  title: string
  message?: string
}

interface ToastStackProps {
  toasts: ToastMessage[]
  onDismiss: (id: number) => void
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-8 right-8 flex flex-col gap-2.5 z-[1000]">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="bg-ash light:bg-ash-light border border-white/10 light:border-black/10 border-l-4 border-l-accent light:border-l-accent-light px-5 py-3.5 flex items-start gap-3 clip-angled-sm w-72 shadow-lg animate-toastIn"
        >
          <div className="w-7 h-7 flex items-center justify-center flex-shrink-0 mt-0.5">
            {toast.type === 'success' && (
              <Check size={16} className="text-green-400" />
            )}
            {toast.type === 'error' && (
              <AlertCircle size={16} className="text-red-400" />
            )}
            {toast.type === 'info' && (
              <AlertCircle size={16} className="text-accent light:text-accent-light" />
            )}
          </div>
          <div className="flex-1 font-barlow-condensed min-w-0">
            <div className="font-bold text-base text-chalk light:text-chalk-light tracking-tighter">{toast.title}</div>
            {toast.message && (
              <div className="text-xs text-fog light:text-fog-light mt-0.5">{toast.message}</div>
            )}
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="text-fog light:text-fog-light hover:text-chalk light:hover:text-chalk-light bg-transparent border-0 cursor-pointer p-0"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
