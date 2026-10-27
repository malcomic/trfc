import { describe, it, expect } from 'vitest'
import { embedUrl, parseVideoLink } from '../../utils/videoLink'

describe('parseVideoLink', () => {
  it('recognises the common YouTube link shapes', () => {
    for (const url of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://youtube.com/shorts/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    ]) {
      expect(parseVideoLink(url)).toEqual({ provider: 'youtube', id: 'dQw4w9WgXcQ' })
    }
  })

  it('recognises Vimeo links, including unlisted hashes', () => {
    expect(parseVideoLink('https://vimeo.com/123456789')).toEqual({ provider: 'vimeo', id: '123456789' })
    expect(parseVideoLink('https://vimeo.com/123456789/abc123')).toEqual({ provider: 'vimeo', id: '123456789', hash: 'abc123' })
    expect(parseVideoLink('https://player.vimeo.com/video/123456789?h=abc123')).toEqual({
      provider: 'vimeo',
      id: '123456789',
      hash: 'abc123',
    })
  })

  it('treats direct video files and Cloudinary uploads as files', () => {
    expect(parseVideoLink('https://cdn.example.com/clip.mp4')).toEqual({ provider: 'file', url: 'https://cdn.example.com/clip.mp4' })
    expect(parseVideoLink('https://res.cloudinary.com/demo/video/upload/v1/trfc_gallery/abc')?.provider).toBe('file')
  })

  it('rejects http, unknown hosts and malformed values', () => {
    expect(parseVideoLink('http://youtu.be/dQw4w9WgXcQ')).toBeNull()
    expect(parseVideoLink('https://example.com/page')).toBeNull()
    expect(parseVideoLink('https://www.youtube.com/watch?v=short')).toBeNull()
    expect(parseVideoLink('not a url')).toBeNull()
    expect(parseVideoLink('')).toBeNull()
  })
})

describe('embedUrl', () => {
  it('autoplays muted on a loop, or with sound and controls once unmuted', () => {
    const muted = new URL(embedUrl({ provider: 'youtube', id: 'dQw4w9WgXcQ' }, { muted: true }))
    expect(muted.searchParams.get('mute')).toBe('1')
    expect(muted.searchParams.get('playlist')).toBe('dQw4w9WgXcQ')
    const sound = new URL(embedUrl({ provider: 'youtube', id: 'dQw4w9WgXcQ' }, { muted: false }))
    expect(sound.searchParams.get('mute')).toBe('0')
    expect(sound.searchParams.get('controls')).toBe('1')
  })

  it('keeps the Vimeo unlisted hash', () => {
    const url = new URL(embedUrl({ provider: 'vimeo', id: '123', hash: 'abc' }, { muted: false }))
    expect(url.searchParams.get('h')).toBe('abc')
    expect(url.searchParams.get('muted')).toBe('0')
  })
})
