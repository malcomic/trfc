import { Link } from 'react-router-dom'

const SIZES = {
  sm: 'h-12',
  md: 'h-14',
  lg: 'h-19',
  xl: 'h-31',
} as const

type LogoSize = keyof typeof SIZES

interface LogoProps {
  size?: LogoSize
  showTagline?: boolean
  className?: string
  linkToHome?: boolean
  onClick?: () => void
}

export function Logo({
  size = 'md',
  showTagline = false,
  className = '',
  linkToHome = false,
  onClick,
}: LogoProps) {
  const content = (
    <div className={`flex flex-col items-start ${className}`}>
      <img
        src="/trfc-logo.png"
        alt="Thika Road FC"
        className={`${SIZES[size]} w-auto object-contain dark:invert`}
      />
      {showTagline && (
        <span className="font-barlow-condensed font-bold text-[8px] tracking-wider text-fog light:text-fog-light leading-none mt-0.5">
          Thika Road FC
        </span>
      )}
    </div>
  )

  if (linkToHome) {
    return (
      <Link to="/" onClick={onClick} className="no-underline shrink-0">
        {content}
      </Link>
    )
  }

  return content
}
