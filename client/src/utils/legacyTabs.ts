const LEGACY_TABS = new Set(['calendar', 'tickets', 'wallet', 'medals', 'payments', 'profile', 'captain'])

/** Maps an old `/dashboard?tab=x` value to its page, or null to stay on the overview. */
export function legacyTabPath(tab: string | null): string | null {
  if (!tab || !LEGACY_TABS.has(tab)) return null
  return `/dashboard/${tab}`
}
