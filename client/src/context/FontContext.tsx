import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { DEFAULT_TYPOGRAPHY, type TypographySettings } from '../config/fontCatalog'
import { getTypography } from '../api/settings'
import { applyTypography } from '../utils/googleFonts'

const TYPOGRAPHY_CACHE_KEY = 'trfc-typography'

interface FontContextType {
  typography: TypographySettings
  refreshTypography: () => Promise<void>
  applyTypographySettings: (settings: TypographySettings) => void
}

const FontContext = createContext<FontContextType | undefined>(undefined)

function isTypographySettings(value: unknown): value is TypographySettings {
  if (!value || typeof value !== 'object') {
    return false
  }

  const record = value as Record<string, unknown>
  return (
    typeof record.display_font === 'string' &&
    typeof record.body_font === 'string' &&
    typeof record.condensed_font === 'string' &&
    typeof record.sans_font === 'string'
  )
}

export function FontProvider({ children }: { children: React.ReactNode }) {
  const [typography, setTypography] = useState<TypographySettings>({ ...DEFAULT_TYPOGRAPHY })

  const applyTypographySettings = useCallback((settings: TypographySettings) => {
    setTypography(settings)
    applyTypography(settings)
    localStorage.setItem(TYPOGRAPHY_CACHE_KEY, JSON.stringify(settings))
  }, [])

  const refreshTypography = useCallback(async () => {
    try {
      const data = await getTypography()
      if (isTypographySettings(data)) {
        applyTypographySettings(data)
      }
    } catch (error) {
      console.error('Failed to load typography settings:', error)
    }
  }, [applyTypographySettings])

  useEffect(() => {
    const cached = localStorage.getItem(TYPOGRAPHY_CACHE_KEY)
    let hasCachedSettings = false

    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (isTypographySettings(parsed)) {
          applyTypography(parsed)
          setTypography(parsed)
          hasCachedSettings = true
        }
      } catch {
        localStorage.removeItem(TYPOGRAPHY_CACHE_KEY)
      }
    }

    if (!hasCachedSettings) {
      applyTypography({ ...DEFAULT_TYPOGRAPHY })
    }

    refreshTypography()
  }, [refreshTypography])

  return (
    <FontContext.Provider value={{ typography, refreshTypography, applyTypographySettings }}>
      {children}
    </FontContext.Provider>
  )
}

export function useFonts() {
  const context = useContext(FontContext)
  if (!context) {
    throw new Error('useFonts must be used within FontProvider')
  }
  return context
}
