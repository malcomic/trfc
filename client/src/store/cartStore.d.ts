import { CartItem, Product } from '../types';
interface CartStore {
    items: CartItem[];
    addItem: (product: Product, quantity: number) => void;
    removeItem: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    getTotal: () => number;
}
export declare const useCart: import("zustand").UseBoundStore<import("zustand").StoreApi<CartStore>>;
export {};
//# sourceMappingURL=cartStore.d.ts.map