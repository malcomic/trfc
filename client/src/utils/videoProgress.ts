/** Share of a video that counts as watched; people often close during the last seconds of credits. */
export const WATCHED_THRESHOLD = 0.9

export const watchedEnough = (current: number, duration: number) =>
  Number.isFinite(duration) && duration > 0 && current / duration >= WATCHED_THRESHOLD
