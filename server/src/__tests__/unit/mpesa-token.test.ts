import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('axios', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

vi.mock('../../config/env.js', () => ({
  config: {
    mpesa: {
      consumerKey: 'key',
      consumerSecret: 'secret',
      shortcode: '174379',
      passkey: 'pass',
      env: 'sandbox',
    },
  },
}))

import axios from 'axios'
import { clearMPesaTokenCache, describeMpesaError, getMPesaToken } from '../../utils/mpesa.js'

const mockGet = vi.mocked(axios.get)

function tokenResponse(token: string, expiresIn = 3599) {
  return { data: { access_token: token, expires_in: String(expiresIn) } } as any
}

describe('getMPesaToken', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-08T09:00:00Z'))
    mockGet.mockReset()
    clearMPesaTokenCache()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('reuses the token instead of fetching one on every call', async () => {
    mockGet.mockResolvedValue(tokenResponse('t1'))

    expect(await getMPesaToken()).toBe('t1')
    expect(await getMPesaToken()).toBe('t1')
    expect(mockGet).toHaveBeenCalledTimes(1)
    expect(mockGet.mock.calls[0][1]?.headers).toMatchObject({ 'User-Agent': 'TRFC-Server/1.0' })
  })

  it('fetches a new token shortly before the old one expires', async () => {
    mockGet.mockResolvedValueOnce(tokenResponse('t1')).mockResolvedValueOnce(tokenResponse('t2'))

    expect(await getMPesaToken()).toBe('t1')
    vi.advanceTimersByTime((3599 - 60) * 1000 - 1)
    expect(await getMPesaToken()).toBe('t1')
    vi.advanceTimersByTime(1)
    expect(await getMPesaToken()).toBe('t2')
    expect(mockGet).toHaveBeenCalledTimes(2)
  })

  it('fetches again after the cache is cleared', async () => {
    mockGet.mockResolvedValueOnce(tokenResponse('t1')).mockResolvedValueOnce(tokenResponse('t2'))

    await getMPesaToken()
    clearMPesaTokenCache()
    expect(await getMPesaToken()).toBe('t2')
  })

  it('shares one request between simultaneous calls', async () => {
    mockGet.mockResolvedValue(tokenResponse('t1'))

    const [a, b, c] = await Promise.all([getMPesaToken(), getMPesaToken(), getMPesaToken()])
    expect([a, b, c]).toEqual(['t1', 't1', 't1'])
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('does not cache a failed fetch', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockGet.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(tokenResponse('t1'))

    await expect(getMPesaToken()).rejects.toThrow('network')
    expect(await getMPesaToken()).toBe('t1')
  })
})

describe('describeMpesaError', () => {
  it('summarises a firewall block without credentials', () => {
    const error = {
      message: 'Request failed with status code 403',
      config: { headers: { Authorization: 'Basic c2VjcmV0' } },
      response: {
        status: 403,
        data: '<html><body><iframe>Request unsuccessful. Incapsula incident ID: 123</iframe></body></html>',
      },
    }

    const text = describeMpesaError(error)
    expect(text).toBe('403 | Request failed with status code 403 | blocked by Safaricom firewall (Incapsula)')
    expect(text).not.toContain('Basic')
  })

  it('includes a JSON error body', () => {
    const text = describeMpesaError({
      message: 'Request failed with status code 500',
      response: { status: 500, data: { errorCode: '500.001.1001', errorMessage: 'Wrong credentials' } },
    })
    expect(text).toContain('500 | Request failed with status code 500 | {"errorCode":"500.001.1001"')
  })
})
