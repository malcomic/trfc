import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getTypography, updateTypography } from '../../controllers/siteSettingsController.js'
import { validateTypography } from '../../config/fontCatalog.js'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
}))

import { query } from '../../config/db.js'

describe('validateTypography', () => {
  it('accepts valid fonts for each role', () => {
    const result = validateTypography({
      display_font: 'Oswald',
      body_font: 'Roboto',
      condensed_font: 'Roboto Condensed',
      sans_font: 'Lato',
    })

    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.settings).toEqual({
        display_font: 'Oswald',
        body_font: 'Roboto',
        condensed_font: 'Roboto Condensed',
        sans_font: 'Lato',
      })
    }
  })

  it('rejects fonts outside the curated catalog', () => {
    const result = validateTypography({
      display_font: 'Comic Sans MS',
    })

    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toContain('not allowed')
    }
  })

  it('rejects invalid characters in font names', () => {
    const result = validateTypography({
      body_font: 'Roboto; DROP TABLE users;',
    })

    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toContain('invalid characters')
    }
  })
})

describe('getTypography', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns defaults when row is missing', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [] } as any)

    const req = {} as any
    const res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as any

    await getTypography(req, res)

    expect(res.json).toHaveBeenCalledWith({
      display_font: 'Bebas Neue',
      body_font: 'Barlow',
      condensed_font: 'Barlow Condensed',
      sans_font: 'Inter',
    })
  })

  it('returns stored typography settings', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [
        {
          display_font: 'Anton',
          body_font: 'Lato',
          condensed_font: 'Archivo Narrow',
          sans_font: 'Nunito Sans',
        },
      ],
    } as any)

    const req = {} as any
    const res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as any

    await getTypography(req, res)

    expect(res.json).toHaveBeenCalledWith({
      display_font: 'Anton',
      body_font: 'Lato',
      condensed_font: 'Archivo Narrow',
      sans_font: 'Nunito Sans',
    })
  })
})

describe('updateTypography', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 for invalid payload', async () => {
    const req = {
      body: { display_font: 'Unknown Font' },
      user: { id: 'admin-1', role: 'admin', email: 'admin@test.com' },
    } as any
    const res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as any

    await updateTypography(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(query).not.toHaveBeenCalled()
  })

  it('persists valid typography settings', async () => {
    vi.mocked(query).mockResolvedValue({
      rows: [
        {
          display_font: 'Teko',
          body_font: 'Open Sans',
          condensed_font: 'Oswald',
          sans_font: 'Roboto',
        },
      ],
    } as any)

    const req = {
      body: {
        display_font: 'Teko',
        body_font: 'Open Sans',
        condensed_font: 'Oswald',
        sans_font: 'Roboto',
      },
      user: { id: 'admin-1', role: 'admin', email: 'admin@test.com' },
    } as any
    const res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    } as any

    await updateTypography(req, res)

    expect(query).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({
      display_font: 'Teko',
      body_font: 'Open Sans',
      condensed_font: 'Oswald',
      sans_font: 'Roboto',
    })
  })
})
