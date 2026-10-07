import { describe, it, expect, vi } from 'vitest'
import { buildFlashLine, cartLineKey, loadSavedCart, useCart } from '../../store/cartStore'
import { cartItemNeedsOptions, formatSelectedOptions } from '../../utils/productOptions'
import type { CartItem, FlashSaleOffer, Product } from '../../types'

const tee: Product = {
  id: 'tee',
  name: 'Tee',
  price: 1000,
  stock: 5,
  category: 'Apparel',
  variants: [
    { id: 'v-m', size: 'M', stock: 3, sort_order: 0, is_active: true },
    { id: 'v-l', size: 'L', stock: 2, sort_order: 1, is_active: true },
  ],
  distance_options: ['5K', '10K'],
}

describe('cartLineKey', () => {
  it('keeps different sizes and distances on separate lines', () => {
    const m5 = cartLineKey({ product: tee, variantId: 'v-m', distance: '5K', flashSaleId: null })
    const l5 = cartLineKey({ product: tee, variantId: 'v-l', distance: '5K', flashSaleId: null })
    const m10 = cartLineKey({ product: tee, variantId: 'v-m', distance: '10K', flashSaleId: null })
    const m5Flash = cartLineKey({ product: tee, variantId: 'v-m', distance: '5K', flashSaleId: 'fs-1' })
    expect(new Set([m5, l5, m10, m5Flash]).size).toBe(4)
  })
})

describe('loadSavedCart', () => {
  it('loads carts saved before sizes existed', () => {
    vi.mocked(localStorage.getItem).mockReturnValueOnce(
      JSON.stringify([{ product: { id: 'bottle', name: 'Bottle', price: 500, stock: 4, category: 'Gear' }, quantity: 2 }])
    )
    const [item] = loadSavedCart()
    expect(item).toMatchObject({ quantity: 2, unitPrice: 500, flashSaleId: null, variantId: null, size: null, distance: null })
    expect(cartLineKey(item)).toBe('bottle:-:-:regular')
  })
})

const offer: FlashSaleOffer = {
  id: 'fs-1',
  product_id: 'tee',
  sale_price: '700',
  quantity_limit: 10,
  starts_at: '2026-01-01T00:00:00Z',
  ends_at: null,
  sold_units: 6,
  remaining: 4,
  sold_out: false,
  product_name: 'Tee',
  regular_price: '1000',
  product_stock: 5,
  product_variants: tee.variants,
  distance_options: ['5K', '10K'],
}

describe('buildFlashLine', () => {
  it('uses the sale price and keeps the selected size and distance', () => {
    const line = buildFlashLine(offer, 1, { variantId: 'v-m', size: 'M', distance: '10K' })
    expect(line).toMatchObject({ quantity: 1, unitPrice: 700, flashSaleId: 'fs-1', variantId: 'v-m', size: 'M', distance: '10K' })
    expect(line.product.price).toBe(1000)
  })

  it('caps quantity at the size stock and at units left at the flash price', () => {
    expect(buildFlashLine(offer, 9, { variantId: 'v-l', size: 'L', distance: '5K' }).quantity).toBe(2)
    expect(buildFlashLine(offer, 9, { variantId: 'v-m', size: 'M', distance: '5K' }).quantity).toBe(3)
    expect(buildFlashLine({ ...offer, remaining: 1 }, 9, { variantId: 'v-m', size: 'M', distance: '5K' }).quantity).toBe(1)
  })
})

describe('buy-now item', () => {
  it('is stored separately from the cart', () => {
    const before = useCart.getState().items
    const line = buildFlashLine(offer, 1, { variantId: 'v-m', size: 'M', distance: '5K' })

    useCart.getState().setBuyNow(line)
    expect(useCart.getState().buyNowItem).toEqual(line)
    expect(JSON.parse(sessionStorage.getItem('buyNow') ?? 'null')).toEqual(line)
    expect(useCart.getState().items).toBe(before)

    useCart.getState().clearBuyNow()
    expect(useCart.getState().buyNowItem).toBeNull()
    expect(sessionStorage.getItem('buyNow')).toBeNull()
    expect(useCart.getState().items).toBe(before)
  })
})

describe('option helpers', () => {
  it('formats selected options', () => {
    expect(formatSelectedOptions({ size: 'M', distance: '10K' })).toBe('Size: M · Distance: 10K')
    expect(formatSelectedOptions({ size: null, distance: null })).toBe('')
  })

  it('flags lines missing a required option', () => {
    const line: CartItem = { product: tee, quantity: 1, variantId: null, distance: '5K' }
    expect(cartItemNeedsOptions(line)).toBe(true)
    expect(cartItemNeedsOptions({ ...line, variantId: 'v-m' })).toBe(false)
  })
})
