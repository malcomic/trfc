import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ctaButton } from '../../utils/themeClasses'

const base =
  'inline-flex items-center justify-center gap-2 min-h-[56px] px-8 rounded-lg font-barlow font-semibold text-lg no-underline transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cta focus-visible:ring-offset-2 focus-visible:ring-offset-night light:focus-visible:ring-offset-night-light'

const enabled = ctaButton
const disabledStyle = 'bg-smoke light:bg-smoke-light text-fog light:text-fog-light cursor-not-allowed'

interface CtaButtonProps {
  children: ReactNode
  to?: string
  onClick?: () => void
  disabled?: boolean
  size?: 'md' | 'sm'
  className?: string
}

export default function CtaButton({ children, to, onClick, disabled, size = 'md', className = '' }: CtaButtonProps) {
  const sizing = size === 'sm' ? '!min-h-[44px] !px-5 !text-base' : ''
  const classes = `${base} ${disabled ? disabledStyle : enabled} ${sizing} ${className}`

  if (to && !disabled) {
    return (
      <Link to={to} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  )
}
