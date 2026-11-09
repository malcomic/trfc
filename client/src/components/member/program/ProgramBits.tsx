import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, Loader } from 'lucide-react'
import { PROGRAM_COPY } from '../../../content/programPages'
import { dashCard, dashHeading, dashMuted } from '../dashboard/ui'
import CtaButton from '../../programs/CtaButton'

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 mb-4 text-sm font-barlow font-semibold text-fog light:text-fog-light hover:text-chalk light:hover:text-chalk-light no-underline"
    >
      <ArrowLeft size={16} aria-hidden="true" /> {children}
    </Link>
  )
}

export function PageSpinner() {
  return (
    <div className="flex justify-center py-16">
      <Loader className="w-10 h-10 animate-spin text-cta" />
    </div>
  )
}

export function LoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className={`${dashCard} max-w-xl`}>
      <p className="text-chalk light:text-chalk-light">{message}</p>
      {onRetry && (
        <CtaButton size="sm" className="mt-4" onClick={onRetry}>
          {PROGRAM_COPY.retry}
        </CtaButton>
      )}
    </div>
  )
}

export function NotEnrolledCard({ programPagePath }: { programPagePath: string }) {
  const copy = PROGRAM_COPY.notEnrolled
  return (
    <div className={`${dashCard} max-w-xl`}>
      <h2 className={dashHeading}>{copy.heading}</h2>
      <p className={`${dashMuted} mt-2`}>{copy.body}</p>
      <CtaButton to={programPagePath} size="sm" className="mt-5">
        {copy.button}
      </CtaButton>
    </div>
  )
}

interface DoneBoxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
}

/** A large tick box that is easy to hit on a phone. */
export function DoneBox({ checked, onChange, label, disabled }: DoneBoxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-lg border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cta ${
        checked
          ? 'bg-cta border-cta text-cta-ink'
          : 'border-mist light:border-mist-light text-transparent hover:border-cta'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <Check size={22} strokeWidth={3} aria-hidden="true" />
    </button>
  )
}

export function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div
      className="h-2.5 rounded-full bg-smoke light:bg-smoke-light overflow-hidden"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={label}
    >
      <div className="h-full bg-cta rounded-full transition-all" style={{ width: `${percent}%` }} />
    </div>
  )
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-fog light:text-fog-light">
          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-cta shrink-0" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
