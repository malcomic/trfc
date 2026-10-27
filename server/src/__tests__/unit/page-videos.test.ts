import { describe, it, expect, vi } from 'vitest'

vi.mock('../../config/db.js', () => ({ query: vi.fn(), getClient: vi.fn() }))

import { isPageVideoSlot, parsePageVideoInput } from '../../controllers/pageVideosController.js'
import { parseVideoLink } from '../../utils/videoLink.js'

const UPLOAD_URL = 'https://res.cloudinary.com/demo/video/upload/v1/trfc_gallery/clip.mp4'

describe('parseVideoLink', () => {
  it('accepts YouTube, Vimeo and direct files over https only', () => {
    expect(parseVideoLink('https://youtu.be/dQw4w9WgXcQ')).toEqual({ provider: 'youtube', id: 'dQw4w9WgXcQ' })
    expect(parseVideoLink('https://vimeo.com/123456')).toEqual({ provider: 'vimeo', id: '123456' })
    expect(parseVideoLink(UPLOAD_URL)?.provider).toBe('file')
    expect(parseVideoLink('http://youtu.be/dQw4w9WgXcQ')).toBeNull()
    expect(parseVideoLink('https://evil.example.com/page')).toBeNull()
    expect(parseVideoLink(42)).toBeNull()
  })
})

describe('parsePageVideoInput', () => {
  it('works out the provider for pasted links', () => {
    expect(parsePageVideoInput({ source: 'link', video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })).toEqual({
      source: 'link',
      provider: 'youtube',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      posterUrl: null,
    })
  })

  it('keeps an https cover image', () => {
    const input = parsePageVideoInput({ source: 'upload', video_url: UPLOAD_URL, poster_url: 'https://cdn.example.com/cover.jpg' })
    expect(input).toMatchObject({ provider: 'file', posterUrl: 'https://cdn.example.com/cover.jpg' })
  })

  it('rejects unknown sources, unrecognised links, YouTube marked as an upload and non-https covers', () => {
    expect(parsePageVideoInput({ source: 'other', video_url: UPLOAD_URL })).toMatch(/upload or a link/)
    expect(parsePageVideoInput({ source: 'link', video_url: 'https://example.com/page' })).toMatch(/YouTube, Vimeo/)
    expect(parsePageVideoInput({ source: 'upload', video_url: 'https://youtu.be/dQw4w9WgXcQ' })).toMatch(/video files/)
    expect(parsePageVideoInput({ source: 'upload', video_url: UPLOAD_URL, poster_url: 'javascript:alert(1)' })).toMatch(
      /cover image/
    )
  })
})

describe('isPageVideoSlot', () => {
  it('only allows the known slots', () => {
    expect(isPageVideoSlot('find_hero')).toBe(true)
    expect(isPageVideoSlot('find_results')).toBe(true)
    expect(isPageVideoSlot('home_hero')).toBe(false)
  })
})
