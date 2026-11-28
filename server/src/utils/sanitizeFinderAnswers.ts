/** Keys from the legacy 3-question quiz. */
const LEGACY_KEYS = ['goal', 'experience', 'days'] as const

/** Medical answer is never stored on the member profile. */
const STRIP_KEYS = new Set(['h5', 'heartLung', 'heart_lung'])

const MAX_STRING = 200
const MAX_DEPTH = 4
const MAX_KEYS = 80
const MAX_JSON_CHARS = 12_000

function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > MAX_STRING) return null
  return trimmed
}

function cleanPrimitive(value: unknown): string | number | boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number' && Number.isFinite(value) && Math.abs(value) < 1e9) return value
  return cleanString(value)
}

function cleanValue(value: unknown, depth: number): unknown {
  if (depth > MAX_DEPTH) return undefined
  if (Array.isArray(value)) {
    const items = value
      .slice(0, 20)
      .map((item) => cleanValue(item, depth + 1))
      .filter((item) => item !== undefined)
    return items.length ? items : undefined
  }
  if (value && typeof value === 'object') {
    return cleanObject(value as Record<string, unknown>, depth + 1) ?? undefined
  }
  const primitive = cleanPrimitive(value)
  return primitive === null ? undefined : primitive
}

function cleanObject(source: Record<string, unknown>, depth: number): Record<string, unknown> | null {
  const out: Record<string, unknown> = {}
  let count = 0
  for (const [rawKey, rawValue] of Object.entries(source)) {
    if (count >= MAX_KEYS) break
    const key = rawKey.trim()
    if (!key || key.length > 40 || STRIP_KEYS.has(key)) continue
    const cleaned = cleanValue(rawValue, depth)
    if (cleaned === undefined) continue
    out[key] = cleaned
    count += 1
  }
  return Object.keys(out).length > 0 ? out : null
}

/**
 * Accepts either the legacy `{ goal, experience, days }` shape or a versioned finder
 * payload (`{ version: 2, answers: {...}, ... }`). Strips medical answers and caps size.
 */
export function sanitizeQuizAnswers(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const source = value as Record<string, unknown>

  // Legacy flat shape
  if (!('version' in source) && !('answers' in source)) {
    const clean: Record<string, string> = {}
    for (const key of LEGACY_KEYS) {
      const v = cleanString(source[key])
      if (v && v.length <= 20) clean[key] = v
    }
    return Object.keys(clean).length > 0 ? clean : null
  }

  const cleaned = cleanObject(source, 0)
  if (!cleaned) return null
  if (JSON.stringify(cleaned).length > MAX_JSON_CHARS) return null
  return cleaned
}
