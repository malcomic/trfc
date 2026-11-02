import { describe, it, expect, vi } from 'vitest'

vi.mock('../../config/db.js', () => ({ query: vi.fn(), getClient: vi.fn() }))

import { isSiteImageSlot, parseSiteImageInput } from '../../controllers/siteImagesController.js'

const IMAGE_URL = 'https://res.cloudinary.com/demo/image/upload/v1/trfc_site/coach.jpg'

describe('parseSiteImageInput', () => {
  it('keeps an https image and trims the alt text', () => {
    expect(parseSiteImageInput({ image_url: ` ${IMAGE_URL} `, alt_text: '  Coach Maurice  ' })).toEqual({
      imageUrl: IMAGE_URL,
      altText: 'Coach Maurice',
    })
  })

  it('stores empty alt text as null', () => {
    expect(parseSiteImageInput({ image_url: IMAGE_URL, alt_text: '   ' })).toEqual({ imageUrl: IMAGE_URL, altText: null })
    expect(parseSiteImageInput({ image_url: IMAGE_URL })).toEqual({ imageUrl: IMAGE_URL, altText: null })
  })

  it('rejects non-https URLs, non-text alt text and alt text that is too long', () => {
    expect(parseSiteImageInput({ image_url: 'http://example.com/a.jpg' })).toMatch(/https/)
    expect(parseSiteImageInput({ image_url: 'javascript:alert(1)' })).toMatch(/https/)
    expect(parseSiteImageInput({})).toMatch(/https/)
    expect(parseSiteImageInput({ image_url: IMAGE_URL, alt_text: 42 })).toMatch(/text/)
    expect(parseSiteImageInput({ image_url: IMAGE_URL, alt_text: 'a'.repeat(256) })).toMatch(/255/)
  })
})

describe('isSiteImageSlot', () => {
  it('only allows the known slots', () => {
    expect(isSiteImageSlot('coach')).toBe(true)
    expect(isSiteImageSlot('program_hiking')).toBe(true)
    expect(isSiteImageSlot('find_results_cover')).toBe(true)
    expect(isSiteImageSlot('home_hero')).toBe(false)
    expect(isSiteImageSlot(undefined)).toBe(false)
  })
})
