export const FONT_CATALOG = {
  display: ['Bebas Neue', 'Oswald', 'Anton', 'Archivo Black', 'Teko'],
  body: ['Barlow', 'Inter', 'Roboto', 'Open Sans', 'Lato', 'Source Sans 3'],
  condensed: ['Barlow Condensed', 'Roboto Condensed', 'Oswald', 'Archivo Narrow'],
  sans: ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Nunito Sans'],
} as const

export const DEFAULT_TYPOGRAPHY = {
  display_font: 'Bebas Neue',
  body_font: 'Barlow',
  condensed_font: 'Barlow Condensed',
  sans_font: 'Inter',
} as const

export type TypographySettings = {
  display_font: string
  body_font: string
  condensed_font: string
  sans_font: string
}

type TypographyRole = keyof typeof FONT_CATALOG

const ROLE_FIELD: Record<TypographyRole, keyof TypographySettings> = {
  display: 'display_font',
  body: 'body_font',
  condensed: 'condensed_font',
  sans: 'sans_font',
}

export function isValidFontForRole(role: TypographyRole, font: string): boolean {
  return (FONT_CATALOG[role] as readonly string[]).includes(font)
}

export function validateTypography(
  body: unknown
): { valid: true; settings: TypographySettings } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid typography payload' }
  }

  const input = body as Record<string, unknown>
  const settings: TypographySettings = { ...DEFAULT_TYPOGRAPHY }

  for (const role of Object.keys(FONT_CATALOG) as TypographyRole[]) {
    const field = ROLE_FIELD[role]
    const value = input[field]

    if (value === undefined) {
      continue
    }

    if (typeof value !== 'string' || !value.trim()) {
      return { valid: false, error: `${field} must be a non-empty string` }
    }

    const font = value.trim()
    if (!/^[a-zA-Z0-9 ]+$/.test(font)) {
      return { valid: false, error: `${field} contains invalid characters` }
    }

    if (!isValidFontForRole(role, font)) {
      return { valid: false, error: `${font} is not allowed for ${field}` }
    }

    settings[field] = font
  }

  return { valid: true, settings }
}

export function parseTypographyRow(row: Record<string, unknown> | undefined): TypographySettings {
  if (!row) {
    return { ...DEFAULT_TYPOGRAPHY }
  }

  return {
    display_font:
      typeof row.display_font === 'string' && isValidFontForRole('display', row.display_font)
        ? row.display_font
        : DEFAULT_TYPOGRAPHY.display_font,
    body_font:
      typeof row.body_font === 'string' && isValidFontForRole('body', row.body_font)
        ? row.body_font
        : DEFAULT_TYPOGRAPHY.body_font,
    condensed_font:
      typeof row.condensed_font === 'string' && isValidFontForRole('condensed', row.condensed_font)
        ? row.condensed_font
        : DEFAULT_TYPOGRAPHY.condensed_font,
    sans_font:
      typeof row.sans_font === 'string' && isValidFontForRole('sans', row.sans_font)
        ? row.sans_font
        : DEFAULT_TYPOGRAPHY.sans_font,
  }
}
