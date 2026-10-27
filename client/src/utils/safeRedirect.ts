/** Returns `raw` only when it is a same-site path, otherwise `fallback`. */
export function safeRedirect(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback
  try {
    const decoded = decodeURIComponent(raw)
    if (decoded.startsWith('/') && !decoded.startsWith('//') && !decoded.startsWith('/\\')) return decoded
  } catch {
    /* malformed encoding */
  }
  return fallback
}
