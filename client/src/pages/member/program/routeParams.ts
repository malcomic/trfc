/** Positive whole numbers from the URL, such as the week or day; anything else is null. */
export function parseRouteNumber(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null
  const n = Number(value)
  return n > 0 ? n : null
}
