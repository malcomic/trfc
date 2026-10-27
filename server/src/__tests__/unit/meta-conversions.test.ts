import { createHash } from 'crypto'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({ query: vi.fn(), getClient: vi.fn() }))
vi.mock('axios', () => ({ default: { post: vi.fn() } }))
vi.mock('../../config/env.js', () => ({
  config: { meta: { pixelId: 'PIXEL', capiAccessToken: 'TOKEN', testEventCode: '', apiVersion: 'v20.0' } },
}))

import axios from 'axios'
import { query } from '../../config/db.js'
import {
  buildPurchaseEvent,
  buildUserData,
  captureMetaContext,
  metaPurchaseEventId,
  sendMetaPurchase,
  summarisePurchase,
  type MetaBrowserContext,
} from '../../utils/metaConversions.js'

const sha = (value: string) => createHash('sha256').update(value).digest('hex')

const BROWSER: MetaBrowserContext = {
  clientIp: '41.90.1.2',
  userAgent: 'Mozilla/5.0',
  fbp: 'fb.1.1700000000.123',
  fbc: null,
  sourceUrl: 'https://trfc.example/events/run/checkout',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('summarisePurchase', () => {
  it('merges lines with the same id and totals the value', () => {
    const summary = summarisePurchase(
      [
        { id: 'event_1', quantity: 1, value: 1500 },
        { id: 'event_1', quantity: 1, value: 1500 },
        { id: 'medal_gold_21', quantity: 1, value: 2000 },
      ],
      {}
    )
    expect(summary?.value).toBe(5000)
    expect(summary?.contents).toEqual([
      { id: 'event_1', quantity: 2, item_price: 1500 },
      { id: 'medal_gold_21', quantity: 1, item_price: 2000 },
    ])
  })

  it('returns nothing for free or empty purchases', () => {
    expect(summarisePurchase([], {})).toBeNull()
    expect(summarisePurchase([{ id: 'event_1', quantity: 1, value: 0 }], {})).toBeNull()
  })
})

describe('buildUserData', () => {
  it('normalises and hashes customer details and passes browser ids through', () => {
    const data = buildUserData(
      { email: '  Jane@Example.com ', phone: '0712 345 678', name: 'Jane Wanjiru Doe', userId: 'u-1' },
      BROWSER
    )
    expect(data.em).toEqual([sha('jane@example.com')])
    expect(data.ph).toEqual([sha('254712345678')])
    expect(data.fn).toEqual([sha('jane')])
    expect(data.ln).toEqual([sha('doe')])
    expect(data.external_id).toEqual([sha('u-1')])
    expect(data.client_user_agent).toBe('Mozilla/5.0')
    expect(data.fbp).toBe('fb.1.1700000000.123')
    expect(data.fbc).toBeUndefined()
  })
})

describe('buildPurchaseEvent', () => {
  const purchase = summarisePurchase([{ id: 'event_1', quantity: 2, value: 3000 }], { email: 'a@b.co' })!

  it('sends KES currency, the value and the shared event id', () => {
    const event = buildPurchaseEvent('ws_CO_1', purchase, BROWSER)
    expect(event.event_id).toBe(metaPurchaseEventId('ws_CO_1'))
    expect(event.event_id).toBe('purchase_ws_CO_1')
    expect(event.action_source).toBe('website')
    expect(event.event_source_url).toBe(BROWSER.sourceUrl)
    expect(event.custom_data).toMatchObject({ currency: 'KES', value: 3000, num_items: 2, content_ids: ['event_1'] })
  })

  it('falls back to a system-generated event without browser details', () => {
    const event = buildPurchaseEvent('ws_CO_1', purchase, null)
    expect(event.action_source).toBe('system_generated')
    expect(event).not.toHaveProperty('event_source_url')
  })
})

describe('captureMetaContext', () => {
  it('prefers explicit headers, then cookies, and takes the first forwarded IP', () => {
    const context = captureMetaContext({
      headers: {
        'x-forwarded-for': '41.90.1.2, 10.0.0.1',
        'user-agent': 'Mozilla/5.0',
        'x-meta-fbp': 'fb.1.header',
        cookie: '_fbp=fb.1.cookie; _fbc=fb.1.click',
        'x-meta-source-url': 'https://trfc.example/checkout',
      },
      socket: { remoteAddress: '127.0.0.1' },
    } as any)
    expect(context).toEqual({
      clientIp: '41.90.1.2',
      userAgent: 'Mozilla/5.0',
      fbp: 'fb.1.header',
      fbc: 'fb.1.click',
      sourceUrl: 'https://trfc.example/checkout',
    })
  })
})

describe('sendMetaPurchase', () => {
  function mockDb({ claimed }: { claimed: boolean }) {
    vi.mocked(query).mockImplementation((async (sql: string) => {
      if (sql.includes('FROM tickets')) return { rows: [{ event_id: 'e1', price: 1500, email: 'a@b.co', phone: null, user_id: null }] }
      if (sql.includes('INSERT INTO meta_events')) return { rows: claimed ? [{ event_id: 'purchase_ref' }] : [] }
      if (sql.includes('FROM meta_checkout_context')) return { rows: [] }
      return { rows: [] }
    }) as any)
  }

  it('posts one Purchase to the Conversions API', async () => {
    mockDb({ claimed: true })
    vi.mocked(axios.post).mockResolvedValue({ data: { events_received: 1 } })
    expect(await sendMetaPurchase('ref', BROWSER)).toBe(true)
    expect(axios.post).toHaveBeenCalledTimes(1)
    const [url, body] = vi.mocked(axios.post).mock.calls[0] as [string, any]
    expect(url).toBe('https://graph.facebook.com/v20.0/PIXEL/events')
    expect(body.data[0]).toMatchObject({ event_name: 'Purchase', custom_data: { currency: 'KES', value: 1500 } })
  })

  it('does not send again once the event was already claimed', async () => {
    mockDb({ claimed: false })
    expect(await sendMetaPurchase('ref', BROWSER)).toBe(false)
    expect(axios.post).not.toHaveBeenCalled()
  })

  it('never throws when Meta rejects the event', async () => {
    mockDb({ claimed: true })
    vi.mocked(axios.post).mockRejectedValue({ response: { data: { error: { message: 'Invalid token' } } } })
    await expect(sendMetaPurchase('ref', BROWSER)).resolves.toBe(false)
  })
})
