import { useEffect, useState } from 'react'

/** Animated goal timeline; respects prefers-reduced-motion. */
export default function FinderChart({ label = 'Your goal window' }: { label?: string }) {
  const [reduceMotion, setReduceMotion] = useState(false)
  const [drawn, setDrawn] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mq.matches)
    const onChange = () => setReduceMotion(mq.matches)
    mq.addEventListener?.('change', onChange)
    const t = window.setTimeout(() => setDrawn(true), reduceMotion ? 0 : 80)
    return () => {
      mq.removeEventListener?.('change', onChange)
      window.clearTimeout(t)
    }
  }, [reduceMotion])

  const path = 'M 8 72 C 40 68, 70 40, 110 36 S 180 20, 220 18'
  const dash = drawn || reduceMotion ? '0' : '280'
  const offset = drawn || reduceMotion ? '0' : '280'

  return (
    <div className="w-full rounded-xl border border-cta/35 bg-gradient-to-b from-cta/15 to-transparent p-4 text-cta">
      <p className="m-0 mb-3 text-sm text-night font-semibold">{label}</p>
      <svg viewBox="0 0 240 90" className="w-full h-auto" role="img" aria-label={label}>
        <line x1="8" y1="78" x2="232" y2="78" stroke="currentColor" strokeOpacity="0.15" className="text-night" />
        <line x1="8" y1="12" x2="8" y2="78" stroke="currentColor" strokeOpacity="0.15" className="text-night" />
        <path
          d={path}
          fill="none"
          stroke="#FFC83D"
          strokeWidth="3"
          strokeLinecap="round"
          style={{
            strokeDasharray: reduceMotion ? undefined : 280,
            strokeDashoffset: reduceMotion ? 0 : Number(offset),
            transition: reduceMotion ? undefined : `stroke-dashoffset ${drawn ? '1.1s' : '0s'} ease-out`,
          }}
        />
        {!reduceMotion && (
          <circle
            cx="220"
            cy="18"
            r="5"
            fill="#FFC83D"
            className={drawn ? 'opacity-100' : 'opacity-0'}
            style={{ transition: 'opacity 0.4s ease 0.9s' }}
          />
        )}
        {reduceMotion && <circle cx="220" cy="18" r="5" fill="#FFC83D" />}
      </svg>
      <p className="m-0 mt-2 text-xs text-fog">Dates firm up from your start photo, goal, and training days.</p>
      <span className="sr-only">{dash}</span>
    </div>
  )
}
