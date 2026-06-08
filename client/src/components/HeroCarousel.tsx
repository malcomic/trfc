import { useCallback, useEffect, useRef, useState, type ImgHTMLAttributes } from 'react'

const IMAGE_INTERVAL_MS = 6000
const VIDEO_MAX_MS = 30000

export interface HeroSlideItem {
  id: string
  media_url: string
  media_type?: string
  caption?: string
}

interface HeroCarouselProps {
  slides: HeroSlideItem[]
}

export default function HeroCarousel({ slides }: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const slideCount = slides.length
  const activeSlide = slides[activeIndex]
  const isVideo = activeSlide?.media_type === 'video'

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const goToNext = useCallback(() => {
    if (slideCount <= 1) return
    setActiveIndex((prev) => (prev + 1) % slideCount)
  }, [slideCount])

  const scheduleImageAdvance = useCallback(() => {
    clearTimer()
    if (slideCount <= 1) return
    timerRef.current = setTimeout(goToNext, IMAGE_INTERVAL_MS)
  }, [clearTimer, goToNext, slideCount])

  const scheduleVideoFallback = useCallback(() => {
    clearTimer()
    if (slideCount <= 1) return
    timerRef.current = setTimeout(goToNext, VIDEO_MAX_MS)
  }, [clearTimer, goToNext, slideCount])

  useEffect(() => {
    if (slideCount <= 1) return

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        clearTimer()
        videoRef.current?.pause()
      } else if (isVideo) {
        videoRef.current?.play().catch(() => {})
        scheduleVideoFallback()
      } else {
        scheduleImageAdvance()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [clearTimer, isVideo, scheduleImageAdvance, scheduleVideoFallback, slideCount])

  useEffect(() => {
    clearTimer()
    if (slideCount <= 1) return

    if (isVideo) {
      scheduleVideoFallback()
    } else {
      scheduleImageAdvance()
    }

    return clearTimer
  }, [activeIndex, clearTimer, isVideo, scheduleImageAdvance, scheduleVideoFallback, slideCount])

  useEffect(() => {
    if (!isVideo || !videoRef.current) return
    const video = videoRef.current
    video.currentTime = 0
    video.play().catch(() => {})
  }, [activeIndex, isVideo])

  const handleVideoEnded = () => {
    if (slideCount > 1) goToNext()
  }

  const defaultAlt = 'TRFC community members training together'

  return (
    <div className="absolute inset-0 w-full h-full">
      {slides.map((slide, index) => {
        const isActive = index === activeIndex
        const isSlideVideo = slide.media_type === 'video'

        return (
          <div
            key={slide.id}
            className="absolute inset-0 w-full h-full transition-opacity duration-[800ms] ease-in-out"
            style={{ opacity: isActive ? 1 : 0, zIndex: isActive ? 1 : 0 }}
            aria-hidden={!isActive}
          >
            {isSlideVideo ? (
              <video
                ref={isActive ? videoRef : undefined}
                src={slide.media_url}
                className="absolute inset-0 w-full h-full object-cover object-center"
                autoPlay={isActive}
                muted
                playsInline
                preload={index === activeIndex || index === (activeIndex + 1) % slideCount ? 'auto' : 'metadata'}
                onEnded={isActive ? handleVideoEnded : undefined}
                onError={isActive ? goToNext : undefined}
              />
            ) : (
              <img
                src={slide.media_url}
                alt={slide.caption || defaultAlt}
                className="absolute inset-0 w-full h-full object-cover object-center"
                {...(index === 0 ? ({ fetchpriority: 'high' } as ImgHTMLAttributes<HTMLImageElement>) : {})}
                onError={isActive ? goToNext : undefined}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
