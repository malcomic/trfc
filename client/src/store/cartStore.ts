import { create } from 'zustand'
import { CartItem, FlashSaleOffer, Product, ProductSelection } from '../types'
import { trackAddToCart } from '../utils/tiktokPixel'

interface CartStore {
  items: CartItem[]
  addItem: (product: Product, quantity: number, selection?: ProductSelection) => void
  addFlashItem: (offer: FlashSaleOffer, quantity: number, selection?: ProductSelection) => void
  /** A single flash item checked out on its own, outside the cart. */
  buyNowItem: CartItem | null
  setBuyNow: (line: CartItem) => void
  clearBuyNow: () => void
  removeItem: (lineKey: string) => void
  updateQuantity: (lineKey: string, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
}

export const cartLineKey = (item: Pick<CartItem, 'product' | 'flashSaleId' | 'variantId' | 'distance'>) =>
  `${item.product.id}:${item.variantId ?? '-'}:${item.distance ?? '-'}:${item.flashSaleId ?? 'regular'}`

export const cartLinePrice = (item: CartItem) => Number(item.unitPrice ?? item.product.price)

/** Most units of this line the customer can buy: the chosen size's stock when sized. */
export function cartLineMaxQuantity(item: CartItem): number | null {
  if (item.variantId) {
    const variant = item.product.variants?.find((v) => v.id === item.variantId)
    return variant ? Number(variant.stock) : null
  }
  return item.product.stock != null ? Number(item.product.stock) : null
}

export function loadSavedCart(): CartItem[] {
  try {
    const saved = localStorage.getItem('cart')
    if (!saved) return []
    const parsed = JSON.parse(saved) as CartItem[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => item?.product?.id)
      .map((item) => ({
        ...item,
        unitPrice: item.unitPrice ?? Number(item.product.price),
        flashSaleId: item.flashSaleId ?? null,
        variantId: item.variantId ?? null,
        size: item.size ?? null,
        distance: item.distance ?? null,
      }))
  } catch {
    return []
  }
}

function persist(items: CartItem[]) {
  localStorage.setItem('cart', JSON.stringify(items))
}

function minCap(...caps: (number | null | undefined)[]): number | null {
  const defined = caps.filter((c): c is number => c != null)
  return defined.length ? Math.min(...defined) : null
}

function upsertLine(items: CartItem[], line: CartItem, maxQuantity?: number | null): CartItem[] {
  const key = cartLineKey(line)
  const existing = items.find((item) => cartLineKey(item) === key)
  const cap = (qty: number) => (maxQuantity != null ? Math.min(qty, maxQuantity) : qty)
  if (existing) {
    return items.map((item) =>
      cartLineKey(item) === key ? { ...item, quantity: cap(item.quantity + line.quantity) } : item
    )
  }
  return [...items, { ...line, quantity: cap(line.quantity) }]
}

function selectionFields(selection?: ProductSelection) {
  return {
    variantId: selection?.variantId ?? null,
    size: selection?.size ?? null,
    distance: selection?.distance ?? null,
  }
}

function flashLineCap(offer: FlashSaleOffer, line: CartItem): number | null {
  return minCap(offer.remaining, line.variantId ? cartLineMaxQuantity(line) : null)
}

/** Builds a cart line at the flash price, capped by units left at that price and the chosen size's stock. */
export function buildFlashLine(offer: FlashSaleOffer, quantity: number, selection?: ProductSelection): CartItem {
  const product: Product = {
    id: offer.product_id,
    name: offer.product_name,
    description: offer.product_description ?? undefined,
    price: Number(offer.regular_price),
    stock: offer.product_stock ?? 0,
    category: offer.product_category ?? '',
    category_name: offer.category_name ?? null,
    category_slug: offer.category_slug ?? null,
    image_url: offer.product_image_url ?? undefined,
    variants: offer.product_variants ?? [],
    distance_options: offer.distance_options ?? [],
  }
  const line: CartItem = {
    product,
    quantity,
    unitPrice: Number(offer.sale_price),
    flashSaleId: offer.id,
    ...selectionFields(selection),
  }
  const cap = flashLineCap(offer, line)
  return cap != null ? { ...line, quantity: Math.max(1, Math.min(quantity, cap)) } : line
}

function trackFlashLine(line: CartItem) {
  trackAddToCart(
    {
      content_id: String(line.product.id),
      content_type: 'product',
      content_name: line.product.name,
      quantity: line.quantity,
    },
    cartLinePrice(line) * line.quantity
  )
}

const BUY_NOW_KEY = 'buyNow'

export function loadBuyNow(): CartItem | null {
  try {
    const saved = sessionStorage.getItem(BUY_NOW_KEY)
    if (!saved) return null
    const parsed = JSON.parse(saved) as CartItem
    return parsed?.product?.id ? parsed : null
  } catch {
    return null
  }
}

function persistBuyNow(line: CartItem | null) {
  try {
    if (line) sessionStorage.setItem(BUY_NOW_KEY, JSON.stringify(line))
    else sessionStorage.removeItem(BUY_NOW_KEY)
  } catch {
    // sessionStorage can be unavailable (private mode); the in-memory item still works
  }
}

export const useCart = create<CartStore>((set, get) => ({
  items: loadSavedCart(),
  buyNowItem: loadBuyNow(),

  addItem: (product, quantity, selection) => {
    if ((product as { category?: string }).category === 'event') {
      return
    }
    set((state): Partial<CartStore> => {
      const line: CartItem = {
        product,
        quantity,
        unitPrice: Number(product.price),
        flashSaleId: null,
        ...selectionFields(selection),
      }
      const newItems = upsertLine(state.items, line, selection?.variantId ? cartLineMaxQuantity(line) : null)
      persist(newItems)
      return { items: newItems }
    })
    trackAddToCart(
      {
        content_id: String(product.id),
        content_type: 'product',
        content_name: product.name,
        quantity,
      },
      Number(product.price) * quantity
    )
  },

  addFlashItem: (offer, quantity, selection) => {
    if (offer.sold_out) return
    const line = buildFlashLine(offer, quantity, selection)
    set((state): Partial<CartStore> => {
      const newItems = upsertLine(state.items, line, flashLineCap(offer, line))
      persist(newItems)
      return { items: newItems }
    })
    trackFlashLine(line)
  },

  setBuyNow: (line) => {
    persistBuyNow(line)
    set({ buyNowItem: line })
    trackFlashLine(line)
  },

  clearBuyNow: () => {
    persistBuyNow(null)
    set({ buyNowItem: null })
  },

  removeItem: (lineKey) => {
    set((state) => {
      const newItems = state.items.filter((item) => cartLineKey(item) !== lineKey)
      persist(newItems)
      return { items: newItems }
    })
  },

  updateQuantity: (lineKey, quantity) => {
    set((state) => {
      const newItems = state.items.map((item) =>
        cartLineKey(item) === lineKey ? { ...item, quantity } : item
      )
      persist(newItems)
      return { items: newItems }
    })
  },

  clearCart: () => {
    set({ items: [] })
    localStorage.removeItem('cart')
  },

  getTotal: () => {
    return get().items.reduce((total, item) => total + cartLinePrice(item) * item.quantity, 0)
  },
}))
