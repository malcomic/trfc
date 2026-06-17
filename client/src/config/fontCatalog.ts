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

export const TYPOGRAPHY_LABELS = {
  display_font: 'Display / Headings',
  body_font: 'Body Text',
  condensed_font: 'Labels / Condensed',
  sans_font: 'Sans Fallback',
} as const

export type TypographyField = keyof TypographySettings

export const TYPOGRAPHY_FIELDS: TypographyField[] = [
  'display_font',
  'body_font',
  'condensed_font',
  'sans_font',
]

export function getCatalogForField(field: TypographyField): readonly string[] {
  switch (field) {
    case 'display_font':
      return FONT_CATALOG.display
    case 'body_font':
      return FONT_CATALOG.body
    case 'condensed_font':
      return FONT_CATALOG.condensed
    case 'sans_font':
      return FONT_CATALOG.sans
  }
}

export function getAllCatalogFonts(): string[] {
  return [
    ...new Set([
      ...FONT_CATALOG.display,
      ...FONT_CATALOG.body,
      ...FONT_CATALOG.condensed,
      ...FONT_CATALOG.sans,
    ]),
  ]
}
