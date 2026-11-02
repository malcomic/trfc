import { useRef, useState } from 'react'
import { Play, Volume2 } from 'lucide-react'
import type { PageVideo } from '../../api/pageVideos'
import { embedUrl, parseVideoLink } from '../../utils/videoLink'

interface VideoBlockProps {
  video?: Pick<PageVideo, 'video_url'> | null
  loading?: boolean
  placeholder: string
  hearLabel: string
  /** Cover image shown over the video until the visitor presses play; the video then starts with sound. */
  poster?: string | null
  posterAlt?: string
  playLabel?: string
  className?: string
}

const frame = 'relative w-full max-w-[860px] aspect-video rounded-2xl overflow-hidden bg-black text-chalk'

const hearButton =
  'absolute left-4 bottom-4 inline-flex items-center gap-2 min-h-[44px] px-5 rounded-full bg-white text-cta-ink font-barlow font-semibold text-[17px]'

export default function VideoBlock({
  video,
  loading,
  placeholder,
  hearLabel,
  poster,
  posterAlt = '',
  playLabel,
  className = '',
}: VideoBlockProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(!poster)
  const [started, setStarted] = useState(!poster)
  const parsed = video ? parseVideoLink(video.video_url) ?? { provider: 'file' as const, url: video.video_url } : null

  if (loading) return <div className={`${frame} ${className}`} aria-busy="true" />

  if (!parsed) {
    if (poster) {
      return (
        <div className={`${frame} ${className}`}>
          <img src={poster} alt={posterAlt} className="w-full h-full object-cover" />
        </div>
      )
    }
    return (
      <div
        className={`${frame} ${className} border-2 border-dashed border-mist flex flex-col items-center justify-center gap-4 p-6 text-center max-sm:aspect-auto max-sm:min-h-[220px]`}
      >
        <Play size={56} strokeWidth={1.5} aria-hidden="true" />
        <div className="text-[17px] text-white/85">[{placeholder}]</div>
        <button type="button" className={`${hearButton} max-sm:static`} disabled>
          <Volume2 size={18} aria-hidden="true" />
          {hearLabel}
        </button>
      </div>
    )
  }

  if (!started && poster) {
    return (
      <div className={`${frame} ${className}`}>
        <img src={poster} alt={posterAlt} className="w-full h-full object-cover" />
        <button
          type="button"
          onClick={() => {
            setMuted(false)
            setStarted(true)
          }}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/30 hover:bg-black/40 transition-colors"
          aria-label={playLabel ?? 'Play video'}
        >
          <span className="w-20 h-20 rounded-full bg-white text-cta-ink flex items-center justify-center shadow-lg">
            <Play size={36} className="ml-1" fill="currentColor" aria-hidden="true" />
          </span>
          {playLabel && (
            <span className="px-4 py-1.5 rounded-full bg-black/60 text-white font-barlow font-semibold text-[17px]">
              {playLabel}
            </span>
          )}
        </button>
      </div>
    )
  }

  if (parsed.provider !== 'file') {
    return (
      <div className={`${frame} ${className}`}>
        <iframe
          key={muted ? 'muted' : 'sound'}
          src={embedUrl(parsed, { muted })}
          title={posterAlt || placeholder}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
        {muted && (
          <button type="button" onClick={() => setMuted(false)} className={hearButton}>
            <Volume2 size={18} aria-hidden="true" />
            {hearLabel}
          </button>
        )}
      </div>
    )
  }

  const unmute = () => {
    const el = videoRef.current
    if (!el) return
    el.muted = false
    el.currentTime = 0
    void el.play()
    setMuted(false)
  }

  return (
    <div className={`${frame} ${className}`}>
      <video
        ref={videoRef}
        src={parsed.url}
        autoPlay
        muted={muted}
        playsInline
        loop={muted}
        controls={!muted}
        poster={poster ?? undefined}
        className="w-full h-full object-cover"
      />
      {muted && (
        <button type="button" onClick={unmute} className={hearButton}>
          <Volume2 size={18} aria-hidden="true" />
          {hearLabel}
        </button>
      )}
    </div>
  )
}
