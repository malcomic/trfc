const DATA_URL_MIN_LENGTH = 200

export function getSafeImageUrl(
  url: string | undefined | null,
  fallback: string
): string {
  if (!url || typeof url !== 'string') return fallback

  const trimmed = url.trim()
  if (!trimmed) return fallback

  if (trimmed.startsWith('data:')) {
    const commaIndex = trimmed.indexOf(',')
    if (commaIndex === -1) return fallback

    const payload = trimmed.slice(commaIndex + 1)
    if (payload.length < DATA_URL_MIN_LENGTH) return fallback

    return fallback
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }

  return fallback
}
