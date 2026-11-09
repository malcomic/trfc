import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Local, unsaved copy of one part of a program. Resets whenever the saved value changes
 * (after a save, a reload or a restore) and reports whether there are unsaved edits.
 */
export function useSectionDraft<T>(saved: T, onDirtyChange?: (dirty: boolean) => void) {
  const [value, setValue] = useState<T>(saved)
  const savedKey = JSON.stringify(saved)
  const savedRef = useRef(saved)
  savedRef.current = saved

  useEffect(() => {
    setValue(savedRef.current)
  }, [savedKey])

  const dirty = JSON.stringify(value) !== savedKey
  const notify = useRef(onDirtyChange)
  notify.current = onDirtyChange

  useEffect(() => {
    notify.current?.(dirty)
  }, [dirty])

  useEffect(() => () => notify.current?.(false), [])

  const reset = useCallback(() => setValue(savedRef.current), [])
  return { value, setValue, dirty, reset }
}
