import { useEffect, useState } from 'react'

const SIZES = {
  sm: 'w-10 h-10 text-base',
  md: 'w-14 h-14 text-xl',
  lg: 'w-20 h-20 text-3xl',
  xl: 'w-28 h-28 text-5xl',
} as const

interface CaptainAvatarProps {
  name: string
  photoUrl?: string | null
  size?: keyof typeof SIZES
  className?: string
}

/** The captain's photo, or their initial when they have none (or it fails to load). */
export default function CaptainAvatar({ name, photoUrl, size = 'md', className = '' }: CaptainAvatarProps) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [photoUrl])
  const initial = (name.trim()[0] ?? 'C').toUpperCase()
  const base = `${SIZES[size]} rounded-full flex-shrink-0 overflow-hidden ${className}`

  if (photoUrl && !failed) {
    return (
      <img
        src={photoUrl}
        alt={`Captain ${name}`}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${base} object-cover bg-smoke light:bg-smoke-light`}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className={`${base} flex items-center justify-center font-bebas bg-accent/15 light:bg-accent-light/15 text-accent light:text-accent-light`}
    >
      {initial}
    </span>
  )
}
