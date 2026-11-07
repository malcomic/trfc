import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { PageVideo } from '../../../api/pageVideos'
import { DASHBOARD_COPY } from '../../../content/dashboard'
import WelcomeVideoPlayer from './WelcomeVideoPlayer'

const copy = DASHBOARD_COPY.welcomeVideo
const LANDSCAPE_ASPECT = 16 / 9
const PORTRAIT_ASPECT = 9 / 16
const PORTRAIT_MAX_WIDTH = 480
const LANDSCAPE_MAX_WIDTH = 860

interface WelcomeVideoModalProps {
  video: Pick<PageVideo, 'video_url' | 'poster_url'> & Partial<Pick<PageVideo, 'orientation'>> | null
  onClose: () => void
  onWatched: () => void
}

export default function WelcomeVideoModal({ video, onClose, onWatched }: WelcomeVideoModalProps) {
  const open = Boolean(video)
  const videoUrl = video?.video_url
  const savedAspect = video?.orientation === 'portrait' ? PORTRAIT_ASPECT : LANDSCAPE_ASPECT
  const [aspect, setAspect] = useState(savedAspect)

  useEffect(() => {
    setAspect(savedAspect)
  }, [videoUrl, savedAspect])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!video) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="welcome-video-heading">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        className="relative w-full max-h-[calc(100dvh-2rem)] overflow-y-auto bg-ash light:bg-ash-light border border-mist light:border-mist-light rounded-xl p-4 sm:p-6 shadow-2xl animate-scaleIn transition-[max-width] duration-300"
        style={{ maxWidth: aspect < 1 ? PORTRAIT_MAX_WIDTH : LANDSCAPE_MAX_WIDTH }}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <h2 id="welcome-video-heading" className="font-bebas text-3xl md:text-4xl tracking-wide leading-none text-chalk light:text-chalk-light">
              {copy.heading}
            </h2>
            <p className="mt-1 text-fog light:text-fog-light">{copy.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.close}
            className="w-11 h-11 flex-shrink-0 rounded-full flex items-center justify-center text-fog light:text-fog-light hover:text-chalk light:hover:text-chalk-light hover:bg-smoke light:hover:bg-smoke-light transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <WelcomeVideoPlayer video={video} onWatched={onWatched} aspect={aspect} onAspect={setAspect} />
      </div>
    </div>
  )
}
