import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { PROGRAM_COPY } from '../../../content/programPages'
import { ctaButton } from '../../../utils/themeClasses'

const copy = PROGRAM_COPY.timer

export function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** A stopwatch for the workout. Nothing is saved; it only helps the member keep time. */
export default function SessionTimer() {
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const startedAt = useRef<number | null>(null)
  const base = useRef(0)

  useEffect(() => {
    if (!running) return
    startedAt.current = Date.now()
    const id = window.setInterval(() => {
      if (startedAt.current !== null) {
        setElapsed(base.current + Math.floor((Date.now() - startedAt.current) / 1000))
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [running])

  const toggle = () => {
    if (running) base.current = elapsed
    setRunning((r) => !r)
  }

  const reset = () => {
    setRunning(false)
    base.current = 0
    startedAt.current = null
    setElapsed(0)
  }

  const btn = 'inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-lg font-barlow font-semibold'
  return (
    <div className="flex flex-wrap items-center gap-4">
      <span className="font-bebas text-5xl tracking-wide tabular-nums text-chalk light:text-chalk-light" aria-live="off">
        {formatElapsed(elapsed)}
      </span>
      <button type="button" onClick={toggle} className={`${btn} ${ctaButton}`}>
        {running ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
        {running ? copy.pause : elapsed > 0 ? copy.resume : copy.start}
      </button>
      {elapsed > 0 && (
        <button
          type="button"
          onClick={reset}
          className={`${btn} bg-smoke light:bg-smoke-light text-chalk light:text-chalk-light`}
        >
          <RotateCcw size={18} aria-hidden="true" /> {copy.reset}
        </button>
      )}
    </div>
  )
}
