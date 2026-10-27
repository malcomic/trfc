import { useEffect, useState } from 'react'
import { getPageVideos, type PageVideos } from '../api/pageVideos'

export function usePageVideos(page: string) {
  const [videos, setVideos] = useState<PageVideos>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    getPageVideos(page)
      .then((data) => active && setVideos(data ?? {}))
      .catch(() => undefined)
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [page])

  return { videos, loading }
}
