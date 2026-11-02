import { useEffect, useState } from 'react'
import { getSiteImages, type SiteImages, type SiteImageSlot } from '../api/siteImages'
import { COACH_PHOTO } from '../content/programs'

const COACH_SLOTS: SiteImageSlot[] = ['coach']

export function useSiteImages(slots: SiteImageSlot[]) {
  const [images, setImages] = useState<SiteImages>({})
  const [loading, setLoading] = useState(true)
  const key = slots.join(',')

  useEffect(() => {
    let active = true
    getSiteImages(key ? (key.split(',') as SiteImageSlot[]) : undefined)
      .then((data) => active && setImages(data))
      .catch(() => undefined)
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [key])

  return { images, loading }
}

/** `src` stays undefined while loading so the default photo doesn't flash before a custom one. */
export function useCoachPhoto() {
  const { images, loading } = useSiteImages(COACH_SLOTS)
  const coach = images.coach
  return {
    src: loading ? undefined : coach?.image_url || COACH_PHOTO,
    alt: coach?.alt_text || 'Coach Maurice',
  }
}
