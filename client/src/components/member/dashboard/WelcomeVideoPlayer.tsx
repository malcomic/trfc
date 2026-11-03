import { useCallback, useEffect, useRef, useState } from 'react'
import { Volume2 } from 'lucide-react'
import type { PageVideo } from '../../../api/pageVideos'
import { embedUrl, parseVideoLink } from '../../../utils/videoLink'
import { watchedEnough } from '../../../utils/videoProgress'
import { loadYouTubeIframeApi, type YouTubePlayer } from '../../../utils/youtubeIframeApi'
import { DASHBOARD_COPY } from '../../../content/dashboard'

const copy = DASHBOARD_COPY.welcomeVideo
const frame = 'relative w-full aspect-video rounded-xl overflow-hidden bg-black'
const soundButton =
  'absolute left-4 bottom-16 z-10 inline-flex items-center gap-2 min-h-[44px] px-5 rounded-full bg-white text-cta-ink font-barlow font-semibold text-[17px] shadow-lg'
const PROGRESS_POLL_MS = 1000
/** How long to wait for YouTube to start before assuming the browser blocked sound. */
const AUTOPLAY_CHECK_MS = 1500

interface WelcomeVideoPlayerProps {
  video: Pick<PageVideo, 'video_url' | 'poster_url'>
  /** Called once, when the member has watched enough of an uploaded or YouTube video. */
  onWatched: () => void
}

function SoundButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={soundButton}>
      <Volume2 size={18} aria-hidden="true" />
      {copy.sound}
    </button>
  )
}

/**
 * Browsers only allow sound without a tap when the member has already interacted with the site,
 * so playback starts with sound and falls back to muted with a "Tap for sound" button if refused.
 */
function FileVideo({ url, poster, onWatched }: { url: string; poster: string | null; onWatched: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    el.muted = false
    el.play().catch(() => {
      el.muted = true
      setMuted(true)
      el.play().catch(() => undefined)
    })
  }, [url])

  const unmute = () => {
    const el = videoRef.current
    if (!el) return
    el.muted = false
    setMuted(false)
    void el.play()
  }

  return (
    <>
      <video
        ref={videoRef}
        src={url}
        controls
        playsInline
        poster={poster ?? undefined}
        onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
        onTimeUpdate={(e) => {
          if (watchedEnough(e.currentTarget.currentTime, e.currentTarget.duration)) onWatched()
        }}
        onEnded={onWatched}
        className="w-full h-full object-contain"
      />
      {muted && <SoundButton onClick={unmute} />}
    </>
  )
}

function YouTubeFrame({ videoId, onWatched }: { videoId: string; onWatched: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YouTubePlayer | null>(null)
  const [failed, setFailed] = useState(false)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    let poll: number | undefined
    let autoplayCheck: number | undefined
    let cancelled = false
    const stopPolling = () => window.clearInterval(poll)
    const playMuted = (p: YouTubePlayer) => {
      if (cancelled) return
      p.mute()
      p.playVideo()
      setMuted(true)
    }

    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !hostRef.current) return
        const target = document.createElement('div')
        hostRef.current.appendChild(target)
        playerRef.current = new YT.Player(target, {
          videoId,
          width: '100%',
          height: '100%',
          host: 'https://www.youtube-nocookie.com',
          playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1 },
          events: {
            onReady: ({ target: p }) => {
              p.unMute()
              p.playVideo()
              autoplayCheck = window.setTimeout(() => {
                if (p.getPlayerState() !== YT.PlayerState.PLAYING) playMuted(p)
              }, AUTOPLAY_CHECK_MS)
            },
            onAutoplayBlocked: ({ target: p }) => {
              window.clearTimeout(autoplayCheck)
              playMuted(p)
            },
            onStateChange: ({ data, target: p }) => {
              stopPolling()
              if (data === YT.PlayerState.ENDED) return onWatched()
              if (data === YT.PlayerState.PLAYING) {
                poll = window.setInterval(() => {
                  if (watchedEnough(p.getCurrentTime(), p.getDuration())) onWatched()
                }, PROGRESS_POLL_MS)
              }
            },
          },
        })
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
      stopPolling()
      window.clearTimeout(autoplayCheck)
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [videoId, onWatched])

  const unmute = () => {
    playerRef.current?.unMute()
    playerRef.current?.playVideo()
    setMuted(false)
  }

  if (failed) {
    return (
      <iframe
        src={embedUrl({ provider: 'youtube', id: videoId }, { muted: false })}
        title={copy.heading}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="absolute inset-0 w-full h-full border-0"
      />
    )
  }
  return (
    <>
      <div ref={hostRef} className="absolute inset-0 [&_iframe]:w-full [&_iframe]:h-full" />
      {muted && <SoundButton onClick={unmute} />}
    </>
  )
}

export default function WelcomeVideoPlayer({ video, onWatched }: WelcomeVideoPlayerProps) {
  const reported = useRef(false)
  const parsed = parseVideoLink(video.video_url) ?? { provider: 'file' as const, url: video.video_url }

  const reportWatched = useCallback(() => {
    if (reported.current) return
    reported.current = true
    onWatched()
  }, [onWatched])

  return (
    <div className={frame}>
      {parsed.provider === 'youtube' ? (
        <YouTubeFrame videoId={parsed.id} onWatched={reportWatched} />
      ) : parsed.provider === 'vimeo' ? (
        <iframe
          src={embedUrl(parsed, { muted: false })}
          title={copy.heading}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      ) : (
        <FileVideo url={parsed.url} poster={video.poster_url} onWatched={reportWatched} />
      )}
    </div>
  )
}
