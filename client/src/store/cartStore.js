import { create } from 'zustand';
export const useCart = create((set, get) => ({
    items: (() => {
        const saved = localStorage.getItem('cart');
        return saved ? JSON.parse(saved) : [];
    })(),
    addItem: (product, quantity) => {
        set((state) => {
            const existing = state.items.find((item) => item.product.id === product.id);
            const newItems = existing
                ? state.items.map((item) => item.product.id === product.id
                    ? { ...item, quantity: item.quantity + quantity }
                    : item)
                : [...state.items, { product, quantity }];
            localStorage.setItem('cart', JSON.stringify(newItems));
            return { items: newItems };
        });
    },
    removeItem: (productId) => {
        set((state) => {
            const newItems = state.items.filter((item) => item.product.id !== productId);
            localStorage.setItem('cart', JSON.stringify(newItems));
            return { items: newItems };
        });
    },
    updateQuantity: (productId, quantity) => {
        set((state) => {
            const newItems = state.items.map((item) => item.product.id === productId ? { ...item, quantity } : item);
            localStorage.setItem('cart', JSON.stringify(newItems));
            return { items: newItems };
        });
    },
    clearCart: () => {
        set({ items: [] });
        localStorage.removeItem('cart');
    },
    getTotal: () => {
        return get().items.reduce((total, item) => total + item.product.price * item.quantity, 0);
    },
}));
//# sourceMappingURL=cartStore.js.map