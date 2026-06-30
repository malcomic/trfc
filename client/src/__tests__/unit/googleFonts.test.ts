import { describe, it, expect } from 'vitest'
import { buildGoogleFontsUrl } from '../../utils/googleFonts'

describe('buildGoogleFontsUrl', () => {
  it('builds a Google Fonts URL for unique families', () => {
    const url = buildGoogleFontsUrl(['Inter', 'Bebas Neue', 'Barlow', 'Inter'])

    expect(url).toContain('family=Inter:wght@400;600;700')
    expect(url).toContain('family=Bebas+Neue:wght@400;600;700')
    expect(url).toContain('family=Barlow:wght@400;600;700')
    expect(url).toContain('display=swap')
    expect(url.split('family=').length - 1).toBe(3)
  })

  it('encodes font names with spaces', () => {
    const url = buildGoogleFontsUrl(['Barlow Condensed', 'Source Sans 3'])

    expect(url).toContain('family=Barlow+Condensed:wght@400;600;700')
    expect(url).toContain('family=Source+Sans+3:wght@400;600;700')
  })

  it('returns an empty string when no fonts are provided', () => {
    expect(buildGoogleFontsUrl([])).toBe('')
    expect(buildGoogleFontsUrl(['', '   '])).toBe('')
  })
})
