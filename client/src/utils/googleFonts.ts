import type { TypographySettings } from '../config/fontCatalog'

const GOOGLE_FONTS_LINK_ID = 'trfc-google-fonts'

export function buildGoogleFontsUrl(fonts: string[]): string {
  const unique = [...new Set(fonts.map((font) => font.trim()).filter(Boolean))]
  if (unique.length === 0) {
    return ''
  }

  const params = unique
    .map((name) => `family=${encodeURIComponent(name).replace(/%20/g, '+')}:wght@400;600;700`)
    .join('&')

  return `https://fonts.googleapis.com/css2?${params}&display=swap`
}

export function loadGoogleFonts(fonts: string[]): void {
  const url = buildGoogleFontsUrl(fonts)
  if (!url) {
    return
  }

  let link = document.getElementById(GOOGLE_FONTS_LINK_ID) as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.id = GOOGLE_FONTS_LINK_ID
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }

  if (link.href !== url) {
    link.href = url
  }
}

export function applyTypographyVariables(settings: TypographySettings): void {
  const root = document.documentElement
  root.style.setProperty('--font-sans', `'${settings.sans_font}', system-ui, sans-serif`)
  root.style.setProperty('--font-display', `'${settings.display_font}', sans-serif`)
  root.style.setProperty('--font-body', `'${settings.body_font}', sans-serif`)
  root.style.setProperty('--font-condensed', `'${settings.condensed_font}', sans-serif`)
}

export function applyTypography(settings: TypographySettings): void {
  applyTypographyVariables(settings)
  loadGoogleFonts([
    settings.display_font,
    settings.body_font,
    settings.condensed_font,
    settings.sans_font,
  ])
}
