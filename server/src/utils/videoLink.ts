export type VideoProvider = 'file' | 'youtube' | 'vimeo'

export type ParsedVideoLink =
  | { provider: 'youtube'; id: string }
  | { provider: 'vimeo'; id: string; hash?: string }
  | { provider: 'file'; url: string }

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'])
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/
const FILE_EXTENSION = /\.(mp4|webm|mov|m4v)$/i

/** Recognises YouTube, Vimeo and direct video file links. Only https URLs are accepted. */
export function parseVideoLink(raw: unknown): ParsedVideoLink | null {
  if (typeof raw !== 'string') return null
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

export function isHttpsUrl(raw: unknown): raw is string {
  if (typeof raw !== 'string') return false
  try {
    return new URL(raw).protocol === 'https:'
  } catch {
    return false
  }
}
