import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildPurchaseParams, metaPurchaseEventId, trackMetaPurchase } from '../../utils/metaPixel'

describe('buildPurchaseParams', () => {
  it('always sends KES and a numeric value', () => {
    expect(buildPurchaseParams(1499.999, [{ id: 'event_1', quantity: 2 }])).toEqual({
      value: 1500,
      currency: 'KES',
      content_type: 'product',
      content_ids: ['event_1'],
      contents: [{ id: 'event_1', quantity: 2 }],
      num_items: 2,
    })
  })
})

describe('trackMetaPurchase', () => {
  beforeEach(() => {
    sessionStorage.clear()
    window.fbq = vi.fn()
  })

  it('fires once per reference with the shared event id', () => {
    trackMetaPurchase('ws_CO_1', 3000, [{ id: 'event_1', quantity: 2 }])
    trackMetaPurchase('ws_CO_1', 3000, [{ id: 'event_1', quantity: 2 }])
    expect(window.fbq).toHaveBeenCalledTimes(1)
    expect(window.fbq).toHaveBeenCalledWith(
      'track',
      'Purchase',
      expect.objectContaining({ currency: 'KES', value: 3000 }),
      { eventID: metaPurchaseEventId('ws_CO_1') }
    )
  })

  it('skips free or unknown totals', () => {
    trackMetaPurchase('ref-a', 0, [])
    trackMetaPurchase('ref-b', undefined, [])
    trackMetaPurchase('ref-c', Number.NaN, [])
    expect(window.fbq).not.toHaveBeenCalled()
  })
})
