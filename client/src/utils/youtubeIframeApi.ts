export interface YouTubePlayer {
  getCurrentTime(): number
  getDuration(): number
  getPlayerState(): number
  playVideo(): void
  mute(): void
  unMute(): void
  destroy(): void
}

export interface YouTubePlayerEvent {
  data: number
  target: YouTubePlayer
}

export interface YouTubeNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string
      width?: string | number
      height?: string | number
      host?: string
      playerVars?: Record<string, string | number>
      events?: {
        onReady?: (event: { target: YouTubePlayer }) => void
        onStateChange?: (event: YouTubePlayerEvent) => void
        /** Fired when the browser refuses to start the video with sound. */
        onAutoplayBlocked?: (event: { target: YouTubePlayer }) => void
      }
    }
  ) => YouTubePlayer
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number }
}

declare global {
  interface Window {
    YT?: YouTubeNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

const SCRIPT_SRC = 'https://www.youtube.com/iframe_api'
let loading: Promise<YouTubeNamespace> | null = null

/** Loads YouTube's IFrame Player API once and resolves with `window.YT`. */
export function loadYouTubeIframeApi(): Promise<YouTubeNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (loading) return loading

  loading = new Promise<YouTubeNamespace>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      if (window.YT) resolve(window.YT)
    }
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onerror = () => {
      loading = null
      script.remove()
      reject(new Error('Could not load the YouTube player'))
    }
    document.head.appendChild(script)
  })
  return loading
}
