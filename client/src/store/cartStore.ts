import { create } from 'zustand'
import { CartItem, FlashSaleOffer, Product } from '../types'
import { trackAddToCart } from '../utils/tiktokPixel'

interface CartStore {
  items: CartItem[]
  addItem: (product: Product, quantity: number) => void
  addFlashItem: (offer: FlashSaleOffer, quantity: number) => void
  removeItem: (lineKey: string) => void
  updateQuantity: (lineKey: string, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
}

export const cartLineKey = (item: Pick<CartItem, 'product' | 'flashSaleId'>) =>
  `${item.product.id}:${item.flashSaleId ?? 'regular'}`

export const cartLinePrice = (item: CartItem) => Number(item.unitPrice ?? item.product.price)

function loadSavedCart(): CartItem[] {
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
      }))
  } catch {
    return []
  }
}

function persist(items: CartItem[]) {
  localStorage.setItem('cart', JSON.stringify(items))
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

export const useCart = create<CartStore>((set, get) => ({
  items: loadSavedCart(),

  addItem: (product, quantity) => {
    if ((product as { category?: string }).category === 'event') {
      return
    }
    set((state): Partial<CartStore> => {
      const newItems = upsertLine(state.items, {
        product,
        quantity,
        unitPrice: Number(product.price),
        flashSaleId: null,
      })
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

  addFlashItem: (offer, quantity) => {
    if (offer.sold_out) return
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
    }
    const salePrice = Number(offer.sale_price)
    set((state): Partial<CartStore> => {
      const newItems = upsertLine(
        state.items,
        { product, quantity, unitPrice: salePrice, flashSaleId: offer.id },
        offer.remaining
      )
      persist(newItems)
      return { items: newItems }
    })
    trackAddToCart(
      {
        content_id: String(offer.product_id),
        content_type: 'product',
        content_name: offer.product_name,
        quantity,
      },
      salePrice * quantity
    )
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
