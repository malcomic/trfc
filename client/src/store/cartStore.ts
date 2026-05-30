import { create } from 'zustand'
import { CartItem, Product } from '../types'

interface CartStore {
  items: CartItem[]
  addItem: (product: Product, quantity: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
}

export const useCart = create<CartStore>((set, get) => ({
  items: (() => {
    const saved = localStorage.getItem('cart')
    return saved ? JSON.parse(saved) : []
  })(),

  addItem: (product, quantity) => {
    if ((product as { category?: string }).category === 'event') {
      return
    }
    set((state): Partial<CartStore> => {
      const existing = state.items.find((item) => item.product.id === product.id)
      const newItems = existing
        ? state.items.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          )
        : [...state.items, { product, quantity }]
      localStorage.setItem('cart', JSON.stringify(newItems))
      return { items: newItems }
    })
  },

  removeItem: (productId) => {
    set((state) => {
      const newItems = state.items.filter((item) => item.product.id !== productId)
      localStorage.setItem('cart', JSON.stringify(newItems))
      return { items: newItems }
    })
  },

  updateQuantity: (productId, quantity) => {
    set((state) => {
      const newItems = state.items.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
      localStorage.setItem('cart', JSON.stringify(newItems))
      return { items: newItems }
    })
  },

  clearCart: () => {
    set({ items: [] })
    localStorage.removeItem('cart')
  },

  getTotal: () => {
    return get().items.reduce((total, item) => total + item.product.price * item.quantity, 0)
  },
}))
