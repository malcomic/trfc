export type AnnouncementLinkType = 'internal' | 'external' | null

/** Mirrors the server rule: site paths open in-app, https links open in a new tab, anything else is not linked. */
export function announcementLinkType(url: string | null | undefined): AnnouncementLinkType {
  if (!url) return null
  if (url.startsWith('/')) return url.startsWith('//') ? null : 'internal'
  try {
    return new URL(url).protocol === 'https:' ? 'external' : null
  } catch {
    return null
  }
}

export const formatAnnouncementDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })

export function unreadBadgeLabel(count: number): string | null {
  if (count <= 0) return null
  return count > 9 ? '9+' : String(count)
}
