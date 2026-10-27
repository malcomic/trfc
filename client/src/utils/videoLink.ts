export type ParsedVideoLink =
  | { provider: 'youtube'; id: string }
  | { provider: 'vimeo'; id: string; hash?: string }
  | { provider: 'file'; url: string }

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'])
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/
const FILE_EXTENSION = /\.(mp4|webm|mov|m4v)$/i

/** Recognises YouTube, Vimeo and direct video file links. Mirrors the server's validation. */
export function parseVideoLink(raw: string | null | undefined): ParsedVideoLink | null {
  if (!raw) return null
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null
  const host = url.hostname.toLowerCase()
  const parts = url.pathname.split('/').filter(Boolean)

  if (host === 'youtu.be') {
    return YOUTUBE_ID.test(parts[0] ?? '') ? { provider: 'youtube', id: parts[0] } : null
  }
  if (YOUTUBE_HOSTS.has(host)) {
    const id = parts[0] === 'watch' ? url.searchParams.get('v') ?? '' : ['embed', 'shorts', 'live'].includes(parts[0]) ? parts[1] ?? '' : ''
    return YOUTUBE_ID.test(id) ? { provider: 'youtube', id } : null
  }
  if (host === 'vimeo.com' || host === 'www.vimeo.com') {
    if (!/^\d+$/.test(parts[0] ?? '')) return null
    return { provider: 'vimeo', id: parts[0], ...(parts[1] ? { hash: parts[1] } : {}) }
  }
  if (host === 'player.vimeo.com' && parts[0] === 'video' && /^\d+$/.test(parts[1] ?? '')) {
    const hash = url.searchParams.get('h') ?? undefined
    return { provider: 'vimeo', id: parts[1], ...(hash ? { hash } : {}) }
  }
  if (FILE_EXTENSION.test(url.pathname) || (host === 'res.cloudinary.com' && url.pathname.includes('/video/upload/'))) {
    return { provider: 'file', url: url.toString() }
  }
  return null
}

/** Player URL for YouTube/Vimeo embeds. `muted` autoplay loops quietly; unmuted starts with sound and controls. */
export function embedUrl(video: Exclude<ParsedVideoLink, { provider: 'file' }>, { muted }: { muted: boolean }): string {
  if (video.provider === 'youtube') {
    const params = new URLSearchParams({
      autoplay: '1',
      mute: muted ? '1' : '0',
      controls: muted ? '0' : '1',
      playsinline: '1',
      rel: '0',
      modestbranding: '1',
    })
    if (muted) {
      params.set('loop', '1')
      params.set('playlist', video.id)
    }
    return `https://www.youtube-nocookie.com/embed/${video.id}?${params}`
  }
  const params = new URLSearchParams({
    autoplay: '1',
    muted: muted ? '1' : '0',
    playsinline: '1',
    ...(muted ? { loop: '1', background: '1' } : {}),
    ...(video.hash ? { h: video.hash } : {}),
  })
  return `https://player.vimeo.com/video/${video.id}?${params}`
}
