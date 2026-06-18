export const FONT_CATALOG = {
  display: [
    'Bebas Neue',
    'Oswald',
    'Anton',
    'Archivo Black',
    'Teko',
    'Alfa Slab One',
    'Bungee',
    'Cinzel',
    'Fjalla One',
    'Kanit',
    'League Spartan',
    'Montserrat',
    'Orbitron',
    'Passion One',
    'Playfair Display',
    'Poppins',
    'Rajdhani',
    'Righteous',
    'Russo One',
    'Saira Extra Condensed',
    'Staatliches',
    'Syne',
    'Titillium Web',
    'Ultra',
    'Work Sans',
  ],
  body: [
    'Barlow',
    'Bebas Neue',
    'Inter',
    'Roboto',
    'Open Sans',
    'Lato',
    'Source Sans 3',
    'DM Sans',
    'Manrope',
    'Merriweather',
    'Montserrat',
    'Nunito',
    'Poppins',
    'PT Sans',
    'Raleway',
    'Rubik',
    'Ubuntu',
    'Work Sans',
    'IBM Plex Sans',
    'Karla',
    'Mulish',
    'Outfit',
    'Plus Jakarta Sans',
    'Quicksand',
    'Red Hat Display',
    'Space Grotesk',
    'Figtree',
    'Lexend',
    'Epilogue',
    'Cabin',
    'Hind',
  ],
  condensed: [
    'Barlow Condensed',
    'Roboto Condensed',
    'Oswald',
    'Archivo Narrow',
    'Bebas Neue',
    'Saira Condensed',
    'Saira Extra Condensed',
    'Yanone Kaffeesatz',
    'Pathway Gothic One',
    'Chivo',
    'Fjalla One',
    'Anton',
    'Teko',
    'Big Shoulders Display',
    'League Spartan',
    'Rajdhani',
    'Titillium Web',
    'Abel',
    'Asap Condensed',
    'Encode Sans Condensed',
    'Exo 2',
    'Kanit',
    'Passion One',
    'Russo One',
    'Staatliches',
  ],
  sans: [
    'Inter',
    'Bebas Neue',
    'Roboto',
    'Open Sans',
    'Lato',
    'Nunito Sans',
    'Source Sans 3',
    'DM Sans',
    'Manrope',
    'Montserrat',
    'Nunito',
    'Poppins',
    'PT Sans',
    'Raleway',
    'Rubik',
    'Ubuntu',
    'Work Sans',
    'IBM Plex Sans',
    'Karla',
    'Mulish',
    'Outfit',
    'Plus Jakarta Sans',
    'Figtree',
    'Lexend',
    'Barlow',
    'Cabin',
    'Hind',
    'Quicksand',
    'Red Hat Display',
    'Space Grotesk',
    'Epilogue',
  ],
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
