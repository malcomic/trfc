import type { ReactNode } from 'react'

interface PlaceholderBoxProps {
  label: string
  className?: string
  children?: ReactNode
}

export default function PlaceholderBox({ label, className = '', children }: PlaceholderBoxProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-center p-6 rounded-2xl border-2 border-dashed border-mist light:border-mist-light bg-ash/60 light:bg-ash-light text-fog light:text-fog-light ${className}`}
    >
      {children}
      <div className="text-base">[{label}]</div>
    </div>
  )
}
